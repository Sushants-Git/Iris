import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Button } from '@/components/ui/button'
import { WYSIWYGEditor } from './WYSIWYGEditor'
import type { WorkEntry } from '@/types/worklog'

interface Props {
  entry: WorkEntry
  relatedEntries: WorkEntry[]
  onSave: (notes: string) => void
  onClose: () => void
}

export function WorkNoteModal({ entry, relatedEntries, onSave, onClose }: Props) {
  const draftRef = useRef(entry.notes ?? '')
  const originalRef = useRef(entry.notes ?? '')

  // Save on unmount if changed
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
        if (draftRef.current !== originalRef.current) onSave(draftRef.current)
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onSave, onClose])

  function handleSaveAndClose() {
    onSave(draftRef.current)
    originalRef.current = draftRef.current
    onClose()
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 backdrop-blur-[2px]"
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
          <Button variant="ghost" size="icon-sm" onClick={handleSaveAndClose}>
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* WYSIWYG Editor */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <WYSIWYGEditor
            value={entry.notes ?? ''}
            onChange={(md) => { draftRef.current = md }}
            placeholder="Add notes… (bold, italics, lists all work)"
            autoFocus
          />

          {/* Past sessions with same title */}
          {relatedEntries.length > 0 && (
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
          <p className="text-xs text-muted-foreground">Saved automatically · markdown supported</p>
          <Button size="sm" onClick={handleSaveAndClose}>Done</Button>
        </div>
      </div>
    </>
  )
}
