export type WorkTag = 'work' | 'personal'

export interface StandaloneNote {
  id: string
  title: string
  content: string
  taskId: string | null
  createdAt: string
  updatedAt: string
}
export type WorkStatus = 'active' | 'paused' | 'done'

export interface TaskReference {
  title: string
  url: string
}

export interface Task {
  id: string
  title: string
  tag: WorkTag
  url?: string
  details?: string
  references?: TaskReference[]
  createdAt: string
}

export interface WorkEntry {
  id: string
  title: string
  tag: WorkTag
  startedAt: string       // ISO
  endedAt: string | null  // ISO
  pausedAt: string | null // ISO — when the current pause started
  totalPausedMs: number   // accumulated pause time in ms
  status: WorkStatus
  notes?: string
}
