import { useState, useEffect, useRef } from 'react'
import {
  X, Play, Pause, Square, Trash2, Clock,
  Briefcase, User, ChevronDown, FileText,
  ListChecks, Link, ExternalLink, Plus,
} from 'lucide-react'
import { useWorkLog, getActiveMs, formatDuration } from '@/hooks/useWorkLog'
import { useTaskList } from '@/hooks/useTaskList'
import { WorkNoteModal } from './WorkNoteModal'
import { cn } from '@/lib/utils'
import type { WorkTag, WorkEntry, Task } from '@/types/worklog'

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit', hour12: true,
  })
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function formatDateGroup(iso: string): string {
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)
  if (sameDay(d, today)) return 'Today'
  if (sameDay(d, yesterday)) return 'Yesterday'
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function groupByDate(entries: WorkEntry[]): [string, WorkEntry[]][] {
  const done = [...entries]
    .filter((e) => e.status === 'done')
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
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

function tagDot(tag: WorkTag) {
  return tag === 'work'
    ? 'bg-blue-500'
    : 'bg-purple-500'
}

function tagAccent(tag: WorkTag) {
  return tag === 'work'
    ? 'border-l-blue-500'
    : 'border-l-purple-500'
}

function tagStyle(tag: WorkTag) {
  return tag === 'work'
    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
    : 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
}

function TagBadge({ tag }: { tag: WorkTag }) {
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium', tagStyle(tag))}>
      {tag === 'work' ? <Briefcase className="w-3 h-3" /> : <User className="w-3 h-3" />}
      {tag}
    </span>
  )
}

function hostname(url: string) {
  try { return new URL(url).hostname.replace(/^www\./, '') } catch { return url }
}

// ── Day totals ─────────────────────────────────────────────────────────────────

function DaySummary({ entries }: { entries: WorkEntry[] }) {
  const workMs = entries.filter((e) => e.tag === 'work').reduce((s, e) => s + entryActiveMs(e), 0)
  const personalMs = entries.filter((e) => e.tag === 'personal').reduce((s, e) => s + entryActiveMs(e), 0)
  if (workMs === 0 && personalMs === 0) return null
  return (
    <span className="flex items-center gap-2 ml-auto">
      {workMs > 0 && (
        <span className="flex items-center gap-1 text-xs text-blue-500 dark:text-blue-400 font-medium tabular-nums">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
          {formatDuration(workMs)}
        </span>
      )}
      {personalMs > 0 && (
        <span className="flex items-center gap-1 text-xs text-purple-500 dark:text-purple-400 font-medium tabular-nums">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />
          {formatDuration(personalMs)}
        </span>
      )}
    </span>
  )
}

// ── Live timer ─────────────────────────────────────────────────────────────────

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

// ── Active session card ────────────────────────────────────────────────────────

function ActiveCard({ entry, onPause, onResume, onStop, onNotes }: {
  entry: WorkEntry; onPause: () => void; onResume: () => void; onStop: () => void; onNotes: () => void
}) {
  const isPaused = entry.status === 'paused'
  return (
    <div className={cn(
      'mx-4 mb-4 rounded-2xl border border-border bg-card p-4 space-y-4',
      'border-l-[3px]',
      tagAccent(entry.tag),
    )}>
      {/* Title row */}
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1.5 flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {/* Live dot */}
            <span className={cn(
              'w-2 h-2 rounded-full shrink-0',
              isPaused ? 'bg-muted-foreground' : 'bg-emerald-500 animate-pulse',
            )} />
            <p className="text-sm font-semibold leading-snug text-foreground truncate">{entry.title}</p>
          </div>
          <div className="flex items-center gap-2 pl-4">
            <TagBadge tag={entry.tag} />
            <span className="text-xs text-muted-foreground">
              {isPaused ? 'paused' : `since ${formatTime(entry.startedAt)}`}
            </span>
          </div>
        </div>
        <button
          onClick={onNotes}
          className={cn('p-1.5 rounded-md transition-colors shrink-0', entry.notes ? 'text-primary hover:bg-primary/10' : 'text-muted-foreground hover:bg-muted')}
          title="Notes"
        >
          <FileText className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Timer */}
      <div className="pl-4">
        <LiveTimer entry={entry} />
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={isPaused ? onResume : onPause}
          className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-muted hover:bg-muted/70 text-sm font-medium transition-colors"
        >
          {isPaused ? <><Play className="w-3.5 h-3.5" /> Resume</> : <><Pause className="w-3.5 h-3.5" /> Pause</>}
        </button>
        <button
          onClick={onStop}
          className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-destructive/10 hover:bg-destructive/20 text-destructive text-sm font-medium transition-colors"
        >
          <Square className="w-3.5 h-3.5" /> Stop
        </button>
      </div>
    </div>
  )
}

// ── New entry form ─────────────────────────────────────────────────────────────

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
      <input
        ref={inputRef}
        type="text"
        placeholder="What are you working on?"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full px-3 py-2.5 rounded-xl bg-muted border-0 outline-none text-sm placeholder:text-muted-foreground"
      />
      <div className="flex items-center gap-2">
        <div className="flex gap-1 p-1 bg-muted rounded-xl flex-1">
          {(['work', 'personal'] as WorkTag[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTag(t)}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-1 px-2 rounded-lg text-xs font-medium transition-colors',
                tag === t ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {t === 'work' ? <Briefcase className="w-3 h-3" /> : <User className="w-3 h-3" />}
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
        <button
          type="submit"
          disabled={!title.trim()}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-40 transition-opacity"
        >
          <Play className="w-3.5 h-3.5" /> Start
        </button>
      </div>
    </form>
  )
}

// ── Day group (collapsible) ────────────────────────────────────────────────────

function DayGroup({ date, entries, defaultOpen, onRemove, onNotes }: {
  date: string; entries: WorkEntry[]; defaultOpen: boolean
  onRemove: (id: string) => void; onNotes: (id: string) => void
}) {
  const [open, setOpen] = useState(defaultOpen)
  const totalMs = entries.reduce((sum, e) => sum + entryActiveMs(e), 0)

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-1.5 py-1 text-left group"
      >
        <ChevronDown className={cn(
          'w-3.5 h-3.5 text-muted-foreground/60 transition-transform duration-200 shrink-0',
          !open && '-rotate-90',
        )} />
        <span className="text-xs font-semibold text-muted-foreground flex-1">{date}</span>
        {!open
          ? totalMs > 0 && <span className="text-xs font-mono text-muted-foreground/80 tabular-nums">{formatDuration(totalMs)}</span>
          : <DaySummary entries={entries} />
        }
      </button>

      {open && (
        <div className="mt-1 space-y-0.5">
          {entries.map((entry) => (
            <HistoryEntry
              key={entry.id}
              entry={entry}
              onRemove={() => onRemove(entry.id)}
              onNotes={() => onNotes(entry.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ── History entry ──────────────────────────────────────────────────────────────

function HistoryEntry({ entry, onRemove, onNotes }: {
  entry: WorkEntry; onRemove: () => void; onNotes: () => void
}) {
  const doneMs = entryActiveMs(entry)
  return (
    <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-muted/50 group transition-colors">
      {/* Tag dot */}
      <span className={cn('w-2 h-2 rounded-full shrink-0', tagDot(entry.tag))} />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground leading-snug truncate">{entry.title}</p>
        <p className="text-xs text-muted-foreground tabular-nums">
          {formatTime(entry.startedAt)}{entry.endedAt && ` – ${formatTime(entry.endedAt)}`}
        </p>
      </div>

      {/* Duration */}
      <span className="text-xs font-mono text-muted-foreground tabular-nums shrink-0">{formatDuration(doneMs)}</span>

      {/* Actions */}
      <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={onNotes}
          className={cn('p-1 rounded transition-colors', entry.notes ? 'text-primary !opacity-100' : 'text-muted-foreground hover:text-foreground')}
          title="Notes"
        >
          <FileText className="w-3.5 h-3.5" />
        </button>
        <button onClick={onRemove} className="p-1 rounded text-muted-foreground hover:text-destructive transition-colors">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

// ── Task list view ─────────────────────────────────────────────────────────────

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
    setTitle('')
    setUrl('')
    setShowUrl(false)
  }

  return (
    <form onSubmit={handleSubmit} className="mx-4 mb-5 space-y-2">
      <input
        type="text"
        placeholder="Add a task…"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full px-3 py-2.5 rounded-xl bg-muted border-0 outline-none text-sm placeholder:text-muted-foreground"
        autoFocus
      />
      <div className="flex items-center gap-1.5">
        <div className="flex gap-1 p-1 bg-muted rounded-xl flex-1">
          {(['work', 'personal'] as WorkTag[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTag(t)}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-1 px-2 rounded-lg text-xs font-medium transition-colors',
                tag === t ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {t === 'work' ? <Briefcase className="w-3 h-3" /> : <User className="w-3 h-3" />}
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setShowUrl((v) => !v)}
          className={cn(
            'p-2.5 rounded-xl transition-colors shrink-0',
            showUrl ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400' : 'bg-muted text-muted-foreground hover:text-foreground',
          )}
          title="Add source link"
        >
          <Link className="w-4 h-4" />
        </button>
        <button
          type="submit"
          disabled={!title.trim()}
          className="p-2.5 rounded-xl bg-primary text-primary-foreground disabled:opacity-40 transition-opacity shrink-0"
          title="Add task"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
      {showUrl && (
        <input
          type="url"
          placeholder="https://… (optional source link)"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="w-full px-3 py-2 rounded-xl bg-muted border-0 outline-none text-sm placeholder:text-muted-foreground"
          autoFocus
        />
      )}
    </form>
  )
}

function TaskRow({ task, onRemove, onStart }: {
  task: Task; onRemove: () => void; onStart: () => void
}) {
  const hasUrl = !!task.url
  return (
    <div className={cn(
      'flex items-center gap-2.5 px-3 py-2.5 rounded-xl group transition-colors',
      hasUrl
        ? 'bg-blue-50/50 dark:bg-blue-950/20 hover:bg-blue-50 dark:hover:bg-blue-950/30'
        : 'hover:bg-muted/60',
    )}>
      {/* Tag dot */}
      <span className={cn('w-2 h-2 rounded-full shrink-0 mt-0.5', tagDot(task.tag ?? 'work'))} />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-medium leading-snug truncate', hasUrl ? 'text-blue-900 dark:text-blue-100' : 'text-foreground')}>
          {task.title}
        </p>
        {hasUrl && (
          <a
            href={task.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 text-xs text-blue-500 dark:text-blue-400 hover:underline"
          >
            <ExternalLink className="w-3 h-3 shrink-0" />
            {hostname(task.url!)}
          </a>
        )}
      </div>

      {/* Actions — visible on hover */}
      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={onStart}
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
        >
          <Play className="w-3 h-3" /> Start
        </button>
        <button onClick={onRemove} className="p-1 rounded text-muted-foreground hover:text-destructive transition-colors">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

// ── Panel ──────────────────────────────────────────────────────────────────────

export function WorkLogPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { entries, activeEntry, loading, start, pause, resume, stop, remove, updateNotes } = useWorkLog()
  const { tasks, addTask, removeTask } = useTaskList()
  const groups = groupByDate(entries)
  const [tab, setTab] = useState<'log' | 'tasks'>('log')
  const [notesEntryId, setNotesEntryId] = useState<string | null>(null)

  const notesEntry = notesEntryId ? entries.find((e) => e.id === notesEntryId) ?? null : null
  const relatedEntries = notesEntry
    ? entries.filter((e) => e.id !== notesEntry.id && e.title === notesEntry.title && !!e.notes)
    : []

  function handleStartFromTask(task: Task) {
    start(task.title, task.tag ?? 'work')
    setTab('log')
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && !notesEntryId) onClose()
    }
    if (open) window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose, notesEntryId])

  return (
    <>
      {notesEntry && (
        <WorkNoteModal
          entry={notesEntry}
          relatedEntries={relatedEntries}
          onSave={(notes) => updateNotes(notesEntry.id, notes)}
          onClose={() => setNotesEntryId(null)}
        />
      )}

      {open && (
        <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px]" onClick={onClose} />
      )}

      <div className={cn(
        'fixed top-0 right-0 h-full w-full max-w-sm bg-background border-l border-border z-50',
        'flex flex-col shadow-2xl transition-transform duration-300 ease-in-out',
        open ? 'translate-x-0' : 'translate-x-full',
      )}>
        {/* Header */}
        <div className="flex items-center px-4 py-3 border-b border-border shrink-0 gap-2">
          {/* Tabs — note the gap-6 for visual breathing room */}
          <div className="flex items-center gap-1 flex-1">
            <button
              onClick={() => setTab('log')}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors',
                tab === 'log' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted/60',
              )}
            >
              <Clock className="w-3.5 h-3.5" /> Log
            </button>

            {/* Deliberate gap between the two tabs */}
            <div className="w-3" />

            <button
              onClick={() => setTab('tasks')}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors',
                tab === 'tasks' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted/60',
              )}
            >
              <ListChecks className="w-3.5 h-3.5" />
              Tasks
              {tasks.length > 0 && (
                <span className="min-w-[1.1rem] h-[1.1rem] flex items-center justify-center rounded-full bg-primary/15 text-primary text-[10px] font-semibold px-1">
                  {tasks.length}
                </span>
              )}
            </button>
          </div>

          <kbd className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-mono">Ctrl+I</kbd>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Log tab ── */}
        {tab === 'log' && (
          <div className="flex-1 overflow-y-auto">
            {activeEntry && (
              <div className="pt-4">
                <ActiveCard
                  entry={activeEntry}
                  onPause={() => pause(activeEntry.id)}
                  onResume={() => resume(activeEntry.id)}
                  onStop={() => stop(activeEntry.id)}
                  onNotes={() => setNotesEntryId(activeEntry.id)}
                />
              </div>
            )}

            <div className="mx-4 mb-5 h-px bg-border" />

            <NewEntryForm onStart={start} />

            {loading && (
              <p className="px-4 text-xs text-muted-foreground animate-pulse">Loading history…</p>
            )}

            {!loading && groups.length > 0 && (
              <div className="px-4 pb-8">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-3">
                  History
                </p>
                <div className="space-y-3">
                  {groups.map(([date, dateEntries]) => (
                    <DayGroup
                      key={date}
                      date={date}
                      entries={dateEntries}
                      defaultOpen={date === 'Today'}
                      onRemove={remove}
                      onNotes={setNotesEntryId}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Tasks tab ── */}
        {tab === 'tasks' && (
          <div className="flex-1 overflow-y-auto">
            <div className="pt-4">
              <AddTaskForm onAdd={addTask} />
            </div>

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
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}
