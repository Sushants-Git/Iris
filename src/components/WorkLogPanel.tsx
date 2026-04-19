import { useState, useEffect, useRef } from 'react'
import {
  X, Play, Pause, Square, Trash2, Clock,
  Briefcase, User, ChevronDown, FileText,
  ListChecks, Link, ExternalLink, Plus, StickyNote,
} from 'lucide-react'
import { useWorkLog, getActiveMs, formatDuration } from '@/hooks/useWorkLog'
import { useTaskList } from '@/hooks/useTaskList'
import { useStandaloneNotes } from '@/hooks/useStandaloneNotes'
import { NoteModal } from './NoteModal'
import { TaskEditModal } from './TaskEditModal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { WorkTag, WorkEntry, Task, StandaloneNote } from '@/types/worklog'

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function formatDateGroup(iso: string): string {
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date(); yesterday.setDate(today.getDate() - 1)
  if (sameDay(d, today)) return 'Today'
  if (sameDay(d, yesterday)) return 'Yesterday'
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function groupByDate(entries: WorkEntry[]): [string, WorkEntry[]][] {
  const done = [...entries].filter((e) => e.status === 'done').sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
  const map = new Map<string, WorkEntry[]>()
  for (const e of done) {
    const key = formatDateGroup(e.startedAt)
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(e)
  }
  return [...map.entries()]
}

function entryActiveMs(e: WorkEntry): number {
  if (!e.endedAt) return 0
  return Math.max(0, new Date(e.endedAt).getTime() - new Date(e.startedAt).getTime() - e.totalPausedMs)
}

function tagDot(tag: WorkTag) { return tag === 'work' ? 'bg-primary' : 'bg-rose-300' }
function tagAccent(tag: WorkTag) { return tag === 'work' ? 'border-l-primary' : 'border-l-rose-300' }

function tagStyle(tag: WorkTag) {
  return tag === 'work'
    ? 'bg-primary/10 text-primary border-primary/20 dark:bg-primary/20 dark:text-primary dark:border-primary/30'
    : 'bg-rose-50 text-rose-500 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800/50'
}

function TagBadge({ tag }: { tag: WorkTag }) {
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-medium', tagStyle(tag))}>
      {tag === 'work' ? <Briefcase className="w-3 h-3" /> : <User className="w-3 h-3" />}
      {tag}
    </span>
  )
}

function hostname(url: string) {
  try { return new URL(url).hostname.replace(/^www\./, '') } catch { return url }
}

// ── Activity heatmap ─────────────────────────────────────────────────────────

const HEATMAP_DAYS = 180 // ~6 months

function ActivityHeatmap({ entries }: { entries: WorkEntry[] }) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const dayMs = new Map<string, number>()
  for (const e of entries) {
    if (e.status !== 'done' || !e.endedAt) continue
    const key = new Date(e.startedAt).toDateString()
    const ms = Math.max(
      0,
      new Date(e.endedAt).getTime() - new Date(e.startedAt).getTime() - e.totalPausedMs,
    )
    dayMs.set(key, (dayMs.get(key) ?? 0) + ms)
  }

  // Window: today, back HEATMAP_DAYS days (inclusive). Align start to Sunday
  // so columns are whole weeks. Final column contains today.
  const rawStart = new Date(today)
  rawStart.setDate(today.getDate() - (HEATMAP_DAYS - 1))
  const start = new Date(rawStart)
  start.setDate(rawStart.getDate() - rawStart.getDay())
  const totalDays = Math.round((today.getTime() - start.getTime()) / 86_400_000) + 1
  const weeks = Math.ceil(totalDays / 7)

  const columns: Array<Array<{ date: Date; ms: number }>> = []
  for (let w = 0; w < weeks; w++) {
    const col: Array<{ date: Date; ms: number }> = []
    for (let d = 0; d < 7; d++) {
      const date = new Date(start)
      date.setDate(start.getDate() + w * 7 + d)
      col.push({ date, ms: dayMs.get(date.toDateString()) ?? 0 })
    }
    columns.push(col)
  }

  const HOUR = 60 * 60_000
  function level(ms: number): 0 | 1 | 2 | 3 | 4 {
    if (ms <= 0) return 0
    if (ms > 6 * HOUR) return 4
    if (ms > 4 * HOUR) return 3
    if (ms > 2 * HOUR) return 2
    return 1
  }
  const levelClass: Record<0 | 1 | 2 | 3 | 4, string> = {
    0: 'bg-foreground/[0.04] dark:bg-foreground/[0.07]',
    1: 'bg-primary/25',
    2: 'bg-primary/45',
    3: 'bg-primary/70',
    4: 'bg-primary',
  }

  const total = [...dayMs.values()].reduce((s, v) => s + v, 0)
  const activeDays = [...dayMs.values()].filter((v) => v > 0).length

  return (
    <div className="px-4 py-3">
      <div className="flex gap-[2px] overflow-x-auto pb-0.5">
        {columns.map((col, i) => (
          <div key={i} className="flex flex-col gap-[2px] shrink-0">
            {col.map(({ date, ms }, d) => {
              const future = date.getTime() > today.getTime()
              return (
                <div
                  key={d}
                  title={future ? '' : `${date.toLocaleDateString()} — ${formatDuration(ms)}`}
                  className={cn(
                    'w-[10px] h-[10px] rounded-[2px]',
                    future ? 'bg-transparent' : levelClass[level(ms)],
                  )}
                />
              )
            })}
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between gap-2 mt-2 text-[10px] text-muted-foreground">
        <p className="tabular-nums">
          {activeDays} day{activeDays === 1 ? '' : 's'} · {formatDuration(total)}
        </p>
        <div className="flex items-center gap-1">
          <span>less</span>
          {([0, 1, 2, 3, 4] as const).map((l) => (
            <span key={l} className={cn('w-[10px] h-[10px] rounded-[2px]', levelClass[l])} />
          ))}
          <span>more</span>
        </div>
      </div>
    </div>
  )
}

// ── Day totals ───────────────────────────────────────────────────────────────

function DaySummary({ entries }: { entries: WorkEntry[] }) {
  const workMs = entries.filter((e) => e.tag === 'work').reduce((s, e) => s + entryActiveMs(e), 0)
  const personalMs = entries.filter((e) => e.tag === 'personal').reduce((s, e) => s + entryActiveMs(e), 0)
  if (workMs === 0 && personalMs === 0) return null
  return (
    <span className="flex items-center gap-2 ml-auto">
      {workMs > 0 && (
        <span className="flex items-center gap-1 text-xs text-primary font-medium tabular-nums">
          <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
          {formatDuration(workMs)}
        </span>
      )}
      {personalMs > 0 && (
        <span className="flex items-center gap-1 text-xs text-rose-400 font-medium tabular-nums">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-300 shrink-0" />
          {formatDuration(personalMs)}
        </span>
      )}
    </span>
  )
}

// ── Live timer ───────────────────────────────────────────────────────────────

function LiveTimer({ entry }: { entry: WorkEntry }) {
  const [ms, setMs] = useState(() => getActiveMs(entry))
  const entryRef = useRef(entry)
  entryRef.current = entry
  useEffect(() => {
    setMs(getActiveMs(entryRef.current))
    if (entry.status === 'paused') return
    const id = setInterval(() => setMs(getActiveMs(entryRef.current)), 1000)
    return () => clearInterval(id)
  }, [entry.status, entry.id])
  return (
    <span className="font-mono text-[2.75rem] font-semibold tabular-nums tracking-tight leading-none">
      {formatDuration(ms)}
    </span>
  )
}

// ── Active session card ──────────────────────────────────────────────────────

function ActiveCard({ entry, onPause, onResume, onStop, onNotes }: {
  entry: WorkEntry; onPause: () => void; onResume: () => void; onStop: () => void; onNotes: () => void
}) {
  const isPaused = entry.status === 'paused'
  return (
    <div className={cn('mx-4 mb-4 rounded-2xl border border-border bg-card p-4 space-y-4', 'border-l-[3px]', tagAccent(entry.tag))}>
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1.5 flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn('w-2 h-2 rounded-full shrink-0', isPaused ? 'bg-muted-foreground' : 'bg-emerald-500 animate-pulse')} />
            <p className="text-sm font-semibold leading-snug text-foreground truncate">{entry.title}</p>
          </div>
          <div className="flex items-center gap-2 pl-4">
            <TagBadge tag={entry.tag} />
            <span className="text-xs text-muted-foreground">{isPaused ? 'paused' : `since ${formatTime(entry.startedAt)}`}</span>
          </div>
        </div>
        <Button
          variant="ghost" size="icon-sm" onClick={onNotes}
          className={cn('shrink-0', entry.notes ? 'text-primary hover:bg-primary/10' : '')}
          title="Notes"
        >
          <FileText className="w-3.5 h-3.5" />
        </Button>
      </div>
      <div className="pl-4"><LiveTimer entry={entry} /></div>
      <div className="flex items-center gap-2">
        <Button variant="secondary" onClick={isPaused ? onResume : onPause} className="flex-1 gap-2 rounded-xl">
          {isPaused ? <><Play className="w-3.5 h-3.5" /> Resume</> : <><Pause className="w-3.5 h-3.5" /> Pause</>}
        </Button>
        <Button variant="ghost" onClick={onStop} className="flex-1 gap-2 rounded-xl bg-destructive/10 hover:bg-destructive/20 text-destructive hover:text-destructive">
          <Square className="w-3.5 h-3.5" /> Stop
        </Button>
      </div>
    </div>
  )
}

// ── New entry form ───────────────────────────────────────────────────────────

function NewEntryForm({ onStart }: { onStart: (title: string, tag: WorkTag) => void }) {
  const [title, setTitle] = useState('')
  const [tag, setTag] = useState<WorkTag>('work')
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 50) }, [])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const t = title.trim()
    if (!t) return
    onStart(t, tag)
    setTitle('')
  }

  return (
    <form onSubmit={handleSubmit} className="mx-4 mb-5 space-y-2">
      <Input ref={inputRef} type="text" placeholder="What are you working on?" value={title} onChange={(e) => setTitle(e.target.value)} className="rounded-xl bg-muted border-0 shadow-none focus-visible:ring-0" />
      <div className="flex items-center gap-2">
        <div className="flex gap-1 p-1 bg-muted rounded-xl flex-1">
          {(['work', 'personal'] as WorkTag[]).map((t) => (
            <button key={t} type="button" onClick={() => setTag(t)}
              className={cn('flex-1 flex items-center justify-center gap-1.5 py-1 px-2 rounded-lg text-xs font-medium transition-colors', tag === t ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground')}>
              {t === 'work' ? <Briefcase className="w-3 h-3" /> : <User className="w-3 h-3" />}
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
        <Button type="submit" disabled={!title.trim()} className="gap-1.5 rounded-xl">
          <Play className="w-3.5 h-3.5" /> Start
        </Button>
      </div>
    </form>
  )
}

// ── Day group ────────────────────────────────────────────────────────────────

function DayGroup({ date, entries, defaultOpen, onRemove, onNotes }: {
  date: string; entries: WorkEntry[]; defaultOpen: boolean
  onRemove: (id: string) => void; onNotes: (id: string) => void
}) {
  const [open, setOpen] = useState(defaultOpen)
  const totalMs = entries.reduce((sum, e) => sum + entryActiveMs(e), 0)
  return (
    <div>
      <button onClick={() => setOpen((v) => !v)} className="w-full flex items-center gap-1.5 py-1 text-left group">
        <ChevronDown className={cn('w-3.5 h-3.5 text-muted-foreground/60 transition-transform duration-200 shrink-0', !open && '-rotate-90')} />
        <span className="text-xs font-semibold text-muted-foreground flex-1">{date}</span>
        <DaySummary entries={entries} />
        {!open && totalMs > 0 && <span className="text-xs font-mono text-muted-foreground/60 tabular-nums ml-1">{formatDuration(totalMs)}</span>}
      </button>
      {open && (
        <div className="mt-1 space-y-0.5">
          {entries.map((entry) => (
            <HistoryEntry key={entry.id} entry={entry} onRemove={() => onRemove(entry.id)} onNotes={() => onNotes(entry.id)} />
          ))}
        </div>
      )}
    </div>
  )
}

// ── History entry ────────────────────────────────────────────────────────────

function HistoryEntry({ entry, onRemove, onNotes }: {
  entry: WorkEntry; onRemove: () => void; onNotes: () => void
}) {
  const doneMs = entryActiveMs(entry)
  return (
    <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-muted/50 group transition-colors">
      <span className={cn('w-2 h-2 rounded-full shrink-0', tagDot(entry.tag))} />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground leading-snug truncate">{entry.title}</p>
        <p className="text-xs text-muted-foreground tabular-nums">
          {formatTime(entry.startedAt)}{entry.endedAt && ` – ${formatTime(entry.endedAt)}`}
        </p>
      </div>
      {/* Notes icon — always visible if has notes, otherwise hover-only */}
      <Button
        variant="ghost" size="icon-xs" onClick={onNotes}
        className={cn('shrink-0 transition-opacity', entry.notes ? 'text-primary opacity-100' : 'opacity-0 group-hover:opacity-100')}
        title="Notes"
      >
        <FileText className="w-3.5 h-3.5" />
      </Button>
      <span className="text-xs font-mono text-muted-foreground tabular-nums shrink-0 w-12 text-right">{formatDuration(doneMs)}</span>
      <Button variant="ghost" size="icon-xs" onClick={onRemove} className="shrink-0 opacity-0 group-hover:opacity-100 hover:text-destructive transition-opacity">
        <Trash2 className="w-3.5 h-3.5" />
      </Button>
    </div>
  )
}

// ── Add task form ────────────────────────────────────────────────────────────

function AddTaskForm({ onAdd }: { onAdd: (title: string, tag: WorkTag, url?: string) => void }) {
  const [title, setTitle] = useState('')
  const [tag, setTag] = useState<WorkTag>('work')
  const [url, setUrl] = useState('')
  const [showUrl, setShowUrl] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const t = title.trim()
    if (!t) return
    onAdd(t, tag, url.trim() || undefined)
    setTitle(''); setUrl(''); setShowUrl(false)
  }

  return (
    <form onSubmit={handleSubmit} className="mx-4 mb-5 space-y-2">
      <Input type="text" placeholder="Add a task…" value={title} onChange={(e) => setTitle(e.target.value)} className="rounded-xl bg-muted border-0 shadow-none focus-visible:ring-0" autoFocus />
      <div className="flex items-center gap-1.5">
        <div className="flex gap-1 p-1 bg-muted rounded-xl flex-1">
          {(['work', 'personal'] as WorkTag[]).map((t) => (
            <button key={t} type="button" onClick={() => setTag(t)}
              className={cn('flex-1 flex items-center justify-center gap-1.5 py-1 px-2 rounded-lg text-xs font-medium transition-colors', tag === t ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground')}>
              {t === 'work' ? <Briefcase className="w-3 h-3" /> : <User className="w-3 h-3" />}
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
        <Button type="button" variant="secondary" size="icon" onClick={() => setShowUrl((v) => !v)}
          className={cn('rounded-xl shrink-0', showUrl ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400' : '')} title="Add source link">
          <Link className="w-4 h-4" />
        </Button>
        <Button type="submit" size="icon" disabled={!title.trim()} className="rounded-xl shrink-0" title="Add task">
          <Plus className="w-4 h-4" />
        </Button>
      </div>
      {showUrl && (
        <Input type="url" placeholder="https://… (optional source link)" value={url} onChange={(e) => setUrl(e.target.value)} className="rounded-xl bg-muted border-0 shadow-none focus-visible:ring-0" autoFocus />
      )}
    </form>
  )
}

// ── Task row ─────────────────────────────────────────────────────────────────

function TaskRow({ task, onRemove, onStart, onEdit }: {
  task: Task; onRemove: () => void; onStart: () => void; onEdit: () => void
}) {
  const hasUrl = !!task.url
  const refCount = task.references?.length ?? 0
  const detailsPreview = task.details?.replace(/\s+/g, ' ').trim().slice(0, 90) ?? ''
  const tag = task.tag ?? 'work'
  const meta: string[] = [tag]
  if (refCount > 0) meta.push(`${refCount} link${refCount === 1 ? '' : 's'}`)
  meta.push(new Date(task.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }))
  return (
    <div
      onClick={onEdit}
      className={cn(
        'flex items-center gap-2.5 px-3 py-2.5 rounded-xl group transition-colors cursor-pointer select-none',
        hasUrl ? 'bg-accent/60 hover:bg-accent' : 'hover:bg-muted/60',
      )}
    >
      <div className="flex-1 min-w-0 space-y-1">
        <p className="text-sm font-medium leading-snug truncate text-foreground">{task.title}</p>
        {detailsPreview && (
          <p className="text-xs text-muted-foreground line-clamp-1">{detailsPreview}</p>
        )}
        <div className="flex items-center gap-2 flex-wrap text-[11px] text-muted-foreground/80">
          {hasUrl && (
            <a
              href={task.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 text-primary/70 hover:text-primary hover:underline"
            >
              <ExternalLink className="w-3 h-3 shrink-0" />{hostname(task.url!)}
            </a>
          )}
          {meta.map((m, i) => (
            <span key={i} className="inline-flex items-center gap-2">
              {(i > 0 || hasUrl) && <span className="w-0.5 h-0.5 rounded-full bg-muted-foreground/50" />}
              <span className={cn(i === 0 && 'capitalize')}>{m}</span>
            </span>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onStart() }}
          className="text-xs text-primary hover:text-primary/80 px-1.5 py-1 rounded-md"
        >
          Start
        </button>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={(e) => { e.stopPropagation(); onRemove() }}
          className="hover:text-destructive"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  )
}

// ── Notes tab ────────────────────────────────────────────────────────────────

function NoteRow({ title, preview, date, hasContent, tag, taskLabel, onClick, onDelete }: {
  title: string; preview: string; date: string; hasContent: boolean
  tag?: WorkTag; taskLabel?: string
  onClick: () => void; onDelete: () => void
}) {
  return (
    <div className="group flex items-start gap-2.5 px-3 py-2.5 rounded-xl hover:bg-muted/60 transition-colors cursor-pointer select-none" onClick={onClick}>
      <FileText className={cn('w-4 h-4 shrink-0 mt-0.5', hasContent ? 'text-primary' : 'text-muted-foreground/50')} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="text-sm font-medium text-foreground truncate flex-1">{title || 'Untitled'}</p>
          {tag && <span className={cn('shrink-0 w-1.5 h-1.5 rounded-full', tagDot(tag))} />}
        </div>
        {taskLabel && (
          <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 mb-1">
            {taskLabel}
          </span>
        )}
        {preview && <p className="text-xs text-muted-foreground truncate">{preview}</p>}
        <p className="text-[10px] text-muted-foreground/60 mt-0.5">{date}</p>
      </div>
      <Button variant="ghost" size="icon-xs" onClick={(e) => { e.stopPropagation(); onDelete() }} className="opacity-0 group-hover:opacity-100 hover:text-destructive shrink-0">
        <Trash2 className="w-3.5 h-3.5" />
      </Button>
    </div>
  )
}

// ── Panel ─────────────────────────────────────────────────────────────────────

export function WorkLogPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { entries, activeEntry, loading, start, pause, resume, stop, remove, updateNotes } = useWorkLog()
  const { tasks, addTask, removeTask, updateTask } = useTaskList()
  const { notes: standaloneNotes, addNote, updateNote, removeNote } = useStandaloneNotes()
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  const editingTask = editingTaskId ? tasks.find((t) => t.id === editingTaskId) ?? null : null
  const groups = groupByDate(entries)

  type Tab = 'log' | 'tasks' | 'notes'
  const [tab, setTab] = useState<Tab>('log')

  // ── Note modal state (works for both session + standalone) ──
  type NoteTarget =
    | { kind: 'session'; entryId: string }
    | { kind: 'standalone'; noteId: string }
  const [noteTarget, setNoteTarget] = useState<NoteTarget | null>(null)

  const sessionNoteEntry = noteTarget?.kind === 'session'
    ? entries.find((e) => e.id === noteTarget.entryId) ?? null
    : null
  const relatedEntries = sessionNoteEntry
    ? entries.filter((e) => e.id !== sessionNoteEntry.id && e.title === sessionNoteEntry.title && !!e.notes)
    : []
  const standaloneNoteEntry = noteTarget?.kind === 'standalone'
    ? standaloneNotes.find((n) => n.id === noteTarget.noteId) ?? null
    : null

  function handleStartFromTask(task: Task) {
    start(task.title, task.tag ?? 'work')
    setTab('log')
  }

  function handleNewNote() {
    const id = crypto.randomUUID()
    const now = new Date().toISOString()
    const note: StandaloneNote = { id, title: '', content: '', taskId: null, createdAt: now, updatedAt: now }
    addNote(note)
    setNoteTarget({ kind: 'standalone', noteId: id })
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && !noteTarget && !editingTaskId) onClose()
    }
    if (open) window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose, noteTarget, editingTaskId])

  // Build combined notes list for the Notes tab
  const sessionNoteItems = entries
    .filter((e) => !!e.notes && e.status === 'done')
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())

  const allNotesCount = standaloneNotes.length + sessionNoteItems.length

  const TAB_BTN = (id: Tab, icon: React.ReactNode, label: string, count?: number) => (
    <button
      onClick={() => setTab(id)}
      className={cn(
        'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors',
        tab === id ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted/60',
      )}
    >
      {icon} {label}
      {count !== undefined && count > 0 && (
        <span className="min-w-[1.1rem] h-[1.1rem] flex items-center justify-center rounded-full bg-primary/15 text-primary text-[10px] font-semibold px-1">{count}</span>
      )}
    </button>
  )

  return (
    <>
      {/* Note modal — full-screen left panel, WorkLogPanel stays on right */}
      {sessionNoteEntry && (
        <NoteModal
          mode="session"
          entry={sessionNoteEntry}
          relatedEntries={relatedEntries}
          onSave={(notes) => updateNotes(sessionNoteEntry.id, notes)}
          onClose={() => setNoteTarget(null)}
        />
      )}
      {standaloneNoteEntry && (
        <NoteModal
          mode="standalone"
          note={standaloneNoteEntry}
          tasks={tasks}
          onSave={(patch) => updateNote(standaloneNoteEntry.id, patch)}
          onClose={() => setNoteTarget(null)}
        />
      )}
      {editingTask && (
        <TaskEditModal
          task={editingTask}
          onSave={updateTask}
          onClose={() => setEditingTaskId(null)}
        />
      )}

      {open && <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px]" onClick={onClose} />}

      <div className={cn(
        'fixed top-0 right-0 h-full w-full max-w-sm bg-background border-l border-border z-50',
        'flex flex-col shadow-2xl transition-transform duration-300 ease-in-out',
        open ? 'translate-x-0' : 'translate-x-full',
      )}>
        {/* Header */}
        <div className="flex items-center px-4 border-b border-border shrink-0 gap-2 h-14">
          <div className="flex items-center gap-1 flex-1">
            {TAB_BTN('log', <Clock className="w-3.5 h-3.5" />, 'Log')}
            {TAB_BTN('tasks', <ListChecks className="w-3.5 h-3.5" />, 'Tasks')}
            {TAB_BTN('notes', <StickyNote className="w-3.5 h-3.5" />, 'Notes')}
          </div>
          <Button variant="ghost" size="icon-sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* ── Log tab ── */}
        {tab === 'log' && (
          <div className="flex-1 min-h-0 flex flex-col">
          <div className="flex-1 overflow-y-auto min-h-0">
            {activeEntry && (
              <div className="pt-4">
                <ActiveCard
                  entry={activeEntry}
                  onPause={() => pause(activeEntry.id)}
                  onResume={() => resume(activeEntry.id)}
                  onStop={() => stop(activeEntry.id)}
                  onNotes={() => setNoteTarget({ kind: 'session', entryId: activeEntry.id })}
                />
                <div className="mx-4 mt-4 h-px bg-border" />
              </div>
            )}
            <div className="pt-4">
              <NewEntryForm onStart={start} />
            </div>
            {loading && <p className="px-4 text-xs text-muted-foreground animate-pulse">Loading history…</p>}
            {!loading && groups.length > 0 && (
              <div className="px-4 pb-4">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-3">History</p>
                <div className="space-y-3">
                  {groups.map(([date, dateEntries]) => (
                    <DayGroup key={date} date={date} entries={dateEntries} defaultOpen={date === 'Today'}
                      onRemove={remove} onNotes={(id) => setNoteTarget({ kind: 'session', entryId: id })} />
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="shrink-0 border-t border-border bg-background">
            <ActivityHeatmap entries={entries} />
          </div>
          </div>
        )}

        {/* ── Tasks tab ── */}
        {tab === 'tasks' && (
          <div className="flex-1 overflow-y-auto">
            <div className="pt-4"><AddTaskForm onAdd={addTask} /></div>
            {tasks.length === 0 ? (
              <div className="px-4 py-8 flex flex-col items-center gap-2 text-center">
                <ListChecks className="w-8 h-8 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">No tasks yet</p>
                <p className="text-xs text-muted-foreground/60">Add tasks above to track your backlog</p>
              </div>
            ) : (
              <div className="px-4 pb-8 space-y-1">
                {tasks.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    onRemove={() => removeTask(task.id)}
                    onStart={() => handleStartFromTask(task)}
                    onEdit={() => setEditingTaskId(task.id)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Notes tab ── */}
        {tab === 'notes' && (
          <div className="flex-1 overflow-y-auto">
            <div className="px-4 pt-4 pb-3">
              <Button size="sm" variant="outline" className="w-full gap-2" onClick={handleNewNote}>
                <Plus className="w-3.5 h-3.5" /> New Note
              </Button>
            </div>

            {allNotesCount === 0 ? (
              <div className="px-4 py-8 flex flex-col items-center gap-2 text-center">
                <StickyNote className="w-8 h-8 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">No notes yet</p>
                <p className="text-xs text-muted-foreground/60">Create a note or add notes to sessions</p>
              </div>
            ) : (
              <div className="px-4 pb-8 space-y-0.5">
                {/* Standalone notes */}
                {standaloneNotes.map((note) => {
                  const linkedTask = note.taskId ? tasks.find((t) => t.id === note.taskId) : null
                  const preview = note.content.replace(/[#*`>\-]/g, '').trim().slice(0, 80)
                  return (
                    <NoteRow
                      key={note.id}
                      title={note.title || 'Untitled'}
                      preview={preview}
                      date={new Date(note.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      hasContent={!!note.content.trim()}
                      taskLabel={linkedTask?.title}
                      onClick={() => setNoteTarget({ kind: 'standalone', noteId: note.id })}
                      onDelete={() => removeNote(note.id)}
                    />
                  )
                })}

                {/* Session notes */}
                {sessionNoteItems.length > 0 && (
                  <>
                    {standaloneNotes.length > 0 && <div className="h-px bg-border my-3" />}
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-2 px-1">Session notes</p>
                    {sessionNoteItems.map((entry) => (
                      <NoteRow
                        key={entry.id}
                        title={entry.title}
                        preview={(entry.notes ?? '').replace(/[#*`>\-]/g, '').trim().slice(0, 80)}
                        date={new Date(entry.startedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        hasContent={!!entry.notes?.trim()}
                        tag={entry.tag}
                        onClick={() =>
                          setNoteTarget((prev) =>
                            prev?.kind === 'session' && prev.entryId === entry.id
                              ? null
                              : { kind: 'session', entryId: entry.id },
                          )
                        }
                        onDelete={() => remove(entry.id)}
                      />
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}
