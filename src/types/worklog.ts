export type WorkTag = 'work' | 'personal'
export type WorkStatus = 'active' | 'paused' | 'done'

export interface WorkEntry {
  id: string
  title: string
  tag: WorkTag
  startedAt: string       // ISO
  endedAt: string | null  // ISO
  pausedAt: string | null // ISO — when the current pause started
  totalPausedMs: number   // accumulated pause time in ms
  status: WorkStatus
}
