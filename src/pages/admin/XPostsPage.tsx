import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { X_WEIGHT_LIMIT, xWeightedLength } from '../../lib/xTextLength'

interface XPost {
  id: string
  body: string
  scheduled_at: string | null
  status: string
  tweet_id: string | null
  error_message: string | null
  posted_at: string | null
  created_at: string
}

const STATUS_LABELS: Record<string, string> = {
  draft: '下書き',
  scheduled: '予約済み',
  posted: '投稿済み',
  failed: '失敗',
}

// timestamptz → datetime-local入力用のローカル時刻文字列
function toLocalInputValue(iso: string | null): string {
  if (!iso) return ''
  const date = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function XPostsPage() {
  const [posts, setPosts] = useState<XPost[]>([])
  const [loading, setLoading] = useState(true)
  const [posting, setPosting] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [body, setBody] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')

  const bodyLength = xWeightedLength(body)
  const overLimit = bodyLength > X_WEIGHT_LIMIT

  async function fetchPosts() {
    if (!supabase) {
      setLoading(false)
      return
    }

    setLoading(true)
    const { data, error: fetchError } = await supabase
      .from('x_posts')
      .select('*')
      .order('created_at', { ascending: false })

    if (fetchError) {
      setError('X投稿一覧の取得に失敗しました')
    } else {
      setPosts(data as XPost[])
    }
    setLoading(false)
  }

  useEffect(() => {
    void fetchPosts()
  }, [])

  async function handleAdd(e: FormEvent) {
    e.preventDefault()
    if (!supabase || !body.trim() || overLimit) return

    const { error: insertError } = await supabase.from('x_posts').insert({
      body: body.trim(),
      scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null,
      status: scheduledAt ? 'scheduled' : 'draft',
    })

    if (insertError) {
      setError('投稿の追加に失敗しました')
      return
    }

    setBody('')
    setScheduledAt('')
    setMessage(scheduledAt ? '予約しました' : '下書きを保存しました')
    setError(null)
    void fetchPosts()
  }

  async function handleScheduleChange(post: XPost, value: string) {
    if (!supabase) return
    const scheduledIso = value ? new Date(value).toISOString() : null
    const status = scheduledIso ? 'scheduled' : 'draft'
    setPosts((prev) =>
      prev.map((p) => (p.id === post.id ? { ...p, scheduled_at: scheduledIso, status } : p)),
    )
    await supabase.from('x_posts').update({ scheduled_at: scheduledIso, status }).eq('id', post.id)
  }

  async function handlePostNow(post: XPost) {
    if (!supabase) return
    if (!window.confirm('この内容でXに今すぐ投稿します。よろしいですか？')) return

    setPosting(post.id)
    setMessage(null)
    setError(null)

    const { data, error: invokeError } = await supabase.functions.invoke('post-to-x', {
      body: { postId: post.id },
    })

    if (invokeError) {
      setError(`投稿に失敗しました: ${invokeError.message}`)
    } else if (data?.error) {
      setError(`投稿に失敗しました: ${data.error}`)
    } else if (data?.failed) {
      setError('投稿に失敗しました。一覧のエラー内容を確認してください')
    } else {
      setMessage('Xに投稿しました')
    }
    setPosting(null)
    void fetchPosts()
  }

  async function handleDelete(post: XPost) {
    if (!supabase) return
    if (!window.confirm('この投稿を削除しますか？(X上の投稿は削除されません)')) return
    await supabase.from('x_posts').delete().eq('id', post.id)
    void fetchPosts()
  }

  return (
    <div>
      <h1 className="admin-title">X投稿予約</h1>
      <p className="analytics-note">
        投稿文と日時を登録すると、予約日時に自動でXへ投稿されます(5分間隔でチェック)。日時を空にすると下書きとして保存され、「今すぐ投稿」でその場で投稿できます。
      </p>

      <form className="admin-form" onSubmit={handleAdd}>
        <textarea
          rows={5}
          placeholder={'投稿文を入力\n改行もそのまま反映されます'}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          required
        />
        <p className={overLimit ? 'form-error' : 'analytics-note'}>
          文字数: {bodyLength} / {X_WEIGHT_LIMIT}(全角=2・半角=1・URL=23換算)
          {overLimit && ' — 上限を超えています'}
        </p>
        <div className="admin-form-inline">
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
          />
          <button type="submit" className="primary-button" disabled={!body.trim() || overLimit}>
            {scheduledAt ? '予約する' : '下書き保存'}
          </button>
        </div>
      </form>

      {message && <p className="share-message">{message}</p>}
      {error && <p className="form-error">{error}</p>}
      {!supabase && <p className="form-error">Supabaseが未設定のため利用できません</p>}

      {loading ? (
        <p>読み込み中...</p>
      ) : (
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>本文</th>
                <th>予約日時</th>
                <th>ステータス</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((post) => (
                <tr key={post.id}>
                  <td className="x-post-body">{post.body}</td>
                  <td>
                    {post.status === 'posted' ? (
                      (post.posted_at ?? post.scheduled_at)?.slice(0, 16).replace('T', ' ')
                    ) : (
                      <input
                        type="datetime-local"
                        value={toLocalInputValue(post.scheduled_at)}
                        onChange={(e) => handleScheduleChange(post, e.target.value)}
                      />
                    )}
                  </td>
                  <td>
                    {STATUS_LABELS[post.status] ?? post.status}
                    {post.status === 'failed' && post.error_message && (
                      <div className="form-error">{post.error_message}</div>
                    )}
                  </td>
                  <td>
                    {post.status !== 'posted' && (
                      <button
                        type="button"
                        className="primary-button"
                        onClick={() => void handlePostNow(post)}
                        disabled={posting !== null}
                      >
                        {posting === post.id ? '投稿中...' : '今すぐ投稿'}
                      </button>
                    )}{' '}
                    <button
                      type="button"
                      className="logout-button"
                      onClick={() => void handleDelete(post)}
                    >
                      削除
                    </button>
                  </td>
                </tr>
              ))}
              {posts.length === 0 && (
                <tr>
                  <td colSpan={4}>まだ投稿がありません</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default XPostsPage
