import { useRef, useEffect, useState } from 'react'
import { X } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { WYSIWYGEditor } from './WYSIWYGEditor'
import type { WorkEntry, StandaloneNote, Task } from '@/types/worklog'

// ── Session note mode ─────────────────────────────────────────────────────────

interface SessionNoteProps {
  mode: 'session'
  entry: WorkEntry
  relatedEntries: WorkEntry[]
  onSave: (notes: string) => void
  onClose: () => void
}

// ── Standalone note mode ──────────────────────────────────────────────────────

interface StandaloneNoteProps {
  mode: 'standalone'
  note: StandaloneNote
  tasks: Task[]
  onSave: (patch: { title: string; content: string; taskId: string | null }) => void
  onClose: () => void
}

type Props = SessionNoteProps | StandaloneNoteProps

export function NoteModal(props: Props) {
  const { onClose } = props

  // ── Session note state ──
  const sessionDraftRef = useRef(props.mode === 'session' ? (props.entry.notes ?? '') : '')
  const sessionOrigRef = useRef(props.mode === 'session' ? (props.entry.notes ?? '') : '')

  // ── Standalone note state ──
  const [standaloneTitle, setStandaloneTitle] = useState(props.mode === 'standalone' ? props.note.title : '')
  const standaloneContentRef = useRef(props.mode === 'standalone' ? props.note.content : '')
  const [standaloneTaskId, setStandaloneTaskId] = useState<string | null>(props.mode === 'standalone' ? props.note.taskId : null)

  function handleSaveAndClose() {
    if (props.mode === 'session') {
      props.onSave(sessionDraftRef.current)
      sessionOrigRef.current = sessionDraftRef.current
    } else {
      props.onSave({ title: standaloneTitle, content: standaloneContentRef.current, taskId: standaloneTaskId })
    }
    onClose()
  }

  // Auto-save session note on unmount
  useEffect(() => {
    if (props.mode !== 'session') return
    return () => {
      if (sessionDraftRef.current !== sessionOrigRef.current) {
        props.onSave(sessionDraftRef.current)
      }
    }
  }, [props.mode]) // eslint-disable-line react-hooks/exhaustive-deps

  // Escape key
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') handleSaveAndClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [standaloneTitle, standaloneTaskId]) // eslint-disable-line react-hooks/exhaustive-deps

  const title = props.mode === 'session' ? props.entry.title : standaloneTitle
  const initialContent = props.mode === 'session' ? (props.entry.notes ?? '') : props.note.content

  const linkedTask = props.mode === 'standalone' && standaloneTaskId
    ? props.tasks.find((t) => t.id === standaloneTaskId)
    : null

  return (
    <div
      className="fixed inset-y-0 left-0 bg-background border-r border-border flex flex-col"
      style={{ right: '24rem', zIndex: 60 }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-4 border-b border-border shrink-0 h-14">
        {props.mode === 'standalone' ? (
          <Input
            value={standaloneTitle}
            onChange={(e) => setStandaloneTitle(e.target.value)}
            placeholder="Untitled note"
            className="flex-1 border-0 shadow-none focus-visible:ring-0 px-0 text-base font-semibold bg-transparent"
          />
        ) : (
          <p className="flex-1 text-base font-semibold truncate text-foreground">{title}</p>
        )}

        {/* Task link selector (standalone only) */}
        {props.mode === 'standalone' && props.tasks.length > 0 && (
          <select
            value={standaloneTaskId ?? ''}
            onChange={(e) => setStandaloneTaskId(e.target.value || null)}
            className="text-xs border border-border rounded-md px-2 py-1 bg-background text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring max-w-[150px]"
          >
            <option value="">No task link</option>
            {props.tasks.map((t) => (
              <option key={t.id} value={t.id}>{t.title}</option>
            ))}
          </select>
        )}

        <Button variant="ghost" size="icon-sm" onClick={handleSaveAndClose}>
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Task badge (standalone, when linked) */}
      {linkedTask && (
        <div className="px-5 pt-3 shrink-0">
          <span className="inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
            <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
            {linkedTask.title}
          </span>
        </div>
      )}

      {/* WYSIWYG Editor — fills all remaining height */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <WYSIWYGEditor
          value={initialContent}
          onChange={(md) => {
            if (props.mode === 'session') sessionDraftRef.current = md
            else standaloneContentRef.current = md
          }}
          placeholder="Write something… **bold**, *italic*, # heading, - list"
          autoFocus
        />

        {/* Related session notes */}
        {props.mode === 'session' && props.relatedEntries.length > 0 && (
          <div className="px-5 pb-6 border-t border-border mt-1 pt-4 space-y-4 max-w-2xl">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Notes from past sessions
            </p>
            {props.relatedEntries.map((e) => (
              <div key={e.id} className="space-y-1">
                <p className="text-xs text-muted-foreground">
                  {new Date(e.startedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
                <div className="md-prose opacity-70">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{e.notes!}</ReactMarkdown>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
