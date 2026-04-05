import { useState, useEffect, useRef } from 'react'
import { X, Play, Pause, Square, Trash2, Clock, Briefcase, User, ChevronRight } from 'lucide-react'
import { useWorkLog, getActiveMs, formatDuration } from '@/hooks/useWorkLog'
import { cn } from '@/lib/utils'
import type { WorkTag, WorkEntry } from '@/types/worklog'

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

function formatDateGroup(iso: string): string {
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)
  const same = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  if (same(d, today)) return 'Today'
  if (same(d, yesterday)) return 'Yesterday'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function groupByDate(entries: WorkEntry[]): [string, WorkEntry[]][] {
  const done = entries
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

function tagStyle(tag: WorkTag) {
  return tag === 'work'
    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
    : 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
}

function TagBadge({ tag }: { tag: WorkTag }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
        tagStyle(tag),
      )}
    >
      {tag === 'work' ? <Briefcase className="w-3 h-3" /> : <User className="w-3 h-3" />}
      {tag}
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
    <span className="font-mono text-4xl font-semibold tabular-nums tracking-tight">
      {formatDuration(ms)}
    </span>
  )
}

// ── Active session card ────────────────────────────────────────────────────────

function ActiveCard({
  entry,
  onPause,
  onResume,
  onStop,
}: {
  entry: WorkEntry
  onPause: () => void
  onResume: () => void
  onStop: () => void
}) {
  const isPaused = entry.status === 'paused'

  return (
    <div className="mx-4 mb-4 rounded-2xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1.5 flex-1 min-w-0">
          <p className="text-sm font-semibold leading-snug text-foreground truncate">
            {entry.title}
          </p>
          <div className="flex items-center gap-2">
            <TagBadge tag={entry.tag} />
            <span className="text-xs text-muted-foreground">
              started {formatTime(entry.startedAt)}
            </span>
          </div>
        </div>
        {isPaused && (
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full shrink-0">
            paused
          </span>
        )}
      </div>

      <LiveTimer entry={entry} />

      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={isPaused ? onResume : onPause}
          className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-muted hover:bg-muted/80 text-sm font-medium transition-colors"
        >
          {isPaused ? (
            <><Play className="w-4 h-4" /> Resume</>
          ) : (
            <><Pause className="w-4 h-4" /> Pause</>
          )}
        </button>
        <button
          onClick={onStop}
          className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-destructive/10 hover:bg-destructive/20 text-destructive text-sm font-medium transition-colors"
        >
          <Square className="w-4 h-4" /> Stop
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

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const t = title.trim()
    if (!t) return
    onStart(t, tag)
    setTitle('')
  }

  return (
    <form onSubmit={handleSubmit} className="mx-4 mb-4 space-y-2">
      <input
        ref={inputRef}
        type="text"
        placeholder="What are you working on?"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full px-3 py-2.5 rounded-lg bg-muted border-0 outline-none text-sm placeholder:text-muted-foreground"
      />
      <div className="flex items-center gap-2">
        {/* Tag toggle */}
        <div className="flex gap-1 p-1 bg-muted rounded-lg flex-1">
          {(['work', 'personal'] as WorkTag[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTag(t)}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-1 px-2 rounded-md text-xs font-medium transition-colors',
                tag === t
                  ? 'bg-background shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground',
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
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-40 transition-opacity"
        >
          <Play className="w-3.5 h-3.5" />
          Start
        </button>
      </div>
    </form>
  )
}

// ── History ────────────────────────────────────────────────────────────────────

function HistoryEntry({
  entry,
  onRemove,
}: {
  entry: WorkEntry
  onRemove: () => void
}) {
  const doneMs =
    entry.endedAt && entry.startedAt
      ? new Date(entry.endedAt).getTime() -
        new Date(entry.startedAt).getTime() -
        entry.totalPausedMs
      : 0

  return (
    <div className="flex items-start gap-2 py-2 group">
      <div className="flex-1 min-w-0 space-y-0.5">
        <p className="text-sm font-medium text-foreground leading-snug truncate">
          {entry.title}
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          <TagBadge tag={entry.tag} />
          <span className="text-xs text-muted-foreground">
            {formatTime(entry.startedAt)}
            {entry.endedAt && ` – ${formatTime(entry.endedAt)}`}
          </span>
          <span className="text-xs text-muted-foreground font-mono">
            {formatDuration(doneMs)}
          </span>
        </div>
      </div>
      <button
        onClick={onRemove}
        className="p-1 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all shrink-0 mt-0.5"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

// ── Panel ──────────────────────────────────────────────────────────────────────

interface Props {
  open: boolean
  onClose: () => void
}

export function WorkLogPanel({ open, onClose }: Props) {
  const { entries, activeEntry, start, pause, resume, stop, remove } = useWorkLog()
  const groups = groupByDate(entries)

  // Close on Escape
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    if (open) window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px]"
          onClick={onClose}
        />
      )}

      {/* Panel */}
      <div
        className={cn(
          'fixed top-0 right-0 h-full w-full max-w-sm bg-background border-l border-border z-50',
          'flex flex-col shadow-2xl',
          'transition-transform duration-300 ease-in-out',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-border shrink-0">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <span className="font-semibold text-sm flex-1">Work Log</span>
          <kbd className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-mono">
            Ctrl+L
          </kbd>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Active session */}
          <div className="pt-4">
            {activeEntry ? (
              <ActiveCard
                entry={activeEntry}
                onPause={() => pause(activeEntry.id)}
                onResume={() => resume(activeEntry.id)}
                onStop={() => stop(activeEntry.id)}
              />
            ) : (
              <p className="px-4 pb-3 text-xs text-muted-foreground">No active session</p>
            )}
          </div>

          {/* Divider */}
          <div className="mx-4 mb-4 h-px bg-border" />

          {/* New entry form */}
          <NewEntryForm onStart={start} />

          {/* History */}
          {groups.length > 0 && (
            <div className="px-4 pb-8">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                History
              </p>
              <div className="space-y-4">
                {groups.map(([date, dateEntries]) => (
                  <div key={date}>
                    <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                      <ChevronRight className="w-3 h-3" />
                      {date}
                    </p>
                    <div className="divide-y divide-border">
                      {dateEntries.map((entry) => (
                        <HistoryEntry
                          key={entry.id}
                          entry={entry}
                          onRemove={() => remove(entry.id)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
