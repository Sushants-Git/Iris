export type ItemType = 'link' | 'note' | 'subcategory'
export type Status = 'pending' | 'in_progress' | 'done'

export interface Board {
  id: string
  name: string
  createdAt: string
  updatedAt: string
}

export interface Item {
  id: string
  boardId: string
  type: ItemType
  url: string | null
  scrapedTitle: string | null
  scrapedDescription: string | null
  scrapedThumbnail: string | null
  customTitle: string | null
  customDescription: string | null
  customThumbnail: string | null
  noteContent: string | null
  subcategory: string | null
  x: number
  y: number
  width: number
  height: number
  rotation: number
  status: Status
  createdAt: string
  updatedAt: string
}

export interface PreviewResult {
  ok: boolean
  fallback?: boolean
  title?: string
  description?: string
  thumbnail?: string
}

// Derived helpers
export function getTitle(item: Item): string {
  if (item.type === 'subcategory') return item.customTitle ?? 'Unnamed Category'
  return item.customTitle ?? item.scrapedTitle ?? item.url ?? 'Untitled'
}

export function getDescription(item: Item): string | null {
  return item.customDescription ?? item.scrapedDescription ?? null
}

export function getThumbnail(item: Item): string | null {
  return item.customThumbnail ?? item.scrapedThumbnail ?? null
}
