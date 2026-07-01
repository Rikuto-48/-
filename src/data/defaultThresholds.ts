import type { ThresholdSet } from '../types'

// 初期設定のサンプル整備基準値。実際の運用基準（社内規程・線区区分）に
// 合わせて「整備基準値設定」画面から必ず見直して使用すること。
export const DEFAULT_THRESHOLD_SETS: ThresholdSet[] = [
  {
    id: 'default-standard',
    name: '標準（サンプル値）',
    note: '初期設定のサンプル値です。自社の整備基準値に置き換えてください。',
    levels: {
      alignment: { attention: 7, action: 11 },
      longitudinalLevel: { attention: 7, action: 11 },
      crossLevel: { attention: 8, action: 12 },
      gauge: { attention: 10, action: 15 },
      twist: { attention: 9, action: 14 },
    },
  },
  {
    id: 'default-highspeed',
    name: '高速線区（サンプル値）',
    note: '初期設定のサンプル値です。自社の整備基準値に置き換えてください。',
    levels: {
      alignment: { attention: 4, action: 7 },
      longitudinalLevel: { attention: 4, action: 7 },
      crossLevel: { attention: 5, action: 8 },
      gauge: { attention: 6, action: 10 },
      twist: { attention: 5, action: 9 },
    },
  },
]
