// 軌道狂いの種別
export type IrregularityType =
  | 'alignment' // 通り狂い
  | 'longitudinalLevel' // 高低狂い
  | 'crossLevel' // 水準狂い
  | 'gauge' // 軌間狂い
  | 'twist' // 平面性狂い

export const IRREGULARITY_LABELS: Record<IrregularityType, string> = {
  alignment: '通り狂い',
  longitudinalLevel: '高低狂い',
  crossLevel: '水準狂い',
  gauge: '軌間狂い',
  twist: '平面性狂い',
}

export const IRREGULARITY_TYPES: IrregularityType[] = [
  'alignment',
  'longitudinalLevel',
  'crossLevel',
  'gauge',
  'twist',
]

export type Judgement = 'good' | 'attention' | 'action'

export const JUDGEMENT_LABELS: Record<Judgement, string> = {
  good: '良好',
  attention: '要注意',
  action: '要整備',
}

// 整備基準値（種別ごとの注意値・整備値、単位mm）
export interface ThresholdLevel {
  attention: number
  action: number
}

export interface ThresholdSet {
  id: string
  name: string
  note: string
  levels: Record<IrregularityType, ThresholdLevel>
}

// 測定区間（線名・キロ程などで特定される区間）
export interface TrackSection {
  id: string
  lineName: string
  direction: string
  startKp: string
  endKp: string
  thresholdSetId: string
  memo: string
  createdAt: string
}

// 測定点（区間内の1測点における狂い測定値）
export interface MeasurementPoint {
  id: string
  sectionId: string
  distance: number // 区間起点からの距離(m)
  values: Partial<Record<IrregularityType, number>> // mm
  memo: string
}

export type PlanStatus = '未着手' | '計画中' | '実施済み'

// 整備計画・記録
export interface MaintenancePlan {
  id: string
  sectionId: string
  irregularityType: IrregularityType
  plannedDate: string
  status: PlanStatus
  assignee: string
  method: string
  note: string
  updatedAt: string
}

export interface Database {
  sections: TrackSection[]
  points: MeasurementPoint[]
  thresholdSets: ThresholdSet[]
  plans: MaintenancePlan[]
}
