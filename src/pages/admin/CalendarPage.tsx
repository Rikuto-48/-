import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { CONTENT_STATUSES } from '../../data/contentStatuses'
import { CONTENT_PILLARS } from '../../data/contentPillars'

interface ContentItem {
  id: string
  reel_number: number | null
  title: string
  scheduled_date: string | null
  status: string
  content_pillar: string | null
  impressions: number | null
  saves: number | null
  profile_visits: number | null
  dm_count: number | null
  created_at: string
}

type MetricField = 'impressions' | 'saves' | 'profile_visits' | 'dm_count'

const METRIC_FIELDS: { key: MetricField; label: string }[] = [
  { key: 'impressions', label: 'リーチ' },
  { key: 'saves', label: '保存' },
  { key: 'profile_visits', label: 'PF訪問' },
  { key: 'dm_count', label: 'DM' },
]

function CalendarPage() {
  const [items, setItems] = useState<ContentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [reelNumber, setReelNumber] = useState('')
  const [title, setTitle] = useState('')
  const [scheduledDate, setScheduledDate] = useState('')
  const [contentPillar, setContentPillar] = useState('')

  async function fetchItems() {
    if (!supabase) {
      setLoading(false)
      return
    }

    setLoading(true)
    const { data, error: fetchError } = await supabase
      .from('content_calendar')
      .select('*')
      .order('reel_number', { ascending: true, nullsFirst: false })

    if (fetchError) {
      setError('コンテンツ一覧の取得に失敗しました')
    } else {
      setItems(data as ContentItem[])
    }
    setLoading(false)
  }

  useEffect(() => {
    void fetchItems()
  }, [])

  async function handleAdd(e: FormEvent) {
    e.preventDefault()
    if (!supabase || !title) return

    const { error: insertError } = await supabase.from('content_calendar').insert({
      reel_number: reelNumber ? Number(reelNumber) : null,
      title,
      scheduled_date: scheduledDate || null,
      content_pillar: contentPillar || null,
    })

    if (insertError) {
      setError('コンテンツの追加に失敗しました')
      return
    }

    setReelNumber('')
    setTitle('')
    setScheduledDate('')
    setContentPillar('')
    void fetchItems()
  }

  async function handleStatusChange(item: ContentItem, status: string) {
    if (!supabase) return
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, status } : i)))
    await supabase.from('content_calendar').update({ status }).eq('id', item.id)
  }

  async function handleDateChange(item: ContentItem, scheduledDate: string) {
    if (!supabase) return
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, scheduled_date: scheduledDate || null } : i)),
    )
    await supabase
      .from('content_calendar')
      .update({ scheduled_date: scheduledDate || null })
      .eq('id', item.id)
  }

  async function handlePillarChange(item: ContentItem, contentPillar: string) {
    if (!supabase) return
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, content_pillar: contentPillar || null } : i)),
    )
    await supabase
      .from('content_calendar')
      .update({ content_pillar: contentPillar || null })
      .eq('id', item.id)
  }

  async function handleMetricChange(item: ContentItem, field: MetricField, value: string) {
    if (!supabase) return
    const parsed = value === '' ? null : Number(value)
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, [field]: parsed } : i)))
    await supabase
      .from('content_calendar')
      .update({ [field]: parsed })
      .eq('id', item.id)
  }

  return (
    <div>
      <h1 className="admin-title">コンテンツカレンダー</h1>

      <form className="admin-form admin-form-inline" onSubmit={handleAdd}>
        <input
          className="reel-number-input"
          type="number"
          min={1}
          max={100}
          placeholder="No."
          value={reelNumber}
          onChange={(e) => setReelNumber(e.target.value)}
        />
        <input
          placeholder="リールタイトル / 企画内容"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <select value={contentPillar} onChange={(e) => setContentPillar(e.target.value)}>
          <option value="">ピラー未設定</option>
          {CONTENT_PILLARS.map((pillar) => (
            <option key={pillar} value={pillar}>
              {pillar}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={scheduledDate}
          onChange={(e) => setScheduledDate(e.target.value)}
        />
        <button type="submit" className="primary-button">
          追加
        </button>
      </form>

      {error && <p className="form-error">{error}</p>}

      {loading ? (
        <p>読み込み中...</p>
      ) : (
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>No.</th>
                <th>タイトル</th>
                <th>ピラー</th>
                <th>投稿予定日</th>
                <th>ステータス</th>
                <th>実績(投稿後に記録)</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>{item.reel_number ?? '-'}</td>
                  <td>{item.title}</td>
                  <td>
                    <select
                      value={item.content_pillar ?? ''}
                      onChange={(e) => handlePillarChange(item, e.target.value)}
                    >
                      <option value="">未設定</option>
                      {CONTENT_PILLARS.map((pillar) => (
                        <option key={pillar} value={pillar}>
                          {pillar}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      type="date"
                      value={item.scheduled_date ?? ''}
                      onChange={(e) => handleDateChange(item, e.target.value)}
                    />
                  </td>
                  <td>
                    <select
                      value={item.status}
                      onChange={(e) => handleStatusChange(item, e.target.value)}
                    >
                      {CONTENT_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <div className="metrics-inputs">
                      {METRIC_FIELDS.map(({ key, label }) => (
                        <label key={key} className="metric-input">
                          <span>{label}</span>
                          <input
                            type="number"
                            min={0}
                            value={item[key] ?? ''}
                            onChange={(e) => handleMetricChange(item, key, e.target.value)}
                          />
                        </label>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={6}>まだ登録がありません</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default CalendarPage
