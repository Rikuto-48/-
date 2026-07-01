// 見込み客の進捗ステータス選択肢(仮データ。運用しながら見直す想定)
export const LEAD_STATUSES = [
  '未登録',
  'LINE登録済み',
  'チャレンジ中',
  '成約',
  '離脱',
] as const

export type LeadStatus = (typeof LEAD_STATUSES)[number]
