import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import WeightTrendChart from '../../components/WeightTrendChart'

interface MealLog {
  id: string
  name: string
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
}

const MEAL_COLUMNS: { label: string; textKey: keyof MealLog; photoKey: keyof MealLog }[] = [
  { label: '朝食', textKey: 'breakfast', photoKey: 'breakfast_photo_url' },
  { label: '昼食', textKey: 'lunch', photoKey: 'lunch_photo_url' },
  { label: '夕食', textKey: 'dinner', photoKey: 'dinner_photo_url' },
  { label: '間食', textKey: 'snack', photoKey: 'snack_photo_url' },
]

function MealCell({ text, photoUrl, logDate, label }: { text: string | null; photoUrl: string | null; logDate: string; label: string }) {
  if (!text && !photoUrl) return <>-</>

  return (
    <div className="meal-cell">
      {text && <p className="meal-cell-text">{text}</p>}
      {photoUrl && (
        <a href={photoUrl} target="_blank" rel="noopener noreferrer">
          <img src={photoUrl} alt={`${logDate}の${label}の写真`} className="meal-log-thumb" />
        </a>
      )}
    </div>
  )
}

interface PersonSummary {
  name: string
  logs: MealLog[]
  latestDate: string
  latestWeight: number | null
}

function summarizeByName(logs: MealLog[]): PersonSummary[] {
  const byName = new Map<string, MealLog[]>()

  for (const log of logs) {
    const existing = byName.get(log.name)
    if (existing) {
      existing.push(log)
    } else {
      byName.set(log.name, [log])
    }
  }

  return Array.from(byName.entries())
    .map(([name, personLogs]) => {
      const sorted = [...personLogs].sort((a, b) => (a.log_date < b.log_date ? 1 : -1))
      const latestWithWeight = sorted.find((l) => l.weight !== null)
      return {
        name,
        logs: sorted,
        latestDate: sorted[0].log_date,
        latestWeight: latestWithWeight?.weight ?? null,
      }
    })
    .sort((a, b) => (a.latestDate < b.latestDate ? 1 : -1))
}

function MealsAdminPage() {
  const [logs, setLogs] = useState<MealLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedName, setSelectedName] = useState<string | null>(null)

  useEffect(() => {
    async function fetchLogs() {
      if (!supabase) {
        setLoading(false)
        return
      }

      setLoading(true)
      const { data, error: fetchError } = await supabase
        .from('meal_logs')
        .select('*')
        .order('log_date', { ascending: false })

      if (fetchError) {
        setError('食事記録の取得に失敗しました')
      } else {
        setLogs(data as MealLog[])
      }
      setLoading(false)
    }

    void fetchLogs()
  }, [])

  const people = summarizeByName(logs)
  const selectedPerson = people.find((p) => p.name === selectedName) ?? null

  if (selectedPerson) {
    const weightPoints = [...selectedPerson.logs]
      .filter((l): l is MealLog & { weight: number } => l.weight !== null)
      .sort((a, b) => (a.log_date < b.log_date ? -1 : 1))
      .map((l) => ({ date: l.log_date, weight: l.weight }))

    return (
      <div>
        <button type="button" className="meal-back-button" onClick={() => setSelectedName(null)}>
          ← 一覧に戻る
        </button>
        <h1 className="admin-title">{selectedPerson.name} さんの記録</h1>

        <h2 className="admin-subtitle">体重の推移</h2>
        <div className="weight-chart-wrap">
          <WeightTrendChart points={weightPoints} />
        </div>

        <h2 className="admin-subtitle">日別記録</h2>
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>日付</th>
                <th>朝食</th>
                <th>昼食</th>
                <th>夕食</th>
                <th>間食</th>
                <th>体重</th>
                <th>メモ</th>
              </tr>
            </thead>
            <tbody>
              {selectedPerson.logs.map((log) => (
                <tr key={log.id}>
                  <td>{log.log_date}</td>
                  {MEAL_COLUMNS.map(({ label, textKey, photoKey }) => (
                    <td key={textKey}>
                      <MealCell
                        text={log[textKey] as string | null}
                        photoUrl={log[photoKey] as string | null}
                        logDate={log.log_date}
                        label={label}
                      />
                    </td>
                  ))}
                  <td>{log.weight !== null ? `${log.weight}kg` : '-'}</td>
                  <td>{log.memo ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  return (
    <div>
      <h1 className="admin-title">食事管理</h1>

      {error && <p className="form-error">{error}</p>}

      {loading ? (
        <p>読み込み中...</p>
      ) : (
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>お名前</th>
                <th>記録日数</th>
                <th>最新記録日</th>
                <th>最新体重</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {people.map((person) => (
                <tr key={person.name}>
                  <td>{person.name}</td>
                  <td>{person.logs.length}日</td>
                  <td>{person.latestDate}</td>
                  <td>{person.latestWeight !== null ? `${person.latestWeight}kg` : '-'}</td>
                  <td>
                    <button
                      type="button"
                      className="primary-button"
                      onClick={() => setSelectedName(person.name)}
                    >
                      詳細を見る
                    </button>
                  </td>
                </tr>
              ))}
              {people.length === 0 && (
                <tr>
                  <td colSpan={5}>まだ記録がありません</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default MealsAdminPage
