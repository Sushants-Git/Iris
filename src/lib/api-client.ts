import type { Board, Item, PreviewResult } from '@/types'

const BASE = '/api'

async function request<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  })
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
  type: 'link' | 'note'
  url?: string
  scrapedTitle?: string
  scrapedDescription?: string
  scrapedThumbnail?: string
  noteContent?: string
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
  x?: number
  y?: number
  width?: number
  height?: number
  rotation?: number
  status?: 'pending' | 'done'
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

// ─── Preview ──────────────────────────────────────────────────────────────────

export const previewApi = {
  fetch: (url: string) =>
    request<PreviewResult>('/preview', {
      method: 'POST',
      body: JSON.stringify({ url }),
    }),
}
