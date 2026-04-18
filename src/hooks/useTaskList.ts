import { useState, useEffect, useCallback } from 'react'
import { tasksApi, type UpdateTaskPayload } from '@/lib/api-client'
import type { Task, WorkTag } from '@/types/worklog'

const CACHE_KEY = 'iris_tasks'

function loadCache(): Task[] {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) ?? '[]')
  } catch {
    return []
  }
}

function saveCache(tasks: Task[]) {
  localStorage.setItem(CACHE_KEY, JSON.stringify(tasks))
}

// ── Module-level shared store ────────────────────────────────────────────────
// All useTaskList() callers subscribe to the same tasks array so mutations
// from one component (e.g. AIParseModal via Canvas) propagate to all readers
// (e.g. WorkLogPanel) without a refresh.

let storeTasks: Task[] = loadCache()
let storeLoading = true
let storeSynced = false
const listeners = new Set<() => void>()

function setStoreTasks(next: Task[] | ((prev: Task[]) => Task[])) {
  storeTasks = typeof next === 'function' ? (next as (p: Task[]) => Task[])(storeTasks) : next
  saveCache(storeTasks)
  listeners.forEach((l) => l())
}

function setStoreLoading(v: boolean) {
  storeLoading = v
  listeners.forEach((l) => l())
}

async function syncFromRemote() {
  if (storeSynced) return
  storeSynced = true
  try {
    const local = loadCache()
    const remote = await tasksApi.list()
    const remoteIds = new Set(remote.map((t) => t.id))
    const localOnly = local.filter((t) => !remoteIds.has(t.id))
    for (const t of localOnly) tasksApi.add(t).catch(() => {})
    const merged = [
      ...localOnly,
      ...remote.map((r) => ({
        id: r.id,
        title: r.title,
        tag: (r.tag ?? 'work') as WorkTag,
        url: r.url ?? undefined,
        details: r.details ?? undefined,
        references: r.references ?? [],
        createdAt: typeof r.createdAt === 'string' ? r.createdAt : new Date(r.createdAt).toISOString(),
      })),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    setStoreTasks(merged)
  } catch {
    // DB unavailable — stay with local cache
  } finally {
    setStoreLoading(false)
  }
}

function addTaskStore(
  title: string,
  tag: WorkTag,
  url?: string,
  extra?: { details?: string; references?: { title: string; url: string }[] },
) {
  const task: Task = {
    id: crypto.randomUUID(),
    title: title.trim(),
    tag,
    url: url?.trim() || undefined,
    details: extra?.details?.trim() || undefined,
    references: extra?.references ?? [],
    createdAt: new Date().toISOString(),
  }
  setStoreTasks((prev) => [task, ...prev])
  tasksApi.add({
    id: task.id,
    title: task.title,
    tag: task.tag,
    url: task.url,
    details: task.details ?? null,
    references: task.references,
    createdAt: task.createdAt,
  }).catch(() => {})
}

function removeTaskStore(id: string) {
  setStoreTasks((prev) => prev.filter((t) => t.id !== id))
  tasksApi.delete(id).catch(() => {})
}

function updateTaskStore(id: string, patch: UpdateTaskPayload) {
  setStoreTasks((prev) =>
    prev.map((t) => {
      if (t.id !== id) return t
      return {
        ...t,
        ...(patch.title !== undefined ? { title: patch.title } : {}),
        ...(patch.tag !== undefined ? { tag: patch.tag } : {}),
        ...(patch.url !== undefined ? { url: patch.url ?? undefined } : {}),
        ...(patch.details !== undefined ? { details: patch.details ?? undefined } : {}),
        ...(patch.references !== undefined ? { references: patch.references } : {}),
      }
    }),
  )
  tasksApi.update(id, patch).catch(() => {})
}

export function useTaskList() {
  const [, setTick] = useState(0)

  useEffect(() => {
    const listener = () => setTick((n) => n + 1)
    listeners.add(listener)
    syncFromRemote()
    return () => { listeners.delete(listener) }
  }, [])

  const addTask = useCallback(addTaskStore, [])
  const removeTask = useCallback(removeTaskStore, [])
  const updateTask = useCallback(updateTaskStore, [])

  return { tasks: storeTasks, loading: storeLoading, addTask, removeTask, updateTask }
}
