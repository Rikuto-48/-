import { Link, useParams } from 'react-router-dom'
import { useDatabase } from '../lib/DatabaseContext'
import { computeSectionStats, judgePoints } from '../lib/calculations'
import { IRREGULARITY_LABELS, IRREGULARITY_TYPES, JUDGEMENT_LABELS } from '../types'

export default function ReportPage() {
  const { sectionId } = useParams<{ sectionId: string }>()
  const { db } = useDatabase()

  const section = db.sections.find((s) => s.id === sectionId)
  const points = db.points.filter((p) => p.sectionId === sectionId).sort((a, b) => a.distance - b.distance)
  const thresholdSet = db.thresholdSets.find((s) => s.id === section?.thresholdSetId)
  const plans = db.plans.filter((p) => p.sectionId === sectionId)

  if (!section) {
    return (
      <div style={{ padding: '1.5rem' }}>
        測定区間が見つかりません。<Link className="link" to="/sections">一覧に戻る</Link>
      </div>
    )
  }

  const judged = thresholdSet ? judgePoints(points, thresholdSet) : []
  const stats = computeSectionStats(points)

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1000px', margin: '0 auto' }}>
      <div className="no-print" style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem' }}>
        <button className="btn" onClick={() => window.print()}>
          印刷する
        </button>
        <Link className="btn secondary" to={`/sections/${section.id}`}>
          入力画面に戻る
        </Link>
      </div>

      <h1 style={{ marginBottom: '0.25rem' }}>軌道整備計算シート</h1>
      <p className="muted">出力日: {new Date().toLocaleDateString('ja-JP')}</p>

      <table style={{ marginBottom: '1rem' }}>
        <tbody>
          <tr>
            <th style={{ width: '20%' }}>線名</th>
            <td>{section.lineName}</td>
            <th style={{ width: '20%' }}>方向</th>
            <td>{section.direction}</td>
          </tr>
          <tr>
            <th>キロ程</th>
            <td>
              {section.startKp} 〜 {section.endKp}
            </td>
            <th>整備基準値セット</th>
            <td>{thresholdSet?.name ?? '-'}</td>
          </tr>
          <tr>
            <th>備考</th>
            <td colSpan={3}>{section.memo}</td>
          </tr>
        </tbody>
      </table>

      <h2>軌道狂い統計（標準偏差）</h2>
      <table style={{ marginBottom: '1rem' }}>
        <thead>
          <tr>
            <th>狂い種別</th>
            <th>測定点数</th>
            <th>平均(mm)</th>
            <th>標準偏差 σ(mm)</th>
            <th>最大絶対値(mm)</th>
          </tr>
        </thead>
        <tbody>
          {stats.map((s) => (
            <tr key={s.type}>
              <td>{IRREGULARITY_LABELS[s.type]}</td>
              <td>{s.count}</td>
              <td>{s.mean !== null ? s.mean.toFixed(2) : '-'}</td>
              <td>{s.stdDev !== null ? s.stdDev.toFixed(2) : '-'}</td>
              <td>{s.max !== null ? s.max.toFixed(2) : '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>測定データ・判定結果</h2>
      <table style={{ marginBottom: '1rem' }}>
        <thead>
          <tr>
            <th>距離(m)</th>
            {IRREGULARITY_TYPES.map((type) => (
              <th key={type}>{IRREGULARITY_LABELS[type]}</th>
            ))}
            <th>総合判定</th>
            <th>備考</th>
          </tr>
        </thead>
        <tbody>
          {judged.map(({ point, judgements, worst }) => (
            <tr key={point.id}>
              <td>{point.distance}</td>
              {IRREGULARITY_TYPES.map((type) => {
                const value = point.values[type]
                const j = judgements[type]
                return (
                  <td key={type} className={j && j !== 'good' ? `judged-cell ${j}` : undefined}>
                    {value !== undefined ? value : '-'}
                  </td>
                )
              })}
              <td>{JUDGEMENT_LABELS[worst]}</td>
              <td>{point.memo}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>整備計画・記録</h2>
      {plans.length === 0 ? (
        <p className="muted">登録された整備計画はありません。</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>狂い種別</th>
              <th>実施予定日</th>
              <th>状況</th>
              <th>担当者</th>
              <th>整備方法</th>
              <th>備考</th>
            </tr>
          </thead>
          <tbody>
            {plans.map((plan) => (
              <tr key={plan.id}>
                <td>{IRREGULARITY_LABELS[plan.irregularityType]}</td>
                <td>{plan.plannedDate || '-'}</td>
                <td>{plan.status}</td>
                <td>{plan.assignee}</td>
                <td>{plan.method}</td>
                <td>{plan.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
