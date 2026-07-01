import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

interface AccountMetric {
  date: string
  followers_count: number | null
  reach: number | null
  profile_views: number | null
  accounts_engaged: number | null
}

interface MediaInsight {
  ig_media_id: string
  media_type: string | null
  caption: string | null
  permalink: string | null
  posted_at: string | null
  impressions: number | null
  reach: number | null
  saved: number | null
  likes: number | null
  comments: number | null
  shares: number | null
  content_calendar_id: string | null
}

interface CalendarOption {
  id: string
  reel_number: number | null
  title: string
}

function InstagramSyncPage() {
  const [accountMetrics, setAccountMetrics] = useState<AccountMetric[]>([])
  const [mediaInsights, setMediaInsights] = useState<MediaInsight[]>([])
  const [calendarOptions, setCalendarOptions] = useState<CalendarOption[]>([])
  const [selections, setSelections] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function fetchData() {
    if (!supabase) {
      setLoading(false)
      return
    }

    setLoading(true)
    const [accountRes, mediaRes, calendarRes] = await Promise.all([
      supabase
        .from('instagram_account_metrics')
        .select('*')
        .order('date', { ascending: false })
        .limit(14),
      supabase
        .from('instagram_media_insights')
        .select('*')
        .order('posted_at', { ascending: false })
        .limit(25),
      supabase.from('content_calendar').select('id, reel_number, title'),
    ])

    if (accountRes.error || mediaRes.error || calendarRes.error) {
      setError('Instagramデータの取得に失敗しました')
    } else {
      setAccountMetrics(accountRes.data as AccountMetric[])
      setMediaInsights(mediaRes.data as MediaInsight[])
      setCalendarOptions(calendarRes.data as CalendarOption[])
    }
    setLoading(false)
  }

  useEffect(() => {
    void fetchData()
  }, [])

  async function handleSync() {
    if (!supabase) return
    setSyncing(true)
    setMessage(null)
    setError(null)

    const { data, error: invokeError } = await supabase.functions.invoke('sync-instagram')

    if (invokeError) {
      setError(`同期に失敗しました: ${invokeError.message}`)
    } else if (data?.error) {
      setError(`同期に失敗しました: ${data.error}`)
    } else {
      setMessage(`同期しました(投稿 ${data?.media?.count ?? 0}件)`)
      await fetchData()
    }
    setSyncing(false)
  }

  async function handleReflect(media: MediaInsight) {
    if (!supabase) return
    const targetId = selections[media.ig_media_id]
    if (!targetId) return

    const { error: updateError } = await supabase
      .from('content_calendar')
      .update({ impressions: media.impressions, saves: media.saved })
      .eq('id', targetId)

    if (updateError) {
      setError('コンテンツカレンダーへの反映に失敗しました')
      return
    }

    await supabase
      .from('instagram_media_insights')
      .update({ content_calendar_id: targetId })
      .eq('ig_media_id', media.ig_media_id)

    setMediaInsights((prev) =>
      prev.map((m) =>
        m.ig_media_id === media.ig_media_id ? { ...m, content_calendar_id: targetId } : m,
      ),
    )
    setMessage('コンテンツカレンダーに反映しました')
  }

  return (
    <div>
      <h1 className="admin-title">Instagramデータ管理</h1>
      <p className="analytics-note">
        Instagram Graph
        APIから取得したアカウント実績・投稿ごとの実績を表示します。「今すぐ同期」で最新データを取得し、投稿の実績はコンテンツカレンダーへ反映できます。
      </p>

      <button
        type="button"
        className="primary-button"
        onClick={() => void handleSync()}
        disabled={syncing || !supabase}
      >
        {syncing ? '同期中...' : '今すぐ同期'}
      </button>

      {message && <p className="share-message">{message}</p>}
      {error && <p className="form-error">{error}</p>}
      {!supabase && <p className="form-error">Supabaseが未設定のため利用できません</p>}

      {loading ? (
        <p>読み込み中...</p>
      ) : (
        <>
          <h2 className="admin-subtitle">アカウント実績(直近14日)</h2>
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>日付</th>
                  <th>フォロワー数</th>
                  <th>リーチ</th>
                  <th>プロフィール閲覧</th>
                  <th>エンゲージ数</th>
                </tr>
              </thead>
              <tbody>
                {accountMetrics.map((m) => (
                  <tr key={m.date}>
                    <td>{m.date}</td>
                    <td>{m.followers_count ?? '-'}</td>
                    <td>{m.reach ?? '-'}</td>
                    <td>{m.profile_views ?? '-'}</td>
                    <td>{m.accounts_engaged ?? '-'}</td>
                  </tr>
                ))}
                {accountMetrics.length === 0 && (
                  <tr>
                    <td colSpan={5}>まだ同期データがありません</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <h2 className="admin-subtitle">投稿ごとの実績(直近25件)</h2>
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>投稿日</th>
                  <th>キャプション</th>
                  <th>リーチ</th>
                  <th>保存</th>
                  <th>いいね</th>
                  <th>コンテンツカレンダーに反映</th>
                </tr>
              </thead>
              <tbody>
                {mediaInsights.map((media) => (
                  <tr key={media.ig_media_id}>
                    <td>{media.posted_at?.slice(0, 10) ?? '-'}</td>
                    <td>{media.caption ? `${media.caption.slice(0, 20)}...` : '-'}</td>
                    <td>{media.reach ?? '-'}</td>
                    <td>{media.saved ?? '-'}</td>
                    <td>{media.likes ?? '-'}</td>
                    <td>
                      <select
                        value={selections[media.ig_media_id] ?? media.content_calendar_id ?? ''}
                        onChange={(e) =>
                          setSelections((prev) => ({
                            ...prev,
                            [media.ig_media_id]: e.target.value,
                          }))
                        }
                      >
                        <option value="">紐付け先を選択</option>
                        {calendarOptions.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.reel_number ? `No.${option.reel_number} ` : ''}
                            {option.title}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="primary-button"
                        onClick={() => void handleReflect(media)}
                        disabled={!selections[media.ig_media_id]}
                      >
                        反映
                      </button>
                    </td>
                  </tr>
                ))}
                {mediaInsights.length === 0 && (
                  <tr>
                    <td colSpan={6}>まだ同期データがありません</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

export default InstagramSyncPage
