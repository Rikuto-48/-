import type { Database } from '../types'
import { DEFAULT_THRESHOLD_SETS } from '../data/defaultThresholds'

const STORAGE_KEY = 'track-maintenance-db-v1'

function emptyDatabase(): Database {
  return {
    sections: [],
    points: [],
    thresholdSets: DEFAULT_THRESHOLD_SETS,
    plans: [],
  }
}

export function loadDatabase(): Database {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return emptyDatabase()
  try {
    const parsed = JSON.parse(raw) as Partial<Database>
    return {
      sections: parsed.sections ?? [],
      points: parsed.points ?? [],
      thresholdSets: parsed.thresholdSets?.length ? parsed.thresholdSets : DEFAULT_THRESHOLD_SETS,
      plans: parsed.plans ?? [],
    }
  } catch {
    return emptyDatabase()
  }
}

export function saveDatabase(db: Database): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db))
}

export function createId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`
}
