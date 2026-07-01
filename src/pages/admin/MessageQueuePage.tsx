import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { computeMessageQueue } from '../../lib/messageQueue'
import type { MessageQueueLead, QueueItem } from '../../lib/messageQueue'
import { MESSAGE_SITUATION_LABELS } from '../../data/messageTemplates'

function MessageQueuePage() {
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  useEffect(() => {
    async function fetchLeads() {
      if (!supabase) {
        setLoading(false)
        return
      }

      setLoading(true)
      const { data, error: fetchError } = await supabase
        .from('leads')
        .select('id, name, line_registered_at, status, challenge_progress')

      if (fetchError) {
        setError('見込み客一覧の取得に失敗しました')
      } else {
        setQueue(computeMessageQueue(data as MessageQueueLead[]))
      }
      setLoading(false)
    }

    void fetchLeads()
  }, [])

  async function handleCopy(item: QueueItem) {
    try {
      await navigator.clipboard.writeText(item.message)
      setCopiedId(item.leadId)
      setTimeout(() => setCopiedId(null), 2000)
    } catch {
      setError('コピーに失敗しました')
    }
  }

  return (
    <div>
      <h1 className="admin-title">今日のLINE配信リスト</h1>
      <p className="analytics-note">
        7日間チャレンジの進捗をもとに、今日送るべきメッセージの下書きを表示します。送信はLINEから手動で行ってください（自動配信は未実装です）。
      </p>

      {error && <p className="form-error">{error}</p>}

      {loading ? (
        <p>読み込み中...</p>
      ) : queue.length === 0 ? (
        <p>本日送るべきメッセージはありません。</p>
      ) : (
        <div className="message-queue">
          {queue.map((item) => (
            <div key={item.leadId} className="message-queue-item">
              <div className="message-queue-header">
                <span className="message-queue-name">{item.name}さん</span>
                <span className="message-queue-situation">
                  {MESSAGE_SITUATION_LABELS[item.situation]}
                </span>
              </div>
              <p className="message-queue-text">{item.message}</p>
              <button type="button" className="primary-button" onClick={() => void handleCopy(item)}>
                {copiedId === item.leadId ? 'コピーしました' : '文面をコピー'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default MessageQueuePage
