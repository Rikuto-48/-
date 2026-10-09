import { useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { supabase } from '../lib/supabaseClient'
import { getSavedMealLogName, saveMealLogName } from '../lib/mealLogStorage'
import { compressImage } from '../lib/compressImage'
import WeightTrendChart from '../components/WeightTrendChart'

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'

const MEAL_TYPES: { key: MealType; label: string }[] = [
  { key: 'breakfast', label: '朝食' },
  { key: 'lunch', label: '昼食' },
  { key: 'dinner', label: '夕食' },
  { key: 'snack', label: '間食' },
]

const EMPTY_MEAL_TEXTS: Record<MealType, string> = { breakfast: '', lunch: '', dinner: '', snack: '' }
const EMPTY_MEAL_FILES: Record<MealType, File | null> = {
  breakfast: null,
  lunch: null,
  dinner: null,
  snack: null,
}
const EMPTY_MEAL_PREVIEWS: Record<MealType, string | null> = {
  breakfast: null,
  lunch: null,
  dinner: null,
  snack: null,
}

interface MealHistoryLog {
  log_date: string
  breakfast: string | null
  lunch: string | null
  dinner: string | null
  snack: string | null
  weight: number | null
  memo: string | null
  breakfast_photo_url: string | null
  lunch_photo_url: string | null
  dinner_photo_url: string | null
  snack_photo_url: string | null
  coach_comment: string | null
  client_reply: string | null
}

function getMealField(log: MealHistoryLog, key: MealType): { text: string | null; photoUrl: string | null } {
  switch (key) {
    case 'breakfast':
      return { text: log.breakfast, photoUrl: log.breakfast_photo_url }
    case 'lunch':
      return { text: log.lunch, photoUrl: log.lunch_photo_url }
    case 'dinner':
      return { text: log.dinner, photoUrl: log.dinner_photo_url }
    case 'snack':
      return { text: log.snack, photoUrl: log.snack_photo_url }
  }
}

const WEEKDAY_LABELS = ['日', '月', '火', '水', '木', '金', '土']

function formatMonthLabel(date: Date) {
  return `${date.getFullYear()}年${date.getMonth() + 1}月`
}

function toDateKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function buildCalendarCells(monthDate: Date): (string | null)[] {
  const year = monthDate.getFullYear()
  const month = monthDate.getMonth()
  const firstWeekday = new Date(year, month, 1).getDay()
  const totalDays = new Date(year, month + 1, 0).getDate()

  const cells: (string | null)[] = []
  for (let i = 0; i < firstWeekday; i++) cells.push(null)
  for (let day = 1; day <= totalDays; day++) cells.push(toDateKey(year, month, day))
  return cells
}

function MealDayDetailCard({
  log,
  replyDraft,
  onReplyChange,
  onReplySave,
  saving,
}: {
  log: MealHistoryLog
  replyDraft: string
  onReplyChange: (value: string) => void
  onReplySave: () => void
  saving: boolean
}) {
  return (
    <div className="meal-history-card">
      <p className="meal-history-date">{log.log_date}</p>

      {MEAL_TYPES.map(({ key, label }) => {
        const { text, photoUrl } = getMealField(log, key)
        if (!text && !photoUrl) return null
        return (
          <div key={key} className="meal-history-meal">
            <p className="meal-history-meal-label">{label}</p>
            {text && <p className="meal-history-meal-text">{text}</p>}
            {photoUrl && (
              <img src={photoUrl} alt={`${log.log_date}の${label}の写真`} className="meal-history-photo" />
            )}
          </div>
        )
      })}

      {log.weight !== null && <p className="meal-history-weight">体重: {log.weight}kg</p>}
      {log.memo && <p className="meal-history-memo">メモ: {log.memo}</p>}

      {log.coach_comment && (
        <div className="meal-coach-comment">
          <p className="meal-coach-comment-label">イクマから</p>
          <p className="meal-coach-comment-text">{log.coach_comment}</p>
        </div>
      )}

      <label className="meal-field meal-reply-field">
        イクマへの一言・任意
        <textarea value={replyDraft} onChange={(e) => onReplyChange(e.target.value)} rows={2} />
      </label>
      <button type="button" className="meal-reply-save" onClick={onReplySave} disabled={saving}>
        {saving ? '送信中...' : '返信を送る'}
      </button>
    </div>
  )
}

function todayLocalDate(): string {
  const now = new Date()
  const offsetMs = now.getTimezoneOffset() * 60000
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 10)
}

function MealLogPage() {
  const [name, setName] = useState(getSavedMealLogName())
  const [logDate, setLogDate] = useState(todayLocalDate())
  const [mealTexts, setMealTexts] = useState(EMPTY_MEAL_TEXTS)
  const [mealPhotos, setMealPhotos] = useState(EMPTY_MEAL_FILES)
  const [mealPhotoPreviews, setMealPhotoPreviews] = useState(EMPTY_MEAL_PREVIEWS)
  const [weight, setWeight] = useState('')
  const [memo, setMemo] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [weightHistory, setWeightHistory] = useState<{ date: string; weight: number }[]>([])

  const [viewMode, setViewMode] = useState<'form' | 'history'>('form')
  const [historyLogs, setHistoryLogs] = useState<MealHistoryLog[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState<string | null>(null)
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({})
  const [replySaving, setReplySaving] = useState<Record<string, boolean>>({})
  const [calendarMonth, setCalendarMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  function updateMealText(type: MealType, value: string) {
    setMealTexts((prev) => ({ ...prev, [type]: value }))
  }

  function handleMealPhotoChange(type: MealType, e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    setMealPhotos((prev) => ({ ...prev, [type]: file }))
    setMealPhotoPreviews((prev) => ({ ...prev, [type]: file ? URL.createObjectURL(file) : null }))
  }

  async function uploadMealPhotos(): Promise<Partial<Record<MealType, string>>> {
    if (!supabase) return {}

    const entries = await Promise.all(
      MEAL_TYPES.map(async ({ key }) => {
        const file = mealPhotos[key]
        if (!file || !supabase) return [key, null] as const

        const compressed = await compressImage(file)
        const path = `${crypto.randomUUID()}.jpg`

        const { error: uploadError } = await supabase.storage
          .from('meal-photos')
          .upload(path, compressed, { contentType: 'image/jpeg' })

        if (uploadError) {
          throw uploadError
        }

        const { data } = supabase.storage.from('meal-photos').getPublicUrl(path)
        return [key, data.publicUrl] as const
      }),
    )

    return Object.fromEntries(entries.filter(([, url]) => url !== null)) as Partial<
      Record<MealType, string>
    >
  }

  async function fetchWeightHistory(forName: string) {
    if (!supabase) return
    const { data } = await supabase.rpc('get_weight_history', { p_name: forName })
    if (data) {
      setWeightHistory(data as { date: string; weight: number }[])
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()

    if (!supabase) {
      setError('現在、記録を保存できません。時間をおいて再度お試しください。')
      return
    }

    setSubmitting(true)
    setError(null)

    let photos: Partial<Record<MealType, string>> = {}
    try {
      photos = await uploadMealPhotos()
    } catch (photoError) {
      console.error('写真のアップロードに失敗しました', photoError)
      const message = photoError instanceof Error ? photoError.message : String(photoError)
      setSubmitting(false)
      setError(`写真のアップロードに失敗しました。もう一度お試しください。(詳細: ${message})`)
      return
    }

    const { error: upsertError } = await supabase.rpc('upsert_meal_log', {
      p_name: name,
      p_log_date: logDate,
      p_breakfast: mealTexts.breakfast || null,
      p_lunch: mealTexts.lunch || null,
      p_dinner: mealTexts.dinner || null,
      p_snack: mealTexts.snack || null,
      p_weight: weight ? Number(weight) : null,
      p_memo: memo || null,
      p_breakfast_photo_url: photos.breakfast ?? null,
      p_lunch_photo_url: photos.lunch ?? null,
      p_dinner_photo_url: photos.dinner ?? null,
      p_snack_photo_url: photos.snack ?? null,
    })

    setSubmitting(false)

    if (upsertError) {
      console.error('食事記録の保存に失敗しました', upsertError)
      setError(`保存に失敗しました。もう一度お試しください。(詳細: ${upsertError.message})`)
      return
    }

    saveMealLogName(name)
    await fetchWeightHistory(name)
    setDone(true)
  }

  function handleLogAnother() {
    setDone(false)
    setLogDate(todayLocalDate())
    setMealTexts(EMPTY_MEAL_TEXTS)
    setMealPhotos(EMPTY_MEAL_FILES)
    setMealPhotoPreviews(EMPTY_MEAL_PREVIEWS)
    setWeight('')
    setMemo('')
  }

  async function openHistory() {
    setViewMode('history')
    setDone(false)

    if (!name) {
      setHistoryError('お名前を入力してから見てください。')
      return
    }

    if (!supabase) {
      setHistoryError('現在、記録を確認できません。時間をおいて再度お試しください。')
      return
    }

    setHistoryLoading(true)
    setHistoryError(null)

    const { data, error: fetchError } = await supabase.rpc('get_my_meal_logs', { p_name: name })

    setHistoryLoading(false)

    if (fetchError) {
      console.error('記録の取得に失敗しました', fetchError)
      setHistoryError(`記録の取得に失敗しました。(詳細: ${fetchError.message})`)
      return
    }

    const logs = (data as MealHistoryLog[]) ?? []
    setHistoryLogs(logs)

    if (logs.length > 0) {
      const [year, month] = logs[0].log_date.split('-').map(Number)
      setCalendarMonth(new Date(year, month - 1, 1))
      setSelectedDate(logs[0].log_date)
    } else {
      setCalendarMonth(new Date())
      setSelectedDate(null)
    }
  }

  function goToPrevMonth() {
    setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
  }

  function goToNextMonth() {
    setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
  }

  async function handleReplySave(targetLogDate: string) {
    if (!supabase) return

    setReplySaving((prev) => ({ ...prev, [targetLogDate]: true }))
    const reply = replyDrafts[targetLogDate] ?? ''

    const { error: replyError } = await supabase.rpc('set_client_reply', {
      p_name: name,
      p_log_date: targetLogDate,
      p_reply: reply || null,
    })

    setReplySaving((prev) => ({ ...prev, [targetLogDate]: false }))

    if (replyError) {
      console.error('返信の送信に失敗しました', replyError)
      return
    }

    setHistoryLogs((prev) =>
      prev.map((l) => (l.log_date === targetLogDate ? { ...l, client_reply: reply || null } : l)),
    )
  }

  if (viewMode === 'history') {
    const logsByDate = new Map(historyLogs.map((log) => [log.log_date, log]))
    const selectedLog = selectedDate ? (logsByDate.get(selectedDate) ?? null) : null

    return (
      <main className="lp meal-page">
        <div className="meal-container">
          <button type="button" className="meal-back-link meal-history-back" onClick={() => setViewMode('form')}>
            ← 記録フォームに戻る
          </button>
          <h1 className="meal-title">{name ? `${name}さんの記録` : 'あなたの記録'}</h1>

          {historyLoading && <p className="meal-lead">読み込み中...</p>}
          {historyError && <p className="form-error meal-error">{historyError}</p>}

          {!historyLoading && !historyError && historyLogs.length === 0 && (
            <p className="meal-lead">まだ記録がありません。</p>
          )}

          {!historyLoading && !historyError && historyLogs.length > 0 && (
            <>
              <div className="meal-calendar">
                <div className="meal-calendar-nav">
                  <button type="button" className="meal-calendar-nav-button" onClick={goToPrevMonth}>
                    ‹
                  </button>
                  <p className="meal-calendar-month-label">{formatMonthLabel(calendarMonth)}</p>
                  <button type="button" className="meal-calendar-nav-button" onClick={goToNextMonth}>
                    ›
                  </button>
                </div>
                <div className="meal-calendar-weekdays">
                  {WEEKDAY_LABELS.map((w) => (
                    <span key={w}>{w}</span>
                  ))}
                </div>
                <div className="meal-calendar-grid">
                  {buildCalendarCells(calendarMonth).map((dateKey, i) => {
                    if (!dateKey) {
                      return <span key={`blank-${i}`} className="meal-calendar-cell meal-calendar-cell-empty" />
                    }
                    const hasLog = logsByDate.has(dateKey)
                    const day = Number(dateKey.split('-')[2])
                    const isSelected = dateKey === selectedDate
                    return (
                      <button
                        key={dateKey}
                        type="button"
                        className={`meal-calendar-cell${hasLog ? ' meal-calendar-cell-has-log' : ''}${isSelected ? ' meal-calendar-cell-selected' : ''}`}
                        onClick={() => setSelectedDate(dateKey)}
                        disabled={!hasLog}
                      >
                        {day}
                      </button>
                    )
                  })}
                </div>
              </div>

              {selectedLog ? (
                <MealDayDetailCard
                  log={selectedLog}
                  replyDraft={replyDrafts[selectedLog.log_date] ?? selectedLog.client_reply ?? ''}
                  onReplyChange={(value) =>
                    setReplyDrafts((prev) => ({ ...prev, [selectedLog.log_date]: value }))
                  }
                  onReplySave={() => handleReplySave(selectedLog.log_date)}
                  saving={!!replySaving[selectedLog.log_date]}
                />
              ) : (
                <p className="meal-lead">金色の日付をタップすると、その日の記録が見られます。</p>
              )}
            </>
          )}
        </div>
      </main>
    )
  }

  if (done) {
    const hasAnyContent =
      MEAL_TYPES.some(({ key }) => mealTexts[key] || mealPhotoPreviews[key]) || weight || memo

    return (
      <main className="lp meal-page">
        <div className="meal-container meal-done">
          <p className="meal-done-badge">✓</p>
          <p className="meal-done-title">記録完了！お疲れ様でした</p>
          <p className="meal-done-lead">今日も記録できました。次回も気軽につけてくださいね。</p>

          {hasAnyContent && (
            <div className="meal-done-summary">
              <p className="meal-done-summary-date">{logDate}の記録</p>

              {MEAL_TYPES.map(({ key, label }) => {
                const text = mealTexts[key]
                const preview = mealPhotoPreviews[key]
                if (!text && !preview) return null
                return (
                  <div key={key} className="meal-history-meal">
                    <p className="meal-history-meal-label">{label}</p>
                    {text && <p className="meal-history-meal-text">{text}</p>}
                    {preview && (
                      <img src={preview} alt={`${label}の写真`} className="meal-history-photo" />
                    )}
                  </div>
                )
              })}

              {weight && <p className="meal-history-weight">体重: {weight}kg</p>}
              {memo && <p className="meal-history-memo">メモ: {memo}</p>}
            </div>
          )}

          {weightHistory.length > 0 && (
            <div className="meal-weight-history">
              <p className="meal-weight-history-title">あなたの体重推移</p>
              <div className="weight-chart-wrap">
                <WeightTrendChart points={weightHistory} />
              </div>
            </div>
          )}

          <button type="button" className="lp-primary-button meal-done-button" onClick={handleLogAnother}>
            別の日を記録する
          </button>
          <button type="button" className="meal-back-link meal-history-link" onClick={openHistory}>
            過去の記録・イクマからのコメントを見る
          </button>
          <a className="meal-back-link" href="/">
            トップページに戻る
          </a>
        </div>
      </main>
    )
  }

  return (
    <main className="lp meal-page">
      <div className="meal-container">
        <p className="lp-hero-eyebrow">食事管理記録</p>
        <h1 className="meal-title">今日の記録をつけよう</h1>
        <p className="meal-lead">
          食事の内容・体重・気になったことを、
          <br />
          思い出せる範囲で大丈夫です。
          <br />
          同じ日にもう一度送ると、内容が上書きされます。
        </p>

        <button type="button" className="meal-back-link meal-history-link" onClick={openHistory}>
          過去の記録・イクマからのコメントを見る
        </button>

        <form className="meal-form" onSubmit={handleSubmit}>
          <label className="meal-field">
            お名前(LINE表示名など)
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </label>

          <label className="meal-field">
            日付
            <input
              type="date"
              value={logDate}
              onChange={(e) => setLogDate(e.target.value)}
              required
            />
          </label>

          {MEAL_TYPES.map(({ key, label }) => (
            <div key={key} className="meal-field-group">
              <label className="meal-field">
                {label}
                <textarea
                  value={mealTexts[key]}
                  onChange={(e) => updateMealText(key, e.target.value)}
                  rows={2}
                />
              </label>
              <label className="meal-field meal-photo-field">
                {label}の写真・任意
                <input type="file" accept="image/*" onChange={(e) => handleMealPhotoChange(key, e)} />
              </label>
              {mealPhotoPreviews[key] && (
                <img
                  src={mealPhotoPreviews[key] ?? undefined}
                  alt={`${label}の写真プレビュー`}
                  className="meal-photo-preview"
                />
              )}
            </div>
          ))}

          <label className="meal-field">
            体重(kg)・任意
            <input
              type="number"
              inputMode="decimal"
              step="0.1"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
            />
          </label>

          <label className="meal-field">
            一言メモ・任意
            <textarea value={memo} onChange={(e) => setMemo(e.target.value)} rows={2} />
          </label>

          {error && <p className="form-error meal-error">{error}</p>}

          <button type="submit" className="lp-primary-button" disabled={submitting}>
            {submitting ? '保存中...' : '記録を保存する'}
          </button>
        </form>
      </div>
    </main>
  )
}

export default MealLogPage
