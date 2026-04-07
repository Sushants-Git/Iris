import { useState, useEffect, useRef } from 'react'
import { X, Play, Pause, Square, Trash2, Clock, Briefcase, User, ChevronRight, FileText } from 'lucide-react'
import { useWorkLog, getActiveMs, formatDuration } from '@/hooks/useWorkLog'
import { WorkNoteModal } from './WorkNoteModal'
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
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
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
  return Math.max(
    0,
    new Date(e.endedAt).getTime() - new Date(e.startedAt).getTime() - e.totalPausedMs,
  )
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

// ── Day totals summary ────────────────────────────────────────────────────────

function DaySummary({ entries }: { entries: WorkEntry[] }) {
  const workMs = entries
    .filter((e) => e.tag === 'work')
    .reduce((sum, e) => sum + entryActiveMs(e), 0)
  const personalMs = entries
    .filter((e) => e.tag === 'personal')
    .reduce((sum, e) => sum + entryActiveMs(e), 0)

  if (workMs === 0 && personalMs === 0) return null

  return (
    <div className="flex items-center gap-3 mt-0.5 mb-1">
      {workMs > 0 && (
        <span className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 font-medium">
          <Briefcase className="w-3 h-3" />
          {formatDuration(workMs)}
        </span>
      )}
      {personalMs > 0 && (
        <span className="flex items-center gap-1 text-xs text-purple-600 dark:text-purple-400 font-medium">
          <User className="w-3 h-3" />
          {formatDuration(personalMs)}
        </span>
      )}
    </div>
  )
}

// ── Live timer ────────────────────────────────────────────────────────────────

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

// ── Active session card ───────────────────────────────────────────────────────

function ActiveCard({
  entry,
  onPause,
  onResume,
  onStop,
  onNotes,
}: {
  entry: WorkEntry
  onPause: () => void
  onResume: () => void
  onStop: () => void
  onNotes: () => void
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
        <div className="flex items-center gap-1 shrink-0">
          {isPaused && (
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              paused
            </span>
          )}
          <button
            onClick={onNotes}
            className={cn(
              'p-1.5 rounded-md transition-colors',
              entry.notes
                ? 'text-primary hover:bg-primary/10'
                : 'text-muted-foreground hover:bg-muted',
            )}
            title="Notes"
          >
            <FileText className="w-3.5 h-3.5" />
          </button>
        </div>
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

// ── New entry form ────────────────────────────────────────────────────────────

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

// ── History entry ─────────────────────────────────────────────────────────────

function HistoryEntry({
  entry,
  onRemove,
  onNotes,
}: {
  entry: WorkEntry
  onRemove: () => void
  onNotes: () => void
}) {
  const doneMs = entryActiveMs(entry)
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
          <span className="text-xs text-muted-foreground font-mono">{formatDuration(doneMs)}</span>
        </div>
      </div>
      <div className="flex items-center gap-0.5 shrink-0 mt-0.5">
        <button
          onClick={onNotes}
          className={cn(
            'p-1 transition-colors',
            entry.notes
              ? 'text-primary opacity-100'
              : 'text-muted-foreground opacity-0 group-hover:opacity-100',
          )}
          title="Notes"
        >
          <FileText className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onRemove}
          className="p-1 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

// ── Panel ─────────────────────────────────────────────────────────────────────

export function WorkLogPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { entries, activeEntry, loading, start, pause, resume, stop, remove, updateNotes } = useWorkLog()
  const groups = groupByDate(entries)
  const [notesEntryId, setNotesEntryId] = useState<string | null>(null)

  const notesEntry = notesEntryId ? entries.find((e) => e.id === notesEntryId) ?? null : null
  const relatedEntries = notesEntry
    ? entries.filter(
        (e) => e.id !== notesEntry.id && e.title === notesEntry.title && !!e.notes,
      )
    : []

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
        <div
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px]"
          onClick={onClose}
        />
      )}

      <div
        className={cn(
          'fixed top-0 right-0 h-full w-full max-w-sm bg-background border-l border-border z-50',
          'flex flex-col shadow-2xl transition-transform duration-300 ease-in-out',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-border shrink-0">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <span className="font-semibold text-sm flex-1">Work Log</span>
          <kbd className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-mono">
            Ctrl+I
          </kbd>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

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

          <div className="mx-4 mb-4 h-px bg-border" />

          <NewEntryForm onStart={start} />

          {loading && (
            <p className="px-4 text-xs text-muted-foreground animate-pulse">Loading history…</p>
          )}

          {!loading && groups.length > 0 && (
            <div className="px-4 pb-8">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                History
              </p>
              <div className="space-y-5">
                {groups.map(([date, dateEntries]) => (
                  <div key={date}>
                    {/* Date header + daily totals */}
                    <div className="mb-1">
                      <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                        <ChevronRight className="w-3 h-3" />
                        {date}
                      </p>
                      <DaySummary entries={dateEntries} />
                    </div>
                    <div className="divide-y divide-border">
                      {dateEntries.map((entry) => (
                        <HistoryEntry
                          key={entry.id}
                          entry={entry}
                          onRemove={() => remove(entry.id)}
                          onNotes={() => setNotesEntryId(entry.id)}
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
