import { useMemo, useState } from 'react'
import { useDatabase } from '../lib/DatabaseContext'
import { IRREGULARITY_LABELS, IRREGULARITY_TYPES, type IrregularityType, type PlanStatus } from '../types'

const STATUS_OPTIONS: PlanStatus[] = ['未着手', '計画中', '実施済み']

export default function PlansPage() {
  const { db, upsertPlan, deletePlan } = useDatabase()
  const [sectionId, setSectionId] = useState(db.sections[0]?.id ?? '')
  const [irregularityType, setIrregularityType] = useState<IrregularityType>('alignment')
  const [plannedDate, setPlannedDate] = useState('')
  const [status, setStatus] = useState<PlanStatus>('未着手')
  const [assignee, setAssignee] = useState('')
  const [method, setMethod] = useState('')
  const [note, setNote] = useState('')
  const [statusFilter, setStatusFilter] = useState<PlanStatus | 'すべて'>('すべて')

  const effectiveSectionId = sectionId || db.sections[0]?.id || ''

  const sortedPlans = useMemo(
    () =>
      db.plans
        .filter((p) => statusFilter === 'すべて' || p.status === statusFilter)
        .slice()
        .sort((a, b) => (a.plannedDate || '').localeCompare(b.plannedDate || '')),
    [db.plans, statusFilter],
  )

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!effectiveSectionId) return
    upsertPlan({
      sectionId: effectiveSectionId,
      irregularityType,
      plannedDate,
      status,
      assignee: assignee.trim(),
      method: method.trim(),
      note: note.trim(),
    })
    setPlannedDate('')
    setAssignee('')
    setMethod('')
    setNote('')
  }

  function sectionLabel(id: string) {
    const s = db.sections.find((sec) => sec.id === id)
    return s ? `${s.lineName}（${s.direction}）${s.startKp}〜${s.endKp}` : '(不明な区間)'
  }

  return (
    <div>
      <div className="page-title">
        <h1>整備計画・記録管理</h1>
      </div>

      {db.sections.length === 0 ? (
        <div className="empty-state">先に「測定データ入力」から測定区間を登録してください。</div>
      ) : (
        <div className="card">
          <h2>整備計画の登録</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="form-field">
                <label>対象区間</label>
                <select value={effectiveSectionId} onChange={(e) => setSectionId(e.target.value)}>
                  {db.sections.map((s) => (
                    <option key={s.id} value={s.id}>
                      {sectionLabel(s.id)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-field">
                <label>狂い種別</label>
                <select value={irregularityType} onChange={(e) => setIrregularityType(e.target.value as IrregularityType)}>
                  {IRREGULARITY_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {IRREGULARITY_LABELS[type]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-field">
                <label>実施予定日</label>
                <input type="date" value={plannedDate} onChange={(e) => setPlannedDate(e.target.value)} />
              </div>
              <div className="form-field">
                <label>状況</label>
                <select value={status} onChange={(e) => setStatus(e.target.value as PlanStatus)}>
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-field">
                <label>担当者</label>
                <input value={assignee} onChange={(e) => setAssignee(e.target.value)} />
              </div>
              <div className="form-field">
                <label>整備方法</label>
                <input value={method} onChange={(e) => setMethod(e.target.value)} placeholder="例: 道床突き固め" />
              </div>
              <div className="form-field">
                <label>備考</label>
                <input value={note} onChange={(e) => setNote(e.target.value)} />
              </div>
            </div>
            <button className="btn" type="submit">
              計画を登録
            </button>
          </form>
        </div>
      )}

      <div className="card">
        <div className="page-title" style={{ marginBottom: '0.5rem' }}>
          <h2>整備計画一覧</h2>
          <div className="form-field" style={{ minWidth: '160px' }}>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as PlanStatus | 'すべて')}>
              <option value="すべて">すべての状況</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>
        {sortedPlans.length === 0 ? (
          <div className="empty-state">該当する整備計画がありません。</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>対象区間</th>
                <th>狂い種別</th>
                <th>実施予定日</th>
                <th>状況</th>
                <th>担当者</th>
                <th>整備方法</th>
                <th>備考</th>
                <th className="no-print">操作</th>
              </tr>
            </thead>
            <tbody>
              {sortedPlans.map((plan) => (
                <tr key={plan.id}>
                  <td>{sectionLabel(plan.sectionId)}</td>
                  <td>{IRREGULARITY_LABELS[plan.irregularityType]}</td>
                  <td>{plan.plannedDate || '-'}</td>
                  <td>
                    <select
                      value={plan.status}
                      onChange={(e) => upsertPlan({ ...plan, status: e.target.value as PlanStatus })}
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>{plan.assignee}</td>
                  <td>{plan.method}</td>
                  <td>{plan.note}</td>
                  <td className="no-print">
                    <button className="btn danger" onClick={() => deletePlan(plan.id)}>
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
