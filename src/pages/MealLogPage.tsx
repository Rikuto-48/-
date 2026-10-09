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

  if (done) {
    return (
      <main className="lp meal-page">
        <div className="meal-container meal-done">
          <p className="meal-done-title">記録ありがとうございます！</p>
          <p className="meal-done-lead">次回も気軽に記録してくださいね。</p>

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
        <p className="lp-hero-eyebrow">イクマ 食事管理記録</p>
        <h1 className="meal-title">今日の記録をつけよう</h1>
        <p className="meal-lead">
          食事の内容・体重・気になったことを、思い出せる範囲で大丈夫です。
          <br />
          同じ日にもう一度送ると、内容が上書きされます。
        </p>

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
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => handleMealPhotoChange(key, e)}
                />
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
