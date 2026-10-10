// 食事内容の自由記述テキストから、おおよそのカロリー・PFC(タンパク質・脂質・炭水化物)を
// Google Gemini APIで推定するEdge Function。
//
// `/meal`の保存時にクライアントから直接呼ばれるため、ログイン不要の匿名呼び出しを許可する
// (post-to-xとは異なり、Authorizationヘッダーによる認証チェックは行わない)。
// あくまで目安の推定値であり、精度を保証するものではない(表示側で注記する)。
//
// 事前準備(このリポジトリの外で行う):
//   1. https://aistudio.google.com/ にログインし、「Get API key」からAPIキーを無料で発行する
//      (クレジットカード登録は不要)
//   2. Supabaseの Edge Function シークレットとして設定する
//        supabase secrets set GEMINI_API_KEY=xxxx
//   3. `supabase functions deploy estimate-meal-nutrition --no-verify-jwt` でデプロイする
//      (匿名呼び出しを許可するため --no-verify-jwt が必須)

// 無料枠で使える軽量モデル。Googleのモデル一覧が更新された場合はここだけ変更すればよい。
const GEMINI_MODEL = 'gemini-2.5-flash'
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

interface NutritionEstimate {
  calories: number
  protein: number
  fat: number
  carbs: number
}

function isNutritionEstimate(value: unknown): value is NutritionEstimate {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return (
    typeof v.calories === 'number' &&
    typeof v.protein === 'number' &&
    typeof v.fat === 'number' &&
    typeof v.carbs === 'number'
  )
}

async function estimateNutrition(apiKey: string, mealText: string): Promise<NutritionEstimate> {
  const systemInstruction =
    'あなたは栄養士です。ユーザーから1日分の食事内容(自由記述の日本語テキスト)が渡されます。' +
    'その内容からおおよその合計カロリー(kcal)・タンパク質(g)・脂質(g)・炭水化物(g)を推定してください。' +
    '記述が曖昧な場合は一般的な標準量を仮定して構いません。' +
    '回答は次のJSON形式のみを出力してください。説明文やマークダウンの装飾は一切含めないこと: ' +
    '{"calories": 数値, "protein": 数値, "fat": 数値, "carbs": 数値}'

  const res = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemInstruction }] },
      contents: [{ role: 'user', parts: [{ text: mealText }] }],
      generationConfig: {
        maxOutputTokens: 256,
        responseMimeType: 'application/json',
      },
    }),
  })

  const data = await res.json()
  if (!res.ok) {
    const message = data?.error?.message ?? `Gemini APIの呼び出しに失敗しました(${res.status})`
    throw new Error(message)
  }

  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) {
    throw new Error('推定結果の形式が不正です')
  }

  const parsed = JSON.parse(match[0])
  if (!isNutritionEstimate(parsed)) {
    throw new Error('推定結果の形式が不正です')
  }
  return parsed
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return json({ error: 'POSTメソッドのみ対応しています' }, 405)
  }

  try {
    const apiKey = Deno.env.get('GEMINI_API_KEY')
    if (!apiKey) {
      return json({ error: 'GEMINI_API_KEY が未設定です' }, 500)
    }

    const body = await req.json().catch(() => null)
    const breakfast = typeof body?.breakfast === 'string' ? body.breakfast.trim() : ''
    const lunch = typeof body?.lunch === 'string' ? body.lunch.trim() : ''
    const dinner = typeof body?.dinner === 'string' ? body.dinner.trim() : ''
    const snack = typeof body?.snack === 'string' ? body.snack.trim() : ''

    const sections = [
      breakfast && `朝食: ${breakfast}`,
      lunch && `昼食: ${lunch}`,
      dinner && `夕食: ${dinner}`,
      snack && `間食: ${snack}`,
    ].filter(Boolean)

    if (sections.length === 0) {
      return json({ error: '食事内容が入力されていません' }, 400)
    }

    const estimate = await estimateNutrition(apiKey, sections.join('\n'))
    return json({ ok: true, ...estimate })
  } catch (error) {
    console.error(error)
    return json({ error: error instanceof Error ? error.message : '推定処理に失敗しました' }, 500)
  }
})
