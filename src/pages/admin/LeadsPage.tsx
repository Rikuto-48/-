import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { DIAGNOSIS_TYPE_ORDER, DIAGNOSIS_TYPES } from '../../data/diagnosisTypes'
import type { DiagnosisTypeKey } from '../../data/diagnosisTypes'
import { LEAD_STATUSES } from '../../data/leadStatuses'

interface Lead {
  id: string
  name: string
  diagnosis_type: string | null
  line_registered_at: string | null
  status: string
  challenge_progress: boolean[]
  created_at: string
}

const CHALLENGE_DAYS = [1, 2, 3, 4, 5, 6, 7]

function diagnosisTypeLabel(type: string | null) {
  if (!type) return '-'
  return DIAGNOSIS_TYPES[type as DiagnosisTypeKey]?.name ?? type
}

function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [diagnosisType, setDiagnosisType] = useState('')
  const [lineRegisteredAt, setLineRegisteredAt] = useState('')

  async function fetchLeads() {
    if (!supabase) {
      setLoading(false)
      return
    }

    setLoading(true)
    const { data, error: fetchError } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false })

    if (fetchError) {
      setError('見込み客一覧の取得に失敗しました')
    } else {
      setLeads(data as Lead[])
    }
    setLoading(false)
  }

  useEffect(() => {
    void fetchLeads()
  }, [])

  async function handleAdd(e: FormEvent) {
    e.preventDefault()
    if (!supabase || !name) return

    const { error: insertError } = await supabase.from('leads').insert({
      name,
      diagnosis_type: diagnosisType || null,
      line_registered_at: lineRegisteredAt || null,
    })

    if (insertError) {
      setError('見込み客の追加に失敗しました')
      return
    }

    setName('')
    setDiagnosisType('')
    setLineRegisteredAt('')
    void fetchLeads()
  }

  async function handleStatusChange(lead: Lead, status: string) {
    if (!supabase) return
    setLeads((prev) => prev.map((l) => (l.id === lead.id ? { ...l, status } : l)))
    await supabase.from('leads').update({ status }).eq('id', lead.id)
  }

  async function handleToggleDay(lead: Lead, dayIndex: number) {
    if (!supabase) return
    const nextProgress = [...lead.challenge_progress]
    nextProgress[dayIndex] = !nextProgress[dayIndex]
    setLeads((prev) =>
      prev.map((l) => (l.id === lead.id ? { ...l, challenge_progress: nextProgress } : l)),
    )
    await supabase.from('leads').update({ challenge_progress: nextProgress }).eq('id', lead.id)
  }

  return (
    <div>
      <h1 className="admin-title">見込み客管理</h1>

      <form className="admin-form admin-form-inline" onSubmit={handleAdd}>
        <input
          placeholder="お名前 / LINE表示名"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <select value={diagnosisType} onChange={(e) => setDiagnosisType(e.target.value)}>
          <option value="">診断タイプ未設定</option>
          {DIAGNOSIS_TYPE_ORDER.map((key) => (
            <option key={key} value={key}>
              {DIAGNOSIS_TYPES[key].name}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={lineRegisteredAt}
          onChange={(e) => setLineRegisteredAt(e.target.value)}
        />
        <button type="submit" className="primary-button">
          追加
        </button>
      </form>

      {error && <p className="form-error">{error}</p>}

      {loading ? (
        <p>読み込み中...</p>
      ) : (
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>お名前</th>
                <th>診断タイプ</th>
                <th>LINE登録日</th>
                <th>ステータス</th>
                <th>7日間チャレンジ</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id}>
                  <td>{lead.name}</td>
                  <td>{diagnosisTypeLabel(lead.diagnosis_type)}</td>
                  <td>{lead.line_registered_at ?? '-'}</td>
                  <td>
                    <select
                      value={lead.status}
                      onChange={(e) => handleStatusChange(lead, e.target.value)}
                    >
                      {LEAD_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <div className="challenge-days">
                      {CHALLENGE_DAYS.map((day, index) => (
                        <button
                          key={day}
                          type="button"
                          className={`day-dot ${lead.challenge_progress[index] ? 'done' : ''}`}
                          onClick={() => handleToggleDay(lead, index)}
                          aria-label={`${day}日目`}
                          aria-pressed={lead.challenge_progress[index]}
                        >
                          {day}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
              {leads.length === 0 && (
                <tr>
                  <td colSpan={5}>まだ登録がありません</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default LeadsPage
