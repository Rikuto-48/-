import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useDatabase } from '../lib/DatabaseContext'
import { judgePoints } from '../lib/calculations'
import { IRREGULARITY_LABELS } from '../types'

export default function DashboardPage() {
  const { db } = useDatabase()

  const sectionSummaries = useMemo(
    () =>
      db.sections.map((section) => {
        const points = db.points.filter((p) => p.sectionId === section.id)
        const thresholdSet = db.thresholdSets.find((s) => s.id === section.thresholdSetId)
        const judged = thresholdSet ? judgePoints(points, thresholdSet) : []
        const actionCount = judged.filter((j) => j.worst === 'action').length
        const attentionCount = judged.filter((j) => j.worst === 'attention').length
        return { section, pointCount: points.length, actionCount, attentionCount }
      }),
    [db.sections, db.points, db.thresholdSets],
  )

  const totalAction = sectionSummaries.reduce((sum, s) => sum + s.actionCount, 0)
  const totalAttention = sectionSummaries.reduce((sum, s) => sum + s.attentionCount, 0)
  const pendingPlans = db.plans
    .filter((p) => p.status !== '実施済み')
    .slice()
    .sort((a, b) => (a.plannedDate || '').localeCompare(b.plannedDate || ''))
    .slice(0, 8)

  function sectionLabel(id: string) {
    const s = db.sections.find((sec) => sec.id === id)
    return s ? `${s.lineName}（${s.direction}）` : '(不明な区間)'
  }

  return (
    <div>
      <div className="page-title">
        <h1>ダッシュボード</h1>
      </div>

      <div className="stat-grid" style={{ marginBottom: '1.25rem' }}>
        <div className="stat-box">
          <div className="stat-label">登録区間数</div>
          <div className="stat-value">{db.sections.length}</div>
        </div>
        <div className="stat-box">
          <div className="stat-label">総測定点数</div>
          <div className="stat-value">{db.points.length}</div>
        </div>
        <div className="stat-box">
          <div className="stat-label">要整備 測定点</div>
          <div className="stat-value" style={{ color: 'var(--color-action)' }}>
            {totalAction}
          </div>
        </div>
        <div className="stat-box">
          <div className="stat-label">要注意 測定点</div>
          <div className="stat-value" style={{ color: 'var(--color-attention)' }}>
            {totalAttention}
          </div>
        </div>
      </div>

      <div className="card">
        <h2>区間別 状況</h2>
        {sectionSummaries.length === 0 ? (
          <div className="empty-state">
            測定区間がまだありません。<Link className="link" to="/sections">測定データ入力</Link>から登録してください。
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>区間</th>
                <th>測定点数</th>
                <th>要整備</th>
                <th>要注意</th>
                <th className="no-print">操作</th>
              </tr>
            </thead>
            <tbody>
              {sectionSummaries.map(({ section, pointCount, actionCount, attentionCount }) => (
                <tr key={section.id}>
                  <td>
                    {section.lineName}（{section.direction}）{section.startKp}〜{section.endKp}
                  </td>
                  <td>{pointCount}</td>
                  <td>{actionCount > 0 ? <span className="badge action">{actionCount}</span> : 0}</td>
                  <td>{attentionCount > 0 ? <span className="badge attention">{attentionCount}</span> : 0}</td>
                  <td className="no-print">
                    <Link className="btn secondary" to={`/sections/${section.id}`}>
                      詳細
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <h2>直近の整備計画（未実施）</h2>
        {pendingPlans.length === 0 ? (
          <div className="empty-state">未実施の整備計画はありません。</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>対象区間</th>
                <th>狂い種別</th>
                <th>実施予定日</th>
                <th>状況</th>
              </tr>
            </thead>
            <tbody>
              {pendingPlans.map((plan) => (
                <tr key={plan.id}>
                  <td>{sectionLabel(plan.sectionId)}</td>
                  <td>{IRREGULARITY_LABELS[plan.irregularityType]}</td>
                  <td>{plan.plannedDate || '-'}</td>
                  <td>{plan.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
