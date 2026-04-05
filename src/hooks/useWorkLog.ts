import { useState, useCallback } from 'react'
import type { WorkEntry, WorkTag } from '@/types/worklog'

const KEY = 'iris_worklog'

function load(): WorkEntry[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]')
  } catch {
    return []
  }
}

function persist(entries: WorkEntry[]) {
  localStorage.setItem(KEY, JSON.stringify(entries))
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

export function getActiveMs(entry: WorkEntry): number {
  const totalMs = Date.now() - new Date(entry.startedAt).getTime()
  const currentPauseMs = entry.pausedAt
    ? Date.now() - new Date(entry.pausedAt).getTime()
    : 0
  return totalMs - entry.totalPausedMs - currentPauseMs
}

export function formatDuration(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

export function useWorkLog() {
  const [entries, setEntries] = useState<WorkEntry[]>(load)

  const update = useCallback((next: WorkEntry[]) => {
    setEntries(next)
    persist(next)
  }, [])

  const activeEntry =
    entries.find((e) => e.status === 'active' || e.status === 'paused') ?? null

  function start(title: string, tag: WorkTag) {
    const now = new Date().toISOString()
    // Stop any running entry first
    const stopped = entries.map((e) =>
      e.status === 'active' || e.status === 'paused' ? terminate(e) : e,
    )
    const entry: WorkEntry = {
      id: `wl-${Date.now()}`,
      title,
      tag,
      startedAt: now,
      endedAt: null,
      pausedAt: null,
      totalPausedMs: 0,
      status: 'active',
    }
    update([entry, ...stopped])
  }

  function pause(id: string) {
    update(
      entries.map((e) =>
        e.id === id && e.status === 'active'
          ? { ...e, status: 'paused', pausedAt: new Date().toISOString() }
          : e,
      ),
    )
  }

  function resume(id: string) {
    update(
      entries.map((e) => {
        if (e.id !== id || e.status !== 'paused') return e
        const pausedMs = e.pausedAt
          ? Date.now() - new Date(e.pausedAt).getTime()
          : 0
        return {
          ...e,
          status: 'active',
          pausedAt: null,
          totalPausedMs: e.totalPausedMs + pausedMs,
        }
      }),
    )
  }

  function stop(id: string) {
    update(entries.map((e) => (e.id === id ? terminate(e) : e)))
  }

  function remove(id: string) {
    update(entries.filter((e) => e.id !== id))
  }

  return { entries, activeEntry, start, pause, resume, stop, remove }
}
