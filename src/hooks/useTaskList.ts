import { useState, useEffect, useCallback } from 'react'
import { tasksApi } from '@/lib/api-client'
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

export function useTaskList() {
  const [tasks, setTasks] = useState<Task[]>(loadCache)
  const [loading, setLoading] = useState(true)

  // On mount: fetch from DB, migrate any local-only tasks, then use DB as truth
  useEffect(() => {
    let cancelled = false
    async function sync() {
      const local = loadCache()
      try {
        const remote = await tasksApi.list()
        if (cancelled) return

        const remoteIds = new Set(remote.map((t) => t.id))

        // Migrate local-only tasks to DB
        const localOnly = local.filter((t) => !remoteIds.has(t.id))
        for (const t of localOnly) {
          tasksApi.add(t).catch(() => {})
        }

        // Merge: remote + any local-only additions, sorted by createdAt desc
        const merged = [
          ...localOnly,
          ...remote.map((r) => ({
            id: r.id,
            title: r.title,
            tag: (r.tag ?? 'work') as WorkTag,
            url: r.url ?? undefined,
            createdAt: typeof r.createdAt === 'string' ? r.createdAt : new Date(r.createdAt).toISOString(),
          })),
        ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

        setTasks(merged)
        saveCache(merged)
      } catch {
        // DB unavailable — stay with local cache
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    sync()
    return () => { cancelled = true }
  }, [])

  const addTask = useCallback((title: string, tag: WorkTag, url?: string) => {
    const task: Task = {
      id: crypto.randomUUID(),
      title: title.trim(),
      tag,
      url: url?.trim() || undefined,
      createdAt: new Date().toISOString(),
    }
    setTasks((prev) => {
      const next = [task, ...prev]
      saveCache(next)
      return next
    })
    tasksApi.add(task).catch(() => {})
  }, [])

  const removeTask = useCallback((id: string) => {
    setTasks((prev) => {
      const next = prev.filter((t) => t.id !== id)
      saveCache(next)
      return next
    })
    tasksApi.delete(id).catch(() => {})
  }, [])

  return { tasks, loading, addTask, removeTask }
}
