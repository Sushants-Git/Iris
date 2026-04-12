import { useState, useEffect, useCallback } from 'react'
import { standaloneNotesApi } from '@/lib/api-client'
import type { StandaloneNote } from '@/types/worklog'

const LS_KEY = 'iris_standalone_notes'

function loadLocal(): StandaloneNote[] {
  try { return JSON.parse(localStorage.getItem(LS_KEY) ?? '[]') } catch { return [] }
}
function saveLocal(notes: StandaloneNote[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(notes))
}

export function useStandaloneNotes() {
  const [notes, setNotes] = useState<StandaloneNote[]>(loadLocal)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    standaloneNotesApi.list()
      .then((rows) => {
        const hydrated: StandaloneNote[] = rows.map((r) => ({
          id: r.id, title: r.title, content: r.content,
          taskId: r.taskId, createdAt: r.createdAt, updatedAt: r.updatedAt,
        }))
        setNotes(hydrated)
        saveLocal(hydrated)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const addNote = useCallback((note: StandaloneNote) => {
    setNotes((prev) => {
      const next = [note, ...prev]
      saveLocal(next)
      return next
    })
    standaloneNotesApi.create({ id: note.id, title: note.title, content: note.content, taskId: note.taskId, createdAt: note.createdAt }).catch(() => {})
  }, [])

  const updateNote = useCallback((id: string, patch: { title?: string; content?: string; taskId?: string | null }) => {
    setNotes((prev) => {
      const next = prev.map((n) => n.id === id ? { ...n, ...patch, updatedAt: new Date().toISOString() } : n)
      saveLocal(next)
      return next
    })
    standaloneNotesApi.update(id, patch).catch(() => {})
  }, [])

  const removeNote = useCallback((id: string) => {
    setNotes((prev) => {
      const next = prev.filter((n) => n.id !== id)
      saveLocal(next)
      return next
    })
    standaloneNotesApi.delete(id).catch(() => {})
  }, [])

  return { notes, loading, addNote, updateNote, removeNote }
}
