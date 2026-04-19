import { useState, useEffect, useCallback } from 'react'
import { tasksApi, type UpdateTaskPayload } from '@/lib/api-client'
import type { Task, WorkTag } from '@/types/worklog'

// ── Module-level shared store ────────────────────────────────────────────────
// Tasks are the DB's source of truth. We keep an in-memory mirror so mutations
// from one component (e.g. AIParseModal via Canvas) propagate to all readers
// (e.g. WorkLogPanel) without a refetch. No localStorage persistence.

let storeTasks: Task[] = []
let storeLoading = true
let storeLoaded = false
const listeners = new Set<() => void>()

function emit() {
  listeners.forEach((l) => l())
}

function setStoreTasks(next: Task[] | ((prev: Task[]) => Task[])) {
  storeTasks = typeof next === 'function' ? (next as (p: Task[]) => Task[])(storeTasks) : next
  emit()
}

function setStoreLoading(v: boolean) {
  storeLoading = v
  emit()
}

async function loadFromRemote() {
  if (storeLoaded) return
  storeLoaded = true
  try {
    const remote = await tasksApi.list()
    const tasks: Task[] = remote
      .map((r) => ({
        id: r.id,
        title: r.title,
        tag: (r.tag ?? 'work') as WorkTag,
        url: r.url ?? undefined,
        details: r.details ?? undefined,
        references: r.references ?? [],
        createdAt: typeof r.createdAt === 'string' ? r.createdAt : new Date(r.createdAt).toISOString(),
      }))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    setStoreTasks(tasks)
  } catch {
    // DB unavailable — leave store empty; caller sees loading=false with 0 tasks
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
  tasksApi
    .add({
      id: task.id,
      title: task.title,
      tag: task.tag,
      url: task.url,
      details: task.details ?? null,
      references: task.references,
      createdAt: task.createdAt,
    })
    .catch(() => {
      setStoreTasks((prev) => prev.filter((t) => t.id !== task.id))
    })
}

function removeTaskStore(id: string) {
  const prev = storeTasks
  setStoreTasks((ts) => ts.filter((t) => t.id !== id))
  tasksApi.delete(id).catch(() => {
    setStoreTasks(prev)
  })
}

function updateTaskStore(id: string, patch: UpdateTaskPayload) {
  const prev = storeTasks
  setStoreTasks((ts) =>
    ts.map((t) => {
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
  tasksApi.update(id, patch).catch(() => {
    setStoreTasks(prev)
  })
}

export function useTaskList() {
  const [, setTick] = useState(0)

  useEffect(() => {
    const listener = () => setTick((n) => n + 1)
    listeners.add(listener)
    loadFromRemote()
    return () => { listeners.delete(listener) }
  }, [])

  const addTask = useCallback(addTaskStore, [])
  const removeTask = useCallback(removeTaskStore, [])
  const updateTask = useCallback(updateTaskStore, [])

  return { tasks: storeTasks, loading: storeLoading, addTask, removeTask, updateTask }
}
