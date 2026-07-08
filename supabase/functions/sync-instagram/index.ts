// Instagram Graph API から日次のアカウント実績と投稿(メディア)ごとの実績を取得し、
// instagram_account_metrics / instagram_media_insights に保存するEdge Function。
//
// 事前準備(このリポジトリの外で行う):
//   1. Meta for Developers でアプリを作成し、Instagram Graph API を追加する
//   2. Instagramアカウントをビジネス/クリエイターアカウントに変換し、Facebookページと連携する
//   3. instagram_basic, instagram_manage_insights, pages_read_engagement 権限を持つ
//      長期アクセストークンを発行する
//   4. Supabaseの Edge Function シークレットとして以下を設定する
//        supabase secrets set INSTAGRAM_ACCESS_TOKEN=xxxx INSTAGRAM_BUSINESS_ACCOUNT_ID=xxxx
//   5. `supabase functions deploy sync-instagram` でデプロイする
//
// アクセストークンは60日程度で失効するため、定期的な再発行が必要(このFunctionでは自動更新しない)。

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

const GRAPH_API_VERSION = 'v21.0'

interface InsightMetric {
  name: string
  values: { value: number }[]
}

interface MediaItem {
  id: string
  caption?: string
  permalink?: string
  media_type?: string
  timestamp?: string
}

// 管理画面(ブラウザ)からの呼び出しを許可するCORSヘッダー
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

async function graphGet(path: string, accessToken: string, params: Record<string, string> = {}) {
  const url = new URL(`https://graph.facebook.com/${GRAPH_API_VERSION}/${path}`)
  url.searchParams.set('access_token', accessToken)
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value)
  }

  const res = await fetch(url.toString())
  const data = await res.json()
  if (!res.ok) {
    const message = data?.error?.message ?? `Instagram Graph APIの呼び出しに失敗しました(${path})`
    throw new Error(message)
  }
  return data
}

async function syncAccountMetrics(
  // deno-lint-ignore no-explicit-any
  db: any,
  igBusinessAccountId: string,
  accessToken: string,
) {
  const profile = await graphGet(igBusinessAccountId, accessToken, { fields: 'followers_count' })

  const insights = await graphGet(`${igBusinessAccountId}/insights`, accessToken, {
    metric: 'reach,profile_views,accounts_engaged',
    period: 'day',
  })

  const metricValue = (name: string) => {
    const entry = (insights.data as InsightMetric[] | undefined)?.find((m) => m.name === name)
    return entry?.values?.[0]?.value ?? null
  }

  const today = new Date().toISOString().slice(0, 10)

  const { error } = await db.from('instagram_account_metrics').upsert({
    date: today,
    followers_count: profile.followers_count ?? null,
    reach: metricValue('reach'),
    profile_views: metricValue('profile_views'),
    accounts_engaged: metricValue('accounts_engaged'),
    synced_at: new Date().toISOString(),
  })

  if (error) throw new Error(`instagram_account_metricsの保存に失敗しました: ${error.message}`)

  return { date: today }
}

async function syncMediaInsights(
  // deno-lint-ignore no-explicit-any
  db: any,
  igBusinessAccountId: string,
  accessToken: string,
) {
  const media = await graphGet(`${igBusinessAccountId}/media`, accessToken, {
    fields: 'id,caption,permalink,media_type,timestamp',
    limit: '25',
  })

  const items = (media.data ?? []) as MediaItem[]
  let syncedCount = 0

  for (const item of items) {
    // リール/動画は impressions が取得できず plays を使う(Graph APIの仕様)
    const metricNames =
      item.media_type === 'VIDEO'
        ? 'plays,reach,saved,likes,comments,shares'
        : 'impressions,reach,saved,likes,comments,shares'

    let insightValues: Record<string, number | null> = {}
    try {
      const insights = await graphGet(`${item.id}/insights`, accessToken, { metric: metricNames })
      insightValues = Object.fromEntries(
        (insights.data as InsightMetric[]).map((m) => [m.name, m.values?.[0]?.value ?? null]),
      )
    } catch (mediaError) {
      console.warn(`メディア ${item.id} のインサイト取得に失敗:`, mediaError)
    }

    // content_calendar_id は含めないことで、管理画面から手動で紐付けた内容を上書きしない
    const { error } = await db.from('instagram_media_insights').upsert(
      {
        ig_media_id: item.id,
        media_type: item.media_type ?? null,
        caption: item.caption ?? null,
        permalink: item.permalink ?? null,
        posted_at: item.timestamp ?? null,
        impressions: insightValues.impressions ?? insightValues.plays ?? null,
        reach: insightValues.reach ?? null,
        saved: insightValues.saved ?? null,
        likes: insightValues.likes ?? null,
        comments: insightValues.comments ?? null,
        shares: insightValues.shares ?? null,
        synced_at: new Date().toISOString(),
      },
      { onConflict: 'ig_media_id' },
    )

    if (error) {
      console.warn(`メディア ${item.id} の保存に失敗:`, error.message)
    } else {
      syncedCount += 1
    }
  }

  return { count: syncedCount }
}

Deno.serve(async (req) => {
  // ブラウザが本リクエストの前に送ってくる確認(preflight)への応答
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return json({ error: '認証が必要です' }, 401)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const igAccessToken = Deno.env.get('INSTAGRAM_ACCESS_TOKEN')
    const igBusinessAccountId = Deno.env.get('INSTAGRAM_BUSINESS_ACCOUNT_ID')

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return json({ error: 'Supabaseの環境変数が不足しています' }, 500)
    }
    if (!igAccessToken || !igBusinessAccountId) {
      return json(
        { error: 'INSTAGRAM_ACCESS_TOKEN / INSTAGRAM_BUSINESS_ACCOUNT_ID が未設定です' },
        500,
      )
    }

    // 呼び出し元がログイン済みの管理者であることを確認する
    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: userData, error: userError } = await authClient.auth.getUser()
    if (userError || !userData?.user) {
      return json({ error: '認証に失敗しました' }, 401)
    }

    const db = createClient(supabaseUrl, serviceRoleKey)

    const account = await syncAccountMetrics(db, igBusinessAccountId, igAccessToken)
    const mediaResult = await syncMediaInsights(db, igBusinessAccountId, igAccessToken)

    return json({ ok: true, account, media: mediaResult })
  } catch (error) {
    console.error(error)
    return json({ error: error instanceof Error ? error.message : '同期に失敗しました' }, 500)
  }
})
