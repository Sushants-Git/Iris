import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X, Briefcase, User, Link2, Plus, Trash2, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { Task, TaskReference, WorkTag } from '@/types/worklog'
import type { UpdateTaskPayload } from '@/lib/api-client'

interface Props {
  task: Task
  onSave: (id: string, patch: UpdateTaskPayload) => void
  onClose: () => void
}

export function TaskEditModal({ task, onSave, onClose }: Props) {
  const [title, setTitle] = useState(task.title)
  const [tag, setTag] = useState<WorkTag>(task.tag ?? 'work')
  const [url, setUrl] = useState(task.url ?? '')
  const [details, setDetails] = useState(task.details ?? '')
  const [references, setReferences] = useState<TaskReference[]>(task.references ?? [])
  const titleRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setTimeout(() => titleRef.current?.focus(), 50)
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') handleSave()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, tag, url, details, references])

  function handleSave() {
    const cleaned = references.filter((r) => r.url.trim())
    onSave(task.id, {
      title: title.trim() || task.title,
      tag,
      url: url.trim() || null,
      details: details.trim() || null,
      references: cleaned.map((r) => ({ title: r.title.trim() || r.url, url: r.url.trim() })),
    })
    onClose()
  }

  function addReference() {
    setReferences((prev) => [...prev, { title: '', url: '' }])
  }

  function updateReference(i: number, patch: Partial<TaskReference>) {
    setReferences((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))
  }

  function removeReference(i: number) {
    setReferences((prev) => prev.filter((_, idx) => idx !== i))
  }

  const stop = (e: React.SyntheticEvent) => e.stopPropagation()

  const modal = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-150"
      onWheel={stop}
      onPointerDown={stop}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-background border border-border rounded-2xl shadow-2xl w-full max-w-xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-150">

        {/* Header */}
        <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-border shrink-0">
          <div className="flex flex-col flex-1 min-w-0">
            <span className="font-semibold text-sm leading-tight">Edit task</span>
            <span className="text-[11px] text-muted-foreground leading-tight truncate">
              Added {new Date(task.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 p-5 space-y-5" onWheel={stop}>
          {/* Title */}
          <div>
            <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
              Title
            </label>
            <Input
              ref={titleRef}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Task title"
              className="rounded-xl"
            />
          </div>

          {/* Tag */}
          <div>
            <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
              Tag
            </label>
            <div className="flex gap-1 p-1 bg-muted rounded-xl max-w-xs">
              {(['work', 'personal'] as WorkTag[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTag(t)}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-medium transition-colors',
                    tag === t ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {t === 'work' ? <Briefcase className="w-3 h-3" /> : <User className="w-3 h-3" />}
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Primary URL */}
          <div>
            <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
              Primary link
            </label>
            <div className="relative">
              <Link2 className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <Input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://…"
                className="rounded-xl pl-8"
              />
            </div>
          </div>

          {/* Details */}
          <div>
            <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
              Details
            </label>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Notes, context, what needs to be done…"
              rows={5}
              className="w-full text-sm bg-muted/30 border border-border rounded-xl px-3.5 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-ring/60 placeholder:text-muted-foreground/60 leading-relaxed transition-shadow"
            />
          </div>

          {/* References */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                References — {references.length}
              </label>
              <button
                type="button"
                onClick={addReference}
                className="text-[11px] text-primary hover:underline flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Add link
              </button>
            </div>
            {references.length === 0 ? (
              <p className="text-xs text-muted-foreground/60 italic px-0.5">
                Attach related links, docs, or tickets.
              </p>
            ) : (
              <div className="space-y-2">
                {references.map((ref, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 p-2 rounded-xl border border-border bg-muted/20"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-muted-foreground mt-2.5 shrink-0" />
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <Input
                        type="text"
                        value={ref.title}
                        onChange={(e) => updateReference(i, { title: e.target.value })}
                        placeholder="Label (optional)"
                        className="rounded-lg h-8 text-xs"
                      />
                      <Input
                        type="url"
                        value={ref.url}
                        onChange={(e) => updateReference(i, { url: e.target.value })}
                        placeholder="https://…"
                        className="rounded-lg h-8 text-xs"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeReference(i)}
                      className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                      aria-label="Remove reference"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-border flex items-center gap-2 shrink-0 bg-muted/20">
          <p className="text-[11px] text-muted-foreground mr-auto">
            <kbd className="px-1.5 py-0.5 rounded border border-border bg-muted/50 font-sans text-[10px]">⌘</kbd>{' '}
            <kbd className="px-1.5 py-0.5 rounded border border-border bg-muted/50 font-sans text-[10px]">↵</kbd>
            {' to save'}
          </p>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={!title.trim()}>Save</Button>
        </div>
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}
