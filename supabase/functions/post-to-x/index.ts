// x_postsテーブルの予約投稿をX API v2で実際に投稿するEdge Function。
//
// 呼び出し方は2通り:
//   1. 管理画面から { postId } 付きで呼ぶ → その投稿を即時投稿(「今すぐ投稿」ボタン)
//   2. cronからbodyなしで呼ぶ → scheduled_atが現在時刻以前の予約投稿をまとめて投稿
//
// 事前準備(このリポジトリの外で行う):
//   1. https://developer.x.com でアプリを作成し、User authentication settingsで
//      App permissions を「Read and write」に設定する
//   2. API Key / API Key Secret / Access Token / Access Token Secret を発行する
//      (Access TokenはRead and write設定後に再生成しないと書き込み権限が付かない点に注意)
//   3. Supabaseの Edge Function シークレットとして以下を設定する
//        supabase secrets set X_API_KEY=xxxx X_API_SECRET=xxxx X_ACCESS_TOKEN=xxxx X_ACCESS_TOKEN_SECRET=xxxx
//   4. `supabase functions deploy post-to-x` でデプロイする
//   5. 自動投稿はSupabaseのcron(pg_cron + pg_net)から5分おきに呼び出す(README参照)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

const TWEET_ENDPOINT = 'https://api.x.com/2/tweets'

interface XCredentials {
  apiKey: string
  apiSecret: string
  accessToken: string
  accessTokenSecret: string
}

interface XPostRow {
  id: string
  body: string
  status: string
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

// OAuth 1.0a仕様(RFC 5849)のパーセントエンコード
function percentEncode(value: string): string {
  return encodeURIComponent(value).replace(
    /[!'()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
  )
}

async function hmacSha1(key: string, message: string): Promise<string> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(key),
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(message))
  return btoa(String.fromCharCode(...new Uint8Array(signature)))
}

// X API v2はJSONボディを署名に含めないOAuth 1.0aで認証する
async function buildOAuthHeader(creds: XCredentials, method: string, url: string): Promise<string> {
  const params: Record<string, string> = {
    oauth_consumer_key: creds.apiKey,
    oauth_nonce: crypto.randomUUID().replaceAll('-', ''),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: String(Math.floor(Date.now() / 1000)),
    oauth_token: creds.accessToken,
    oauth_version: '1.0',
  }

  const paramString = Object.keys(params)
    .sort()
    .map((key) => `${percentEncode(key)}=${percentEncode(params[key])}`)
    .join('&')
  const baseString = [method, percentEncode(url), percentEncode(paramString)].join('&')
  const signingKey = `${percentEncode(creds.apiSecret)}&${percentEncode(creds.accessTokenSecret)}`
  params.oauth_signature = await hmacSha1(signingKey, baseString)

  const header = Object.keys(params)
    .sort()
    .map((key) => `${percentEncode(key)}="${percentEncode(params[key])}"`)
    .join(', ')
  return `OAuth ${header}`
}

async function postTweet(creds: XCredentials, text: string): Promise<string> {
  const authHeader = await buildOAuthHeader(creds, 'POST', TWEET_ENDPOINT)
  const res = await fetch(TWEET_ENDPOINT, {
    method: 'POST',
    headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  })
  const data = await res.json()
  if (!res.ok) {
    const message = data?.detail ?? data?.title ?? `X APIの呼び出しに失敗しました(${res.status})`
    throw new Error(message)
  }
  return data.data.id as string
}

async function publishPosts(
  // deno-lint-ignore no-explicit-any
  db: any,
  creds: XCredentials,
  posts: XPostRow[],
): Promise<{ posted: number; failed: number }> {
  let posted = 0
  let failed = 0

  for (const post of posts) {
    try {
      const tweetId = await postTweet(creds, post.body)
      await db
        .from('x_posts')
        .update({
          status: 'posted',
          tweet_id: tweetId,
          posted_at: new Date().toISOString(),
          error_message: null,
        })
        .eq('id', post.id)
      posted += 1
    } catch (postError) {
      const message = postError instanceof Error ? postError.message : '投稿に失敗しました'
      console.error(`投稿 ${post.id} の送信に失敗:`, message)
      await db.from('x_posts').update({ status: 'failed', error_message: message }).eq('id', post.id)
      failed += 1
    }
  }

  return { posted, failed }
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
    const apiKey = Deno.env.get('X_API_KEY')
    const apiSecret = Deno.env.get('X_API_SECRET')
    const accessToken = Deno.env.get('X_ACCESS_TOKEN')
    const accessTokenSecret = Deno.env.get('X_ACCESS_TOKEN_SECRET')

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return json({ error: 'Supabaseの環境変数が不足しています' }, 500)
    }
    if (!apiKey || !apiSecret || !accessToken || !accessTokenSecret) {
      return json(
        { error: 'X_API_KEY / X_API_SECRET / X_ACCESS_TOKEN / X_ACCESS_TOKEN_SECRET が未設定です' },
        500,
      )
    }

    // 呼び出し元の確認: cron(service roleキー)またはログイン済みの管理者のみ許可する
    const bearerToken = authHeader.replace(/^Bearer\s+/i, '')
    if (bearerToken !== serviceRoleKey) {
      const authClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      })
      const { data: userData, error: userError } = await authClient.auth.getUser()
      if (userError || !userData?.user) {
        return json({ error: '認証に失敗しました' }, 401)
      }
    }

    const db = createClient(supabaseUrl, serviceRoleKey)
    const creds: XCredentials = { apiKey, apiSecret, accessToken, accessTokenSecret }

    let postId: string | null = null
    if (req.method === 'POST') {
      const body = await req.json().catch(() => null)
      postId = body?.postId ?? null
    }

    let targets: XPostRow[]
    if (postId) {
      // 「今すぐ投稿」: 予約日時に関わらず対象の1件を投稿する(二重投稿はstatusで防ぐ)
      const { data, error } = await db
        .from('x_posts')
        .select('id, body, status')
        .eq('id', postId)
        .in('status', ['draft', 'scheduled', 'failed'])
      if (error) throw new Error(`投稿の取得に失敗しました: ${error.message}`)
      targets = (data ?? []) as XPostRow[]
      if (targets.length === 0) {
        return json({ error: '対象の投稿が見つからないか、すでに投稿済みです' }, 404)
      }
    } else {
      // cron: 予約日時を過ぎた予約投稿をまとめて投稿する
      const { data, error } = await db
        .from('x_posts')
        .select('id, body, status')
        .eq('status', 'scheduled')
        .lte('scheduled_at', new Date().toISOString())
        .order('scheduled_at', { ascending: true })
      if (error) throw new Error(`予約投稿の取得に失敗しました: ${error.message}`)
      targets = (data ?? []) as XPostRow[]
    }

    const result = await publishPosts(db, creds, targets)
    return json({ ok: true, ...result })
  } catch (error) {
    console.error(error)
    return json({ error: error instanceof Error ? error.message : '投稿処理に失敗しました' }, 500)
  }
})
