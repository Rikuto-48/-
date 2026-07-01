import { useState } from 'react'
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
  const [shareMessage, setShareMessage] = useState<string | null>(null)

  if (!state?.resultType) {
    return <Navigate to="/diagnosis" replace />
  }

  const type = DIAGNOSIS_TYPES[state.resultType]

  async function handleShare() {
    const diagnosisUrl = `${window.location.origin}/diagnosis`
    const shareText = `私は「${type.name}」タイプでした！\n${type.catchCopy}\n\nあなたのタイプは？→`

    if (navigator.share) {
      try {
        await navigator.share({ title: 'イクマ｜タイプ診断', text: shareText, url: diagnosisUrl })
      } catch {
        // ユーザーがシェアをキャンセルした場合は何もしない
      }
      return
    }

    try {
      await navigator.clipboard.writeText(`${shareText} ${diagnosisUrl}`)
      setShareMessage('コピーしました！ストーリーズなどに貼り付けてシェアしてね')
    } catch {
      setShareMessage('コピーに失敗しました')
    }
  }

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

        <button type="button" className="share-button" onClick={() => void handleShare()}>
          結果をシェアする
        </button>
        {shareMessage && <p className="share-message">{shareMessage}</p>}

        <a className="retry-link" href="/diagnosis">
          もう一度診断する
        </a>

        <a className="back-to-lp-link" href="/">
          トップページに戻る
        </a>
      </div>
    </main>
  )
}

export default ResultPage
