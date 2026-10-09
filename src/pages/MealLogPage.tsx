import { useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { supabase } from '../lib/supabaseClient'
import { getSavedMealLogName, saveMealLogName } from '../lib/mealLogStorage'
import { compressImage } from '../lib/compressImage'
import WeightTrendChart from '../components/WeightTrendChart'

function todayLocalDate(): string {
  const now = new Date()
  const offsetMs = now.getTimezoneOffset() * 60000
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 10)
}

function MealLogPage() {
  const [name, setName] = useState(getSavedMealLogName())
  const [logDate, setLogDate] = useState(todayLocalDate())
  const [breakfast, setBreakfast] = useState('')
  const [lunch, setLunch] = useState('')
  const [dinner, setDinner] = useState('')
  const [snack, setSnack] = useState('')
  const [weight, setWeight] = useState('')
  const [memo, setMemo] = useState('')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null)

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [weightHistory, setWeightHistory] = useState<{ date: string; weight: number }[]>([])

  function handlePhotoChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    setPhotoFile(file)
    setPhotoPreviewUrl(file ? URL.createObjectURL(file) : null)
  }

  async function uploadPhoto(): Promise<string | null> {
    if (!photoFile || !supabase) return null

    const compressed = await compressImage(photoFile)
    const path = `${crypto.randomUUID()}.jpg`

    const { error: uploadError } = await supabase.storage
      .from('meal-photos')
      .upload(path, compressed, { contentType: 'image/jpeg' })

    if (uploadError) {
      throw uploadError
    }

    const { data } = supabase.storage.from('meal-photos').getPublicUrl(path)
    return data.publicUrl
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

    let photoUrl: string | null = null
    try {
      photoUrl = await uploadPhoto()
    } catch (photoError) {
      console.error('写真のアップロードに失敗しました', photoError)
      setSubmitting(false)
      setError('写真のアップロードに失敗しました。もう一度お試しください。')
      return
    }

    const { error: upsertError } = await supabase.rpc('upsert_meal_log', {
      p_name: name,
      p_log_date: logDate,
      p_breakfast: breakfast || null,
      p_lunch: lunch || null,
      p_dinner: dinner || null,
      p_snack: snack || null,
      p_weight: weight ? Number(weight) : null,
      p_memo: memo || null,
      p_photo_url: photoUrl,
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
    setBreakfast('')
    setLunch('')
    setDinner('')
    setSnack('')
    setWeight('')
    setMemo('')
    setPhotoFile(null)
    setPhotoPreviewUrl(null)
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

          <label className="meal-field">
            朝食
            <textarea value={breakfast} onChange={(e) => setBreakfast(e.target.value)} rows={2} />
          </label>

          <label className="meal-field">
            昼食
            <textarea value={lunch} onChange={(e) => setLunch(e.target.value)} rows={2} />
          </label>

          <label className="meal-field">
            夕食
            <textarea value={dinner} onChange={(e) => setDinner(e.target.value)} rows={2} />
          </label>

          <label className="meal-field">
            間食
            <textarea value={snack} onChange={(e) => setSnack(e.target.value)} rows={2} />
          </label>

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
            写真・任意
            <input type="file" accept="image/*" capture="environment" onChange={handlePhotoChange} />
          </label>
          {photoPreviewUrl && (
            <img src={photoPreviewUrl} alt="アップロードする写真のプレビュー" className="meal-photo-preview" />
          )}

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
