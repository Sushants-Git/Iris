import { useState, useEffect, useRef } from 'react'
import { X, Eye, Pencil } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cn } from '@/lib/utils'
import type { WorkEntry } from '@/types/worklog'

interface Props {
  entry: WorkEntry
  relatedEntries: WorkEntry[]   // same title, different id, with notes
  onSave: (notes: string) => void
  onClose: () => void
}

export function WorkNoteModal({ entry, relatedEntries, onSave, onClose }: Props) {
  const [draft, setDraft] = useState(entry.notes ?? '')
  const [preview, setPreview] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Autofocus textarea on open
  useEffect(() => {
    if (!preview) setTimeout(() => textareaRef.current?.focus(), 30)
  }, [preview])

  // Save on unmount if changed
  const draftRef = useRef(draft)
  draftRef.current = draft
  const originalRef = useRef(entry.notes ?? '')
  useEffect(() => {
    return () => {
      if (draftRef.current !== originalRef.current) {
        onSave(draftRef.current)
      }
    }
  }, [onSave])

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (draft !== originalRef.current) onSave(draft)
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [draft, onSave, onClose])

  function handleSaveAndClose() {
    onSave(draft)
    originalRef.current = draft
    onClose()
  }

  const hasRelated = relatedEntries.length > 0

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-[2px]"
        style={{ zIndex: 60 }}
        onClick={handleSaveAndClose}
      />

      {/* Modal */}
      <div
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-xl bg-background border border-border rounded-2xl shadow-2xl flex flex-col"
        style={{ zIndex: 70, maxHeight: '80vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border shrink-0">
          <p className="flex-1 text-sm font-semibold truncate text-foreground">{entry.title}</p>
          <button
            onClick={() => setPreview((v) => !v)}
            className={cn(
              'p-1.5 rounded-md text-muted-foreground transition-colors',
              preview ? 'bg-muted text-foreground' : 'hover:bg-muted',
            )}
            title={preview ? 'Edit' : 'Preview'}
          >
            {preview ? <Pencil className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={handleSaveAndClose}
            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Editor / Preview */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {preview ? (
            <div className="px-4 py-3">
              {draft.trim() ? (
                <div className="md-prose">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{draft}</ReactMarkdown>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">Nothing to preview.</p>
              )}
            </div>
          ) : (
            <textarea
              ref={textareaRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Add notes… (markdown supported)"
              className="w-full h-full min-h-[200px] px-4 py-3 text-sm bg-transparent outline-none resize-none placeholder:text-muted-foreground font-mono leading-relaxed"
              style={{ minHeight: '200px' }}
            />
          )}

          {/* Past sessions with same title */}
          {hasRelated && (
            <div className="px-4 pb-4 border-t border-border mt-1 pt-3 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Notes from past sessions
              </p>
              {relatedEntries.map((e) => (
                <div key={e.id} className="space-y-1">
                  <p className="text-xs text-muted-foreground">
                    {new Date(e.startedAt).toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric', year: 'numeric',
                    })}
                  </p>
                  <div className="md-prose opacity-70">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{e.notes!}</ReactMarkdown>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-border shrink-0">
          <p className="text-xs text-muted-foreground">Saved automatically on close</p>
          <button
            onClick={handleSaveAndClose}
            className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium transition-opacity hover:opacity-90"
          >
            Done
          </button>
        </div>
      </div>
    </>
  )
}
