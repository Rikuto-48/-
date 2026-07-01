// 診断タイプの定義
// タイプ名・コピー・説明文は仮データ。正式名称は後日イクマ側で確定する。

export type DiagnosisTypeKey = 'aggressive' | 'steady' | 'flexible' | 'social'

export interface DiagnosisType {
  key: DiagnosisTypeKey
  name: string
  catchCopy: string
  description: string
}

export const DIAGNOSIS_TYPES: Record<DiagnosisTypeKey, DiagnosisType> = {
  aggressive: {
    key: 'aggressive',
    name: 'チャレンジャータイプ',
    catchCopy: '限界を超えて結果を出す',
    description:
      '高い目標に向かって一気に追い込むのが得意なタイプ。短期集中プログラムで結果を出しやすい傾向があります。',
  },
  steady: {
    key: 'steady',
    name: 'コツコツタイプ',
    catchCopy: '習慣の力で着実に変わる',
    description:
      '毎日の積み重ねを大切にするタイプ。無理のないペースで習慣化することで、長期的に成果を出しやすい傾向があります。',
  },
  flexible: {
    key: 'flexible',
    name: 'マイペースタイプ',
    catchCopy: '楽しみながら自分のペースで',
    description:
      '気分やその日のコンディションに合わせて柔軟に取り組みたいタイプ。楽しさを感じられる工夫があると続けやすい傾向があります。',
  },
  social: {
    key: 'social',
    name: '仲間と一緒タイプ',
    catchCopy: '誰かと一緒だから頑張れる',
    description:
      '一人よりも誰かと一緒に取り組むことでモチベーションが上がるタイプ。コミュニティやサポートがあると続けやすい傾向があります。',
  },
}

// 同点時にどちらのタイプを優先するかの順序
export const DIAGNOSIS_TYPE_ORDER: DiagnosisTypeKey[] = [
  'aggressive',
  'steady',
  'flexible',
  'social',
]
