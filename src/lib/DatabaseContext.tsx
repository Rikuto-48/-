import { createContext, useContext, useCallback, useMemo, useState, type ReactNode } from 'react'
import type { Database, MaintenancePlan, MeasurementPoint, ThresholdSet, TrackSection } from '../types'
import { createId, loadDatabase, saveDatabase } from './storage'

interface DatabaseContextValue {
  db: Database
  addSection: (section: Omit<TrackSection, 'id' | 'createdAt'>) => TrackSection
  updateSection: (id: string, patch: Partial<Omit<TrackSection, 'id'>>) => void
  deleteSection: (id: string) => void
  upsertPoint: (point: Omit<MeasurementPoint, 'id'> & { id?: string }) => MeasurementPoint
  deletePoint: (id: string) => void
  addThresholdSet: (set: Omit<ThresholdSet, 'id'>) => ThresholdSet
  updateThresholdSet: (id: string, patch: Partial<Omit<ThresholdSet, 'id'>>) => void
  deleteThresholdSet: (id: string) => void
  upsertPlan: (plan: Omit<MaintenancePlan, 'id' | 'updatedAt'> & { id?: string }) => MaintenancePlan
  deletePlan: (id: string) => void
}

const DatabaseContext = createContext<DatabaseContextValue | null>(null)

export function DatabaseProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<Database>(() => loadDatabase())

  const addSection = useCallback(
    (section: Omit<TrackSection, 'id' | 'createdAt'>) => {
      const newSection: TrackSection = { ...section, id: createId(), createdAt: new Date().toISOString() }
      setDb((prev) => {
        const next = { ...prev, sections: [...prev.sections, newSection] }
        saveDatabase(next)
        return next
      })
      return newSection
    },
    [],
  )

  const updateSection = useCallback((id: string, patch: Partial<Omit<TrackSection, 'id'>>) => {
    setDb((prev) => {
      const next = {
        ...prev,
        sections: prev.sections.map((s) => (s.id === id ? { ...s, ...patch } : s)),
      }
      saveDatabase(next)
      return next
    })
  }, [])

  const deleteSection = useCallback((id: string) => {
    setDb((prev) => {
      const next = {
        ...prev,
        sections: prev.sections.filter((s) => s.id !== id),
        points: prev.points.filter((p) => p.sectionId !== id),
        plans: prev.plans.filter((p) => p.sectionId !== id),
      }
      saveDatabase(next)
      return next
    })
  }, [])

  const upsertPoint = useCallback((point: Omit<MeasurementPoint, 'id'> & { id?: string }) => {
    const saved: MeasurementPoint = { ...point, id: point.id ?? createId() }
    setDb((prev) => {
      const exists = prev.points.some((p) => p.id === saved.id)
      const next = {
        ...prev,
        points: exists ? prev.points.map((p) => (p.id === saved.id ? saved : p)) : [...prev.points, saved],
      }
      saveDatabase(next)
      return next
    })
    return saved
  }, [])

  const deletePoint = useCallback((id: string) => {
    setDb((prev) => {
      const next = { ...prev, points: prev.points.filter((p) => p.id !== id) }
      saveDatabase(next)
      return next
    })
  }, [])

  const addThresholdSet = useCallback((set: Omit<ThresholdSet, 'id'>) => {
    const newSet: ThresholdSet = { ...set, id: createId() }
    setDb((prev) => {
      const next = { ...prev, thresholdSets: [...prev.thresholdSets, newSet] }
      saveDatabase(next)
      return next
    })
    return newSet
  }, [])

  const updateThresholdSet = useCallback((id: string, patch: Partial<Omit<ThresholdSet, 'id'>>) => {
    setDb((prev) => {
      const next = {
        ...prev,
        thresholdSets: prev.thresholdSets.map((s) => (s.id === id ? { ...s, ...patch } : s)),
      }
      saveDatabase(next)
      return next
    })
  }, [])

  const deleteThresholdSet = useCallback((id: string) => {
    setDb((prev) => {
      if (prev.thresholdSets.length <= 1) return prev
      const stillUsed = prev.sections.some((s) => s.thresholdSetId === id)
      if (stillUsed) return prev
      const next = { ...prev, thresholdSets: prev.thresholdSets.filter((s) => s.id !== id) }
      saveDatabase(next)
      return next
    })
  }, [])

  const upsertPlan = useCallback((plan: Omit<MaintenancePlan, 'id' | 'updatedAt'> & { id?: string }) => {
    const saved: MaintenancePlan = { ...plan, id: plan.id ?? createId(), updatedAt: new Date().toISOString() }
    setDb((prev) => {
      const exists = prev.plans.some((p) => p.id === saved.id)
      const next = {
        ...prev,
        plans: exists ? prev.plans.map((p) => (p.id === saved.id ? saved : p)) : [...prev.plans, saved],
      }
      saveDatabase(next)
      return next
    })
    return saved
  }, [])

  const deletePlan = useCallback((id: string) => {
    setDb((prev) => {
      const next = { ...prev, plans: prev.plans.filter((p) => p.id !== id) }
      saveDatabase(next)
      return next
    })
  }, [])

  const value = useMemo<DatabaseContextValue>(
    () => ({
      db,
      addSection,
      updateSection,
      deleteSection,
      upsertPoint,
      deletePoint,
      addThresholdSet,
      updateThresholdSet,
      deleteThresholdSet,
      upsertPlan,
      deletePlan,
    }),
    [
      db,
      addSection,
      updateSection,
      deleteSection,
      upsertPoint,
      deletePoint,
      addThresholdSet,
      updateThresholdSet,
      deleteThresholdSet,
      upsertPlan,
      deletePlan,
    ],
  )

  return <DatabaseContext.Provider value={value}>{children}</DatabaseContext.Provider>
}

export function useDatabase(): DatabaseContextValue {
  const ctx = useContext(DatabaseContext)
  if (!ctx) throw new Error('useDatabase must be used within DatabaseProvider')
  return ctx
}
