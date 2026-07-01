import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ProgressBar from '../components/ProgressBar'
import { DIAGNOSIS_QUESTIONS, calculateDiagnosisType } from '../data/questions'
import type { DiagnosisChoice } from '../data/questions'
import { saveDiagnosisResult } from '../lib/saveDiagnosisResult'

function DiagnosisPage() {
  const navigate = useNavigate()
  const [questionIndex, setQuestionIndex] = useState(0)
  const [selectedChoices, setSelectedChoices] = useState<DiagnosisChoice[]>([])

  const totalQuestions = DIAGNOSIS_QUESTIONS.length
  const currentQuestion = DIAGNOSIS_QUESTIONS[questionIndex]

  function handleSelect(choice: DiagnosisChoice) {
    const nextChoices = [...selectedChoices, choice]

    if (questionIndex < totalQuestions - 1) {
      setSelectedChoices(nextChoices)
      setQuestionIndex(questionIndex + 1)
      return
    }

    const resultType = calculateDiagnosisType(nextChoices)

    // 保存は非同期・ベストエフォートで行い、結果表示をブロックしない
    void saveDiagnosisResult(
      nextChoices.map((c, i) => ({
        questionId: DIAGNOSIS_QUESTIONS[i].id,
        choiceId: c.id,
      })),
      resultType,
    )

    navigate('/result', { state: { resultType } })
  }

  return (
    <main className="page">
      <div className="container">
        <ProgressBar current={questionIndex + 1} total={totalQuestions} />

        <h1 className="question-text">{currentQuestion.text}</h1>

        <div className="choice-list">
          {currentQuestion.choices.map((choice) => (
            <button
              key={choice.id}
              type="button"
              className="choice-button"
              onClick={() => handleSelect(choice)}
            >
              {choice.label}
            </button>
          ))}
        </div>
      </div>
    </main>
  )
}

export default DiagnosisPage
