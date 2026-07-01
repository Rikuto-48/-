import { Navigate, useLocation } from 'react-router-dom'
import { DIAGNOSIS_TYPES } from '../data/diagnosisTypes'
import type { DiagnosisTypeKey } from '../data/diagnosisTypes'

interface ResultLocationState {
  resultType: DiagnosisTypeKey
}

const LINE_URL = import.meta.env.VITE_LINE_URL || 'https://line.me/'

function ResultPage() {
  const location = useLocation()
  const state = location.state as ResultLocationState | null

  if (!state?.resultType) {
    return <Navigate to="/" replace />
  }

  const type = DIAGNOSIS_TYPES[state.resultType]

  return (
    <main className="page">
      <div className="container">
        <p className="result-eyebrow">診断結果</p>
        <h1 className="result-name">{type.name}</h1>
        <p className="result-catch">{type.catchCopy}</p>
        <p className="result-description">{type.description}</p>

        <a
          className="line-cta"
          href={LINE_URL}
          target="_blank"
          rel="noopener noreferrer"
        >
          LINEで結果の詳細を受け取る
        </a>

        <a className="retry-link" href="/">
          もう一度診断する
        </a>
      </div>
    </main>
  )
}

export default ResultPage
