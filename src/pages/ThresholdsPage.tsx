import { useState } from 'react'
import { useDatabase } from '../lib/DatabaseContext'
import { IRREGULARITY_LABELS, IRREGULARITY_TYPES } from '../types'

export default function ThresholdsPage() {
  const { db, addThresholdSet, updateThresholdSet, deleteThresholdSet } = useDatabase()
  const [newName, setNewName] = useState('')

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    addThresholdSet({
      name: newName.trim(),
      note: '',
      levels: {
        alignment: { attention: 7, action: 11 },
        longitudinalLevel: { attention: 7, action: 11 },
        crossLevel: { attention: 8, action: 12 },
        gauge: { attention: 10, action: 15 },
        twist: { attention: 9, action: 14 },
      },
    })
    setNewName('')
  }

  const usedIds = new Set(db.sections.map((s) => s.thresholdSetId))

  return (
    <div>
      <div className="page-title">
        <h1>整備基準値設定</h1>
      </div>
      <p className="muted">
        各狂い種別の「注意値」「整備値」（絶対値, mm）は自社の運用基準に合わせて編集してください。測定値がこの値以上になると、
        測定データ入力画面で「要注意」「要整備」として色付き表示されます。
      </p>

      <div className="card">
        <h2>基準値セットの追加</h2>
        <form onSubmit={handleAdd} className="form-grid" style={{ alignItems: 'end' }}>
          <div className="form-field">
            <label>名称</label>
            <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="例: 分岐器区間" />
          </div>
          <button className="btn" type="submit">
            追加
          </button>
        </form>
      </div>

      {db.thresholdSets.map((set) => (
        <div className="card" key={set.id}>
          <div className="page-title" style={{ marginBottom: '0.5rem' }}>
            <div style={{ flex: 1 }}>
              <div className="form-field">
                <label>名称</label>
                <input value={set.name} onChange={(e) => updateThresholdSet(set.id, { name: e.target.value })} />
              </div>
            </div>
            <button
              className="btn danger"
              disabled={db.thresholdSets.length <= 1 || usedIds.has(set.id)}
              title={usedIds.has(set.id) ? '使用中の区間があるため削除できません' : undefined}
              onClick={() => {
                if (confirm(`「${set.name}」を削除しますか？`)) deleteThresholdSet(set.id)
              }}
            >
              削除
            </button>
          </div>
          <div className="form-field" style={{ marginBottom: '0.75rem' }}>
            <label>メモ</label>
            <input value={set.note} onChange={(e) => updateThresholdSet(set.id, { note: e.target.value })} />
          </div>
          <table>
            <thead>
              <tr>
                <th>狂い種別</th>
                <th>注意値(mm)</th>
                <th>整備値(mm)</th>
              </tr>
            </thead>
            <tbody>
              {IRREGULARITY_TYPES.map((type) => (
                <tr key={type}>
                  <td>{IRREGULARITY_LABELS[type]}</td>
                  <td>
                    <input
                      className="num-input"
                      type="number"
                      step="any"
                      value={set.levels[type].attention}
                      onChange={(e) =>
                        updateThresholdSet(set.id, {
                          levels: {
                            ...set.levels,
                            [type]: { ...set.levels[type], attention: Number(e.target.value) },
                          },
                        })
                      }
                    />
                  </td>
                  <td>
                    <input
                      className="num-input"
                      type="number"
                      step="any"
                      value={set.levels[type].action}
                      onChange={(e) =>
                        updateThresholdSet(set.id, {
                          levels: {
                            ...set.levels,
                            [type]: { ...set.levels[type], action: Number(e.target.value) },
                          },
                        })
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  )
}
