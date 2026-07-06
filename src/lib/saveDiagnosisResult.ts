import { supabase } from './supabaseClient'
import { getTrafficSource } from './trafficSource'
import type { DiagnosisTypeKey } from '../data/diagnosisTypes'

export interface DiagnosisAnswerRecord {
  questionId: string
  choiceId: string
}

// diagnosis_resultsテーブルへ保存する。保存に失敗しても診断結果の表示は妨げないよう、
// 呼び出し側はこの関数の成否に関わらず結果画面へ遷移してよい。
export async function saveDiagnosisResult(
  answers: DiagnosisAnswerRecord[],
  resultType: DiagnosisTypeKey,
): Promise<void> {
  if (!supabase) {
    return
  }

  const { error } = await supabase.from('diagnosis_results').insert({
    answers,
    result_type: resultType,
    source: getTrafficSource(),
  })

  if (error) {
    console.error('診断結果の保存に失敗しました', error)
  }
}
