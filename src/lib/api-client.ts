import type { Board, Item, PreviewResult } from '@/types'

const BASE = '/api'
const TOKEN_KEY = 'iris_token'

export function getToken() { return localStorage.getItem(TOKEN_KEY) }
export function setToken(t: string) { localStorage.setItem(TOKEN_KEY, t) }
export function clearToken() { localStorage.removeItem(TOKEN_KEY) }

async function request<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const token = getToken()
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...options?.headers,
    },
    ...options,
  })
  if (res.status === 401) {
    clearToken()
    window.location.reload()
    throw new Error('Unauthorized')
  }
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`API error ${res.status}: ${text}`)
  }
  return res.json() as Promise<T>
}

// ─── Boards ───────────────────────────────────────────────────────────────────

export const boardsApi = {
  list: () => request<Board[]>('/boards'),

  create: (name: string) =>
    request<Board>('/boards', {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),

  update: (id: string, name: string) =>
    request<Board>(`/boards/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ name }),
    }),

  delete: (id: string) =>
    request<{ ok: boolean }>(`/boards/${id}`, { method: 'DELETE' }),
}

// ─── Items ────────────────────────────────────────────────────────────────────

export type CreateItemPayload = {
  type: 'link' | 'note' | 'subcategory'
  url?: string
  scrapedTitle?: string
  scrapedDescription?: string
  scrapedThumbnail?: string
  customTitle?: string
  noteContent?: string
  subcategory?: string
  x?: number
  y?: number
  width?: number
  height?: number
}

export type UpdateItemPayload = {
  customTitle?: string | null
  customDescription?: string | null
  customThumbnail?: string | null
  noteContent?: string | null
  subcategory?: string | null
  x?: number
  y?: number
  width?: number
  height?: number
  rotation?: number
  status?: 'pending' | 'in_progress' | 'done'
}

export const itemsApi = {
  list: (boardId: string) =>
    request<Item[]>(`/boards/${boardId}/items`),

  create: (boardId: string, payload: CreateItemPayload) =>
    request<Item>(`/boards/${boardId}/items`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  update: (id: string, payload: UpdateItemPayload) =>
    request<Item>(`/items/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  delete: (id: string) =>
    request<{ ok: boolean }>(`/items/${id}`, { method: 'DELETE' }),
}

// ─── Work Log ─────────────────────────────────────────────────────────────────

export type WorkEntryPayload = {
  id: string
  title: string
  tag: 'work' | 'personal'
  startedAt: string
  endedAt: string | null
  totalPausedMs: number
  notes?: string
}

export const workLogApi = {
  list: () => request<WorkEntryPayload[]>('/work-log'),
  save: (entry: WorkEntryPayload) =>
    request<{ ok: boolean }>('/work-log', {
      method: 'POST',
      body: JSON.stringify(entry),
    }),
  saveNotes: (id: string, notes: string) =>
    request<{ ok: boolean }>(`/work-log/${id}/notes`, {
      method: 'PATCH',
      body: JSON.stringify({ notes }),
    }),
  delete: (id: string) =>
    request<{ ok: boolean }>(`/work-log/${id}`, { method: 'DELETE' }),
}

// ─── Tasks ────────────────────────────────────────────────────────────────────

export type TaskReferencePayload = { title: string; url: string }
export type TaskPayload = {
  id: string
  title: string
  tag: string
  url?: string
  details?: string | null
  references?: TaskReferencePayload[]
  createdAt: string
}

export type UpdateTaskPayload = {
  title?: string
  tag?: 'work' | 'personal'
  url?: string | null
  details?: string | null
  references?: TaskReferencePayload[]
}

export const tasksApi = {
  list: () => request<TaskPayload[]>('/tasks'),
  add: (task: TaskPayload) =>
    request<{ ok: boolean }>('/tasks', { method: 'POST', body: JSON.stringify(task) }),
  update: (id: string, patch: UpdateTaskPayload) =>
    request<{ ok: boolean }>(`/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
  delete: (id: string) =>
    request<{ ok: boolean }>(`/tasks/${id}`, { method: 'DELETE' }),
}

// ─── Standalone Notes ─────────────────────────────────────────────────────────

export type StandaloneNotePayload = { id: string; title: string; content: string; taskId: string | null; createdAt: string; updatedAt: string }

export const standaloneNotesApi = {
  list: () => request<StandaloneNotePayload[]>('/notes'),
  create: (note: Omit<StandaloneNotePayload, 'updatedAt'>) =>
    request<{ ok: boolean }>('/notes', { method: 'POST', body: JSON.stringify(note) }),
  update: (id: string, patch: { title?: string; content?: string; taskId?: string | null }) =>
    request<{ ok: boolean }>(`/notes/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
  delete: (id: string) =>
    request<{ ok: boolean }>(`/notes/${id}`, { method: 'DELETE' }),
}

// ─── AI ───────────────────────────────────────────────────────────────────────

export type AIParsedResult = {
  links: { url: string; title: string }[]
  tasks: { title: string; url: string | null }[]
}

export const aiApi = {
  parse: (text: string) =>
    request<AIParsedResult>('/ai/parse', {
      method: 'POST',
      body: JSON.stringify({ text }),
    }),
}

// ─── Preview ──────────────────────────────────────────────────────────────────

export const previewApi = {
  fetch: (url: string) =>
    request<PreviewResult>('/preview', {
      method: 'POST',
      body: JSON.stringify({ url }),
    }),
}
