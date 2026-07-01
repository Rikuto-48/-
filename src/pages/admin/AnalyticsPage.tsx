import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { CONTENT_PILLARS } from '../../data/contentPillars'

interface ContentRow {
  content_pillar: string | null
  impressions: number | null
  saves: number | null
  profile_visits: number | null
  dm_count: number | null
}

interface PillarSummary {
  pillar: string
  postCount: number
  avgImpressions: number
  avgSaves: number
  avgProfileVisits: number
  avgDmCount: number
  saveRate: number | null
  dmConversionRate: number | null
}

function average(values: number[]) {
  if (values.length === 0) return 0
  return values.reduce((sum, v) => sum + v, 0) / values.length
}

function summarizeByPillar(rows: ContentRow[]): PillarSummary[] {
  const summaries = CONTENT_PILLARS.map((pillar) => {
    const pillarRows = rows.filter(
      (row) => row.content_pillar === pillar && row.impressions !== null,
    )

    const impressions = pillarRows.map((r) => r.impressions ?? 0)
    const saves = pillarRows.map((r) => r.saves ?? 0)
    const profileVisits = pillarRows.map((r) => r.profile_visits ?? 0)
    const dmCounts = pillarRows.map((r) => r.dm_count ?? 0)

    const totalImpressions = impressions.reduce((sum, v) => sum + v, 0)
    const totalSaves = saves.reduce((sum, v) => sum + v, 0)
    const totalDm = dmCounts.reduce((sum, v) => sum + v, 0)

    return {
      pillar,
      postCount: pillarRows.length,
      avgImpressions: average(impressions),
      avgSaves: average(saves),
      avgProfileVisits: average(profileVisits),
      avgDmCount: average(dmCounts),
      saveRate: totalImpressions > 0 ? (totalSaves / totalImpressions) * 100 : null,
      dmConversionRate: totalImpressions > 0 ? (totalDm / totalImpressions) * 100 : null,
    }
  })

  return summaries
    .filter((s) => s.postCount > 0)
    .sort((a, b) => (b.dmConversionRate ?? -1) - (a.dmConversionRate ?? -1))
}

function AnalyticsPage() {
  const [rows, setRows] = useState<ContentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchRows() {
      if (!supabase) {
        setLoading(false)
        return
      }

      setLoading(true)
      const { data, error: fetchError } = await supabase
        .from('content_calendar')
        .select('content_pillar, impressions, saves, profile_visits, dm_count')

      if (fetchError) {
        setError('実績データの取得に失敗しました')
      } else {
        setRows(data as ContentRow[])
      }
      setLoading(false)
    }

    void fetchRows()
  }, [])

  const summaries = summarizeByPillar(rows)

  return (
    <div>
      <h1 className="admin-title">コンテンツ実績ダッシュボード</h1>
      <p className="analytics-note">
        投稿後に「実績」欄へ数値を入力したコンテンツのみ集計対象になります。DM転換率が高いピラーを増やすのが基本戦略です。
      </p>

      {error && <p className="form-error">{error}</p>}

      {loading ? (
        <p>読み込み中...</p>
      ) : summaries.length === 0 ? (
        <p>まだ実績データがありません。コンテンツカレンダーで投稿後の数値を入力してください。</p>
      ) : (
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>ピラー</th>
                <th>投稿数</th>
                <th>平均リーチ</th>
                <th>平均保存数</th>
                <th>平均PF訪問</th>
                <th>平均DM数</th>
                <th>保存率</th>
                <th>DM転換率</th>
              </tr>
            </thead>
            <tbody>
              {summaries.map((s) => (
                <tr key={s.pillar}>
                  <td>{s.pillar}</td>
                  <td>{s.postCount}</td>
                  <td>{s.avgImpressions.toFixed(0)}</td>
                  <td>{s.avgSaves.toFixed(1)}</td>
                  <td>{s.avgProfileVisits.toFixed(1)}</td>
                  <td>{s.avgDmCount.toFixed(1)}</td>
                  <td>{s.saveRate !== null ? `${s.saveRate.toFixed(1)}%` : '-'}</td>
                  <td>{s.dmConversionRate !== null ? `${s.dmConversionRate.toFixed(1)}%` : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default AnalyticsPage
