import type { IrregularityType, Judgement, MeasurementPoint, ThresholdSet } from '../types'
import { IRREGULARITY_TYPES } from '../types'

export function judgeValue(value: number, thresholdSet: ThresholdSet, type: IrregularityType): Judgement {
  const level = thresholdSet.levels[type]
  const abs = Math.abs(value)
  if (abs >= level.action) return 'action'
  if (abs >= level.attention) return 'attention'
  return 'good'
}

export function worstJudgement(judgements: Judgement[]): Judgement {
  if (judgements.includes('action')) return 'action'
  if (judgements.includes('attention')) return 'attention'
  return 'good'
}

export interface PointJudgement {
  point: MeasurementPoint
  judgements: Partial<Record<IrregularityType, Judgement>>
  worst: Judgement
}

export function judgePoints(points: MeasurementPoint[], thresholdSet: ThresholdSet): PointJudgement[] {
  return points
    .slice()
    .sort((a, b) => a.distance - b.distance)
    .map((point) => {
      const judgements: Partial<Record<IrregularityType, Judgement>> = {}
      for (const type of IRREGULARITY_TYPES) {
        const value = point.values[type]
        if (value === undefined || Number.isNaN(value)) continue
        judgements[type] = judgeValue(value, thresholdSet, type)
      }
      return {
        point,
        judgements,
        worst: worstJudgement(Object.values(judgements) as Judgement[]),
      }
    })
}

export function standardDeviation(values: number[]): number | null {
  if (values.length === 0) return null
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length
  return Math.sqrt(variance)
}

export interface SectionStats {
  type: IrregularityType
  count: number
  mean: number | null
  stdDev: number | null
  max: number | null
}

export function computeSectionStats(points: MeasurementPoint[]): SectionStats[] {
  return IRREGULARITY_TYPES.map((type) => {
    const values = points
      .map((p) => p.values[type])
      .filter((v): v is number => v !== undefined && !Number.isNaN(v))
    const mean = values.length ? values.reduce((sum, v) => sum + v, 0) / values.length : null
    const max = values.length ? Math.max(...values.map((v) => Math.abs(v))) : null
    return {
      type,
      count: values.length,
      mean,
      stdDev: standardDeviation(values),
      max,
    }
  })
}
