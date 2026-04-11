import { useState, useEffect, useCallback } from 'react'
import { workLogApi } from '@/lib/api-client'
import type { WorkEntry, WorkTag } from '@/types/worklog'

// Active/paused sessions live here (localStorage only)
const ACTIVE_KEY = 'iris_worklog_active'
// Legacy key (old format — all entries in one array) — migrated on first load
const LEGACY_KEY = 'iris_worklog'

// ── localStorage helpers ───────────────────────────────────────────────────────

function loadActive(): WorkEntry | null {
  try {
    const str = localStorage.getItem(ACTIVE_KEY)
    if (str) return JSON.parse(str)
  } catch {}
  return null
}

function saveActive(entry: WorkEntry | null) {
  if (entry) localStorage.setItem(ACTIVE_KEY, JSON.stringify(entry))
  else localStorage.removeItem(ACTIVE_KEY)
}

function loadAndClearLegacy(): WorkEntry[] {
  try {
    const str = localStorage.getItem(LEGACY_KEY)
    if (!str) return []
    const all = JSON.parse(str) as WorkEntry[]
    // Pull active entry from legacy into new key (if not already there)
    const active = all.find((e) => e.status === 'active' || e.status === 'paused')
    if (active && !localStorage.getItem(ACTIVE_KEY)) saveActive(active)
    localStorage.removeItem(LEGACY_KEY)
    return all.filter((e) => e.status === 'done')
  } catch {}
  return []
}

// ── Math helpers ───────────────────────────────────────────────────────────────

export function getActiveMs(entry: WorkEntry): number {
  const totalMs = Date.now() - new Date(entry.startedAt).getTime()
  const currentPauseMs = entry.pausedAt
    ? Date.now() - new Date(entry.pausedAt).getTime()
    : 0
  return Math.max(0, totalMs - entry.totalPausedMs - currentPauseMs)
}

export function formatDuration(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

function terminate(e: WorkEntry): WorkEntry {
  const extraPausedMs = e.pausedAt
    ? Date.now() - new Date(e.pausedAt).getTime()
    : 0
  return {
    ...e,
    status: 'done',
    endedAt: new Date().toISOString(),
    pausedAt: null,
    totalPausedMs: e.totalPausedMs + extraPausedMs,
  }
}

// ── Hook ───────────────────────────────────────────────────────────────────────

export function useWorkLog() {
  const [activeEntry, setActiveEntry] = useState<WorkEntry | null>(loadActive)
  const [doneEntries, setDoneEntries] = useState<WorkEntry[]>([])
  const [loading, setLoading] = useState(true)

  // On mount: migrate legacy data → DB, then fetch done entries from DB
  useEffect(() => {
    async function init() {
      const legacyDone = loadAndClearLegacy()

      // Upload legacy done entries to DB (idempotent — server does onConflictDoUpdate)
      if (legacyDone.length > 0) {
        await Promise.allSettled(legacyDone.map((e) => workLogApi.save({
          id: e.id,
          title: e.title,
          tag: e.tag,
          startedAt: e.startedAt,
          endedAt: e.endedAt,
          totalPausedMs: e.totalPausedMs,
        })))
      }

      try {
        const rows = await workLogApi.list()
        // API returns timestamps as strings (JSON serialized)
        setDoneEntries(rows.map((r) => ({
          id: r.id,
          title: r.title,
          tag: r.tag as WorkTag,
          startedAt: r.startedAt,
          endedAt: r.endedAt,
          pausedAt: null,
          totalPausedMs: r.totalPausedMs,
          notes: r.notes ?? undefined,
          status: 'done' as const,
        })))
      } catch {}
      setLoading(false)
    }
    init()
  }, [])


  const start = useCallback((title: string, tag: WorkTag) => {
    // Read current active from localStorage (always in sync) — avoids nesting
    // setState calls which React StrictMode would double-invoke
    const prev = loadActive()
    if (prev) {
      const done = terminate(prev)
      setDoneEntries((d) => [done, ...d])
      workLogApi.save({ id: done.id, title: done.title, tag: done.tag, startedAt: done.startedAt, endedAt: done.endedAt, totalPausedMs: done.totalPausedMs }).catch(() => {})
    }
    const entry: WorkEntry = {
      id: `wl-${Date.now()}`,
      title,
      tag,
      startedAt: new Date().toISOString(),
      endedAt: null,
      pausedAt: null,
      totalPausedMs: 0,
      status: 'active',
    }
    saveActive(entry)
    setActiveEntry(entry)
  }, [])

  const pause = useCallback((id: string) => {
    setActiveEntry((prev) => {
      if (!prev || prev.id !== id || prev.status !== 'active') return prev
      const updated: WorkEntry = { ...prev, status: 'paused', pausedAt: new Date().toISOString() }
      saveActive(updated)
      return updated
    })
  }, [])

  const resume = useCallback((id: string) => {
    setActiveEntry((prev) => {
      if (!prev || prev.id !== id || prev.status !== 'paused') return prev
      const pausedMs = prev.pausedAt ? Date.now() - new Date(prev.pausedAt).getTime() : 0
      const updated: WorkEntry = {
        ...prev,
        status: 'active',
        pausedAt: null,
        totalPausedMs: prev.totalPausedMs + pausedMs,
      }
      saveActive(updated)
      return updated
    })
  }, [])

  const stop = useCallback((id: string) => {
    const prev = loadActive()
    if (!prev || prev.id !== id) return
    const done = terminate(prev)
    saveActive(null)
    setActiveEntry(null)
    setDoneEntries((d) => [done, ...d])
    workLogApi.save({
      id: done.id,
      title: done.title,
      tag: done.tag,
      startedAt: done.startedAt,
      endedAt: done.endedAt,
      totalPausedMs: done.totalPausedMs,
    }).catch(() => {})
  }, [])

  const remove = useCallback((id: string) => {
    setDoneEntries((d) => d.filter((e) => e.id !== id))
    workLogApi.delete(id).catch(() => {})
  }, [])

  const updateNotes = useCallback((id: string, notes: string) => {
    setActiveEntry((prev) => {
      if (prev && prev.id === id) {
        const updated = { ...prev, notes }
        saveActive(updated)
        return updated
      }
      return prev
    })
    setDoneEntries((d) => d.map((e) => e.id === id ? { ...e, notes } : e))
    workLogApi.saveNotes(id, notes).catch(() => {})
  }, [])

  const entries: WorkEntry[] = activeEntry
    ? [activeEntry, ...doneEntries]
    : doneEntries

  return { entries, activeEntry, loading, start, pause, resume, stop, remove, updateNotes }
}
