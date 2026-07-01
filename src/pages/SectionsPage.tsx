import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useDatabase } from '../lib/DatabaseContext'

export default function SectionsPage() {
  const { db, addSection, deleteSection } = useDatabase()
  const [lineName, setLineName] = useState('')
  const [direction, setDirection] = useState('上り')
  const [startKp, setStartKp] = useState('')
  const [endKp, setEndKp] = useState('')
  const [thresholdSetId, setThresholdSetId] = useState(db.thresholdSets[0]?.id ?? '')
  const [memo, setMemo] = useState('')

  const effectiveThresholdSetId = thresholdSetId || db.thresholdSets[0]?.id || ''

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!lineName.trim() || !effectiveThresholdSetId) return
    addSection({
      lineName: lineName.trim(),
      direction,
      startKp: startKp.trim(),
      endKp: endKp.trim(),
      thresholdSetId: effectiveThresholdSetId,
      memo: memo.trim(),
    })
    setLineName('')
    setStartKp('')
    setEndKp('')
    setMemo('')
  }

  function pointCount(sectionId: string) {
    return db.points.filter((p) => p.sectionId === sectionId).length
  }

  return (
    <div>
      <div className="page-title">
        <h1>測定データ入力</h1>
      </div>

      <div className="card">
        <h2>測定区間の登録</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-field">
              <label htmlFor="lineName">線名</label>
              <input id="lineName" value={lineName} onChange={(e) => setLineName(e.target.value)} placeholder="例: 山手線" required />
            </div>
            <div className="form-field">
              <label htmlFor="direction">方向</label>
              <select id="direction" value={direction} onChange={(e) => setDirection(e.target.value)}>
                <option value="上り">上り</option>
                <option value="下り">下り</option>
                <option value="単線">単線</option>
              </select>
            </div>
            <div className="form-field">
              <label htmlFor="startKp">起点キロ程</label>
              <input id="startKp" value={startKp} onChange={(e) => setStartKp(e.target.value)} placeholder="例: 12k300m" />
            </div>
            <div className="form-field">
              <label htmlFor="endKp">終点キロ程</label>
              <input id="endKp" value={endKp} onChange={(e) => setEndKp(e.target.value)} placeholder="例: 12k500m" />
            </div>
            <div className="form-field">
              <label htmlFor="thresholdSetId">整備基準値セット</label>
              <select id="thresholdSetId" value={effectiveThresholdSetId} onChange={(e) => setThresholdSetId(e.target.value)}>
                {db.thresholdSets.map((set) => (
                  <option key={set.id} value={set.id}>
                    {set.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label htmlFor="memo">備考</label>
              <input id="memo" value={memo} onChange={(e) => setMemo(e.target.value)} />
            </div>
          </div>
          <button className="btn" type="submit">
            区間を追加
          </button>
        </form>
      </div>

      <div className="card">
        <h2>測定区間一覧</h2>
        {db.sections.length === 0 ? (
          <div className="empty-state">登録された測定区間がありません。上のフォームから追加してください。</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>線名</th>
                <th>方向</th>
                <th>キロ程</th>
                <th>整備基準値セット</th>
                <th>測定点数</th>
                <th>備考</th>
                <th className="no-print">操作</th>
              </tr>
            </thead>
            <tbody>
              {db.sections.map((section) => {
                const set = db.thresholdSets.find((s) => s.id === section.thresholdSetId)
                return (
                  <tr key={section.id}>
                    <td>
                      <Link className="link" to={`/sections/${section.id}`}>
                        {section.lineName}
                      </Link>
                    </td>
                    <td>{section.direction}</td>
                    <td>
                      {section.startKp || '-'} 〜 {section.endKp || '-'}
                    </td>
                    <td>{set?.name ?? '-'}</td>
                    <td>{pointCount(section.id)}</td>
                    <td>{section.memo}</td>
                    <td className="no-print">
                      <div className="row-actions">
                        <Link className="btn secondary" to={`/sections/${section.id}`}>
                          入力・計算
                        </Link>
                        <button
                          className="btn danger"
                          onClick={() => {
                            if (confirm(`「${section.lineName}」区間を削除しますか？関連する測定点・整備計画も削除されます。`)) {
                              deleteSection(section.id)
                            }
                          }}
                        >
                          削除
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
