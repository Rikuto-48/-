import { DIAGNOSIS_TYPE_ORDER, type DiagnosisTypeKey } from './diagnosisTypes'

export interface DiagnosisChoice {
  id: string
  label: string
  type: DiagnosisTypeKey
}

export interface DiagnosisQuestion {
  id: string
  text: string
  choices: DiagnosisChoice[]
}

// 5問診断の設問データ。各選択肢は4タイプのいずれかに対応する。
export const DIAGNOSIS_QUESTIONS: DiagnosisQuestion[] = [
  {
    id: 'q1',
    text: '運動を始める目的は？',
    choices: [
      { id: 'q1-a', label: '短期間で結果を出したい', type: 'aggressive' },
      { id: 'q1-b', label: '健康的な生活習慣を作りたい', type: 'steady' },
      { id: 'q1-c', label: '楽しく体を動かしたい', type: 'flexible' },
      { id: 'q1-d', label: '誰かと一緒に頑張りたい', type: 'social' },
    ],
  },
  {
    id: 'q2',
    text: '普段の運動頻度についての理想は？',
    choices: [
      { id: 'q2-a', label: '毎日でもガンガンやりたい', type: 'aggressive' },
      { id: 'q2-b', label: '決まった曜日に淡々と続けたい', type: 'steady' },
      { id: 'q2-c', label: '気分が乗った時にやりたい', type: 'flexible' },
      { id: 'q2-d', label: '友達と予定を合わせてやりたい', type: 'social' },
    ],
  },
  {
    id: 'q3',
    text: '挫折しそうになった時、どうする？',
    choices: [
      { id: 'q3-a', label: '目標を思い出して踏ん張る', type: 'aggressive' },
      { id: 'q3-b', label: '習慣にして惰性でも続ける', type: 'steady' },
      { id: 'q3-c', label: '一旦休んで気が向いたら再開する', type: 'flexible' },
      { id: 'q3-d', label: '誰かに励ましてもらう', type: 'social' },
    ],
  },
  {
    id: 'q4',
    text: 'トレーニングで重視したいことは？',
    choices: [
      { id: 'q4-a', label: '追い込んで限界を超える達成感', type: 'aggressive' },
      { id: 'q4-b', label: '記録をコツコツ積み上げる安心感', type: 'steady' },
      { id: 'q4-c', label: '気軽に楽しめる自由さ', type: 'flexible' },
      { id: 'q4-d', label: '仲間と盛り上がる一体感', type: 'social' },
    ],
  },
  {
    id: 'q5',
    text: '理想の7日間チャレンジのイメージは？',
    choices: [
      { id: 'q5-a', label: '毎日全力でやりきる', type: 'aggressive' },
      { id: 'q5-b', label: '無理せず毎日少しずつ', type: 'steady' },
      { id: 'q5-c', label: 'できる日にできる範囲で', type: 'flexible' },
      { id: 'q5-d', label: '仲間と進捗を報告し合う', type: 'social' },
    ],
  },
]

// 選ばれた選択肢からスコアを集計し、最も多いタイプを診断結果として返す
export function calculateDiagnosisType(
  selectedChoices: DiagnosisChoice[],
): DiagnosisTypeKey {
  const scores: Record<DiagnosisTypeKey, number> = {
    aggressive: 0,
    steady: 0,
    flexible: 0,
    social: 0,
  }

  for (const choice of selectedChoices) {
    scores[choice.type] += 1
  }

  return DIAGNOSIS_TYPE_ORDER.reduce((best, key) =>
    scores[key] > scores[best] ? key : best,
  )
}
