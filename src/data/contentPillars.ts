// コンテンツピラー(企画の型)の定義
// 100本リール企画をどの型で作るかを分類し、後で型ごとの実績を比較できるようにする。
export const CONTENT_PILLARS = [
  '共感ストーリー系',
  '参加型診断系',
  '知識系',
  '属人性',
  '実績/お客様の声',
] as const

export type ContentPillar = (typeof CONTENT_PILLARS)[number]
