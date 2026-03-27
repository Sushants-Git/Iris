import { useCallback, useEffect, useRef, useState } from 'react'
import type { Item } from '@/types'
import type { CreateItemPayload, UpdateItemPayload } from '@/lib/api-client'

type HistoryEntry =
  | { type: 'create'; item: Item }
  | { type: 'delete'; item: Item }
  | { type: 'update'; id: string; before: UpdateItemPayload; after: UpdateItemPayload }

export interface RawActions {
  create: (payload: CreateItemPayload, onSuccess?: (item: Item) => void) => void
  update: (id: string, payload: UpdateItemPayload) => void
  delete: (id: string) => void
}

export function useHistory(raw: RawActions, items: Item[]) {
  const past = useRef<HistoryEntry[]>([])
  const future = useRef<HistoryEntry[]>([])
  const [, tick] = useState(0)
  const rawRef = useRef(raw)
  rawRef.current = raw
  const itemsRef = useRef(items)
  itemsRef.current = items

  // Stable state setter — triggers re-render so consumers see updated canUndo/canRedo
  const sync = useCallback(() => tick((n) => n + 1), [])

  function push(entry: HistoryEntry) {
    past.current = [...past.current, entry]
    future.current = []
    sync()
  }

  // ── Wrapped handlers (use these in place of raw mutations) ──────────────────
  const handleCreate = useCallback((payload: CreateItemPayload) => {
    rawRef.current.create(payload, (item) => push({ type: 'create', item }))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleUpdate = useCallback((id: string, payload: UpdateItemPayload) => {
    const item = itemsRef.current.find((i) => i.id === id)
    if (item) {
      const before = {} as UpdateItemPayload
      for (const key of Object.keys(payload) as (keyof UpdateItemPayload)[]) {
        ;(before as Record<string, unknown>)[key] = (item as unknown as Record<string, unknown>)[key]
      }
      push({ type: 'update', id, before, after: payload })
    }
    rawRef.current.update(id, payload)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleDelete = useCallback((id: string) => {
    const item = itemsRef.current.find((i) => i.id === id)
    if (item) push({ type: 'delete', item })
    rawRef.current.delete(id)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Undo ────────────────────────────────────────────────────────────────────
  const undo = useCallback(() => {
    const entry = past.current[past.current.length - 1]
    if (!entry) return
    past.current = past.current.slice(0, -1)

    if (entry.type === 'create') {
      future.current = [...future.current, entry]
      sync()
      rawRef.current.delete(entry.item.id)
    } else if (entry.type === 'delete') {
      sync()
      const { id: _id, boardId: _b, createdAt: _c, updatedAt: _u, ...payload } = entry.item
      rawRef.current.create(payload as CreateItemPayload, (newItem) => {
        future.current = [...future.current, { type: 'delete', item: newItem }]
        sync()
      })
    } else {
      future.current = [...future.current, entry]
      sync()
      rawRef.current.update(entry.id, entry.before)
    }
  }, [sync])

  // ── Redo ────────────────────────────────────────────────────────────────────
  const redo = useCallback(() => {
    const entry = future.current[future.current.length - 1]
    if (!entry) return
    future.current = future.current.slice(0, -1)

    if (entry.type === 'create') {
      sync()
      const { id: _id, boardId: _b, createdAt: _c, updatedAt: _u, ...payload } = entry.item
      rawRef.current.create(payload as CreateItemPayload, (newItem) => {
        past.current = [...past.current, { type: 'create', item: newItem }]
        sync()
      })
    } else if (entry.type === 'delete') {
      past.current = [...past.current, entry]
      sync()
      rawRef.current.delete(entry.item.id)
    } else {
      past.current = [...past.current, entry]
      sync()
      rawRef.current.update(entry.id, entry.after)
    }
  }, [sync])

  // ── Keyboard shortcuts ──────────────────────────────────────────────────────
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (!e.metaKey && !e.ctrlKey) return
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      // e.code is the physical key, unaffected by Shift capitalisation
      if (e.code === 'KeyZ' && !e.shiftKey) { e.preventDefault(); undo() }
      if (e.code === 'KeyZ' && e.shiftKey) { e.preventDefault(); redo() }
      if (e.code === 'KeyY') { e.preventDefault(); redo() }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [undo, redo])

  return {
    handleCreate,
    handleUpdate,
    handleDelete,
    undo,
    redo,
    canUndo: past.current.length > 0,
    canRedo: future.current.length > 0,
  }
}
