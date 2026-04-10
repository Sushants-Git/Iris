import { useState, useCallback } from 'react'
import type { Task } from '@/types/worklog'

const TASKS_KEY = 'iris_tasks'

function load(): Task[] {
  try {
    return JSON.parse(localStorage.getItem(TASKS_KEY) ?? '[]')
  } catch {
    return []
  }
}

function save(tasks: Task[]) {
  localStorage.setItem(TASKS_KEY, JSON.stringify(tasks))
}

export function useTaskList() {
  const [tasks, setTasks] = useState<Task[]>(load)

  const addTask = useCallback((title: string, url?: string) => {
    const task: Task = {
      id: crypto.randomUUID(),
      title: title.trim(),
      url: url?.trim() || undefined,
      createdAt: new Date().toISOString(),
    }
    setTasks((prev) => {
      const next = [task, ...prev]
      save(next)
      return next
    })
  }, [])

  const removeTask = useCallback((id: string) => {
    setTasks((prev) => {
      const next = prev.filter((t) => t.id !== id)
      save(next)
      return next
    })
  }, [])

  return { tasks, addTask, removeTask }
}
