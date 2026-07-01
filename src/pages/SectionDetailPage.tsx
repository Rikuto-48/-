import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useDatabase } from '../lib/DatabaseContext'
import { computeSectionStats, judgePoints } from '../lib/calculations'
import { IRREGULARITY_LABELS, IRREGULARITY_TYPES, JUDGEMENT_LABELS, type IrregularityType } from '../types'
import { downloadCsv } from '../lib/csv'

interface DraftRow {
  distance: string
  values: Record<IrregularityType, string>
  memo: string
}

function emptyDraft(nextDistance: number): DraftRow {
  return {
    distance: String(nextDistance),
    values: { alignment: '', longitudinalLevel: '', crossLevel: '', gauge: '', twist: '' },
    memo: '',
  }
}

export default function SectionDetailPage() {
  const { sectionId } = useParams<{ sectionId: string }>()
  const navigate = useNavigate()
  const { db, updateSection, upsertPoint, deletePoint } = useDatabase()

  const section = db.sections.find((s) => s.id === sectionId)
  const points = useMemo(
    () => db.points.filter((p) => p.sectionId === sectionId).sort((a, b) => a.distance - b.distance),
    [db.points, sectionId],
  )
  const thresholdSet = db.thresholdSets.find((s) => s.id === section?.thresholdSetId)

  const [draft, setDraft] = useState<DraftRow>(() => emptyDraft(points.length ? points[points.length - 1].distance + 5 : 0))

  if (!section) {
    return (
      <div className="empty-state">
        測定区間が見つかりません。<Link className="link" to="/sections">一覧に戻る</Link>
      </div>
    )
  }

  const judged = thresholdSet ? judgePoints(points, thresholdSet) : []
  const stats = computeSectionStats(points)

  function handleAddRow(e: React.FormEvent) {
    e.preventDefault()
    const distance = Number(draft.distance)
    if (Number.isNaN(distance)) return
    const values: Partial<Record<IrregularityType, number>> = {}
    for (const type of IRREGULARITY_TYPES) {
      const raw = draft.values[type]
      if (raw.trim() !== '') values[type] = Number(raw)
    }
    upsertPoint({ sectionId: section!.id, distance, values, memo: draft.memo.trim() })
    setDraft(emptyDraft(distance + 5))
  }

  function handleExportCsv() {
    const header = ['距離(m)', ...IRREGULARITY_TYPES.map((t) => `${IRREGULARITY_LABELS[t]}(mm)`), '判定', '備考']
    const rows = judged.map(({ point, worst }) => [
      point.distance,
      ...IRREGULARITY_TYPES.map((t) => point.values[t] ?? ''),
      JUDGEMENT_LABELS[worst],
      point.memo,
    ])
    downloadCsv(`${section!.lineName}_測定データ.csv`, [header, ...rows])
  }

  return (
    <div>
      <div className="page-title">
        <h1>
          {section.lineName}（{section.direction}） {section.startKp} 〜 {section.endKp}
        </h1>
        <div className="row-actions">
          <button className="btn secondary" onClick={() => navigate(`/sections/${section.id}/report`)}>
            帳票プレビュー
          </button>
          <button className="btn secondary" onClick={handleExportCsv} disabled={points.length === 0}>
            CSV出力
          </button>
        </div>
      </div>

      <div className="card">
        <h2>区間情報</h2>
        <div className="form-grid">
          <div className="form-field">
            <label>整備基準値セット</label>
            <select
              value={section.thresholdSetId}
              onChange={(e) => updateSection(section.id, { thresholdSetId: e.target.value })}
            >
              {db.thresholdSets.map((set) => (
                <option key={set.id} value={set.id}>
                  {set.name}
                </option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label>備考</label>
            <input value={section.memo} onChange={(e) => updateSection(section.id, { memo: e.target.value })} />
          </div>
        </div>
        {!thresholdSet && <p className="muted">整備基準値セットが見つかりません。整備基準値設定から確認してください。</p>}
      </div>

      <div className="card">
        <h2>軌道狂い計算サマリー（{IRREGULARITY_LABELS.alignment}〜{IRREGULARITY_LABELS.twist}）</h2>
        {points.length === 0 ? (
          <div className="empty-state">測定点がまだありません。下の表に測定データを入力してください。</div>
        ) : (
          <div className="stat-grid">
            {stats
              .filter((s) => s.count > 0)
              .map((s) => (
                <div className="stat-box" key={s.type}>
                  <div className="stat-label">{IRREGULARITY_LABELS[s.type]}</div>
                  <div className="stat-value">
                    σ={s.stdDev !== null ? s.stdDev.toFixed(2) : '-'}mm
                  </div>
                  <div className="muted">
                    平均 {s.mean !== null ? s.mean.toFixed(2) : '-'}mm / 最大絶対値 {s.max !== null ? s.max.toFixed(2) : '-'}mm（{s.count}点）
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      <div className="card">
        <h2>測定データ入力・判定結果</h2>
        <form onSubmit={handleAddRow} className="form-grid" style={{ alignItems: 'end' }}>
          <div className="form-field">
            <label>距離(m)</label>
            <input
              className="num-input"
              type="number"
              step="any"
              value={draft.distance}
              onChange={(e) => setDraft({ ...draft, distance: e.target.value })}
              required
            />
          </div>
          {IRREGULARITY_TYPES.map((type) => (
            <div className="form-field" key={type}>
              <label>{IRREGULARITY_LABELS[type]}(mm)</label>
              <input
                className="num-input"
                type="number"
                step="any"
                value={draft.values[type]}
                onChange={(e) => setDraft({ ...draft, values: { ...draft.values, [type]: e.target.value } })}
              />
            </div>
          ))}
          <div className="form-field">
            <label>備考</label>
            <input value={draft.memo} onChange={(e) => setDraft({ ...draft, memo: e.target.value })} />
          </div>
          <button className="btn" type="submit">
            測定点を追加
          </button>
        </form>

        {points.length === 0 ? null : (
          <table>
            <thead>
              <tr>
                <th>距離(m)</th>
                {IRREGULARITY_TYPES.map((type) => (
                  <th key={type}>{IRREGULARITY_LABELS[type]}(mm)</th>
                ))}
                <th>総合判定</th>
                <th>備考</th>
                <th className="no-print">操作</th>
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
                  <td>
                    <span className={`badge ${worst}`}>{JUDGEMENT_LABELS[worst]}</span>
                  </td>
                  <td>{point.memo}</td>
                  <td className="no-print">
                    <button className="btn danger" onClick={() => deletePoint(point.id)}>
                      削除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
