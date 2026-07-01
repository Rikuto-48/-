// コンテンツの投稿ステータス選択肢(仮データ)
export const CONTENT_STATUSES = [
  '未着手',
  '台本作成中',
  '撮影済み',
  '編集済み',
  '投稿済み',
] as const

export type ContentStatus = (typeof CONTENT_STATUSES)[number]
