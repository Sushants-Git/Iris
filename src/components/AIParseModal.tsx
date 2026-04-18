import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Sparkles, Loader2, X, ArrowLeft, Plus, Trash2, ExternalLink, Briefcase, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { aiApi, type AIParsedResult } from '@/lib/api-client'
import type { WorkTag, TaskReference } from '@/types/worklog'
import { cn } from '@/lib/utils'

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  onCreateTask: (
    title: string,
    tag: WorkTag,
    url?: string,
    extra?: { details?: string; references?: TaskReference[] },
  ) => void
}

export function AIParseModal({ open, onOpenChange, onCreateTask }: Props) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [parsed, setParsed] = useState<AIParsedResult | null>(null)

  // Editable fields after parse
  const [title, setTitle] = useState('')
  const [tag, setTag] = useState<WorkTag>('work')
  const [details, setDetails] = useState('')
  const [references, setReferences] = useState<TaskReference[]>([])

  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') handleClose()
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        if (parsed) handleAdd()
        else handleParse()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, parsed, text, title, tag, details, references])

  useEffect(() => {
    if (open) setTimeout(() => textareaRef.current?.focus(), 50)
  }, [open])

  if (!open) return null

  async function handleParse() {
    if (!text.trim()) return
    setLoading(true)
    setError(null)
    setParsed(null)
    try {
      const res = await aiApi.parse(text.trim())
      setParsed(res)
      setTitle(res.title || 'Untitled task')
      setDetails(res.details || '')
      setReferences(res.references || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  function handleAdd() {
    if (!title.trim()) return
    const cleaned = references.filter((r) => r.url.trim())
    onCreateTask(title.trim(), tag, undefined, {
      details: details.trim() || undefined,
      references: cleaned.map((r) => ({ title: r.title.trim() || r.url, url: r.url.trim() })),
    })
    handleClose()
  }

  function handleClose() {
    onOpenChange(false)
    setText('')
    setParsed(null)
    setError(null)
    setTitle('')
    setDetails('')
    setReferences([])
    setTag('work')
  }

  function updateRef(i: number, patch: Partial<TaskReference>) {
    setReferences((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))
  }
  function removeRef(i: number) {
    setReferences((prev) => prev.filter((_, idx) => idx !== i))
  }
  function addRef() {
    setReferences((prev) => [...prev, { title: '', url: '' }])
  }

  const stop = (e: React.SyntheticEvent) => e.stopPropagation()

  const modal = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-150"
      onWheel={stop}
      onPointerDown={stop}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative bg-background border border-border rounded-2xl shadow-2xl w-full max-w-xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-150">

        {/* Header */}
        <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-border shrink-0">
          <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-sm leading-tight">Add via AI</span>
            <span className="text-[11px] text-muted-foreground leading-tight">
              {parsed ? 'Review and save as one task' : 'Turn a text blob into a task'}
            </span>
          </div>
          <button
            onClick={handleClose}
            className="ml-auto w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0" onWheel={stop}>
          {!parsed && (
            <div className="p-5">
              <textarea
                ref={textareaRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Paste a Slack thread, email, or notes here…"
                rows={8}
                className="w-full text-sm bg-muted/30 border border-border rounded-xl px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-ring/60 placeholder:text-muted-foreground/60 leading-relaxed transition-shadow"
              />
              <div className="flex items-center justify-between mt-2 px-0.5">
                <p className="text-[11px] text-muted-foreground">
                  {text.length > 0 ? `${text.length.toLocaleString()} characters` : 'AI will create one task with all links as references'}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  <kbd className="px-1.5 py-0.5 rounded border border-border bg-muted/50 font-sans text-[10px]">⌘</kbd>{' '}
                  <kbd className="px-1.5 py-0.5 rounded border border-border bg-muted/50 font-sans text-[10px]">↵</kbd>
                  {' to parse'}
                </p>
              </div>
              {error && (
                <div className="mt-3 px-3 py-2 rounded-lg bg-destructive/10 border border-destructive/20">
                  <p className="text-xs text-destructive">{error}</p>
                </div>
              )}
            </div>
          )}

          {parsed && (
            <div className="p-5 space-y-5">
              <div>
                <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Title</label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} className="rounded-xl" />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Tag</label>
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

              <div>
                <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Details</label>
                <textarea
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder="Context, what needs to be done…"
                  rows={4}
                  className="w-full text-sm bg-muted/30 border border-border rounded-xl px-3.5 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-ring/60 placeholder:text-muted-foreground/60 leading-relaxed transition-shadow"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    References — {references.length}
                  </label>
                  <button type="button" onClick={addRef} className="text-[11px] text-primary hover:underline flex items-center gap-1">
                    <Plus className="w-3 h-3" /> Add link
                  </button>
                </div>
                {references.length === 0 ? (
                  <p className="text-xs text-muted-foreground/60 italic px-0.5">No references.</p>
                ) : (
                  <div className="space-y-2">
                    {references.map((ref, i) => (
                      <div key={i} className="flex items-start gap-2 p-2 rounded-xl border border-border bg-muted/20">
                        <ExternalLink className="w-3.5 h-3.5 text-muted-foreground mt-2.5 shrink-0" />
                        <div className="flex-1 min-w-0 space-y-1.5">
                          <Input
                            type="text"
                            value={ref.title}
                            onChange={(e) => updateRef(i, { title: e.target.value })}
                            placeholder="Label"
                            className="rounded-lg h-8 text-xs"
                          />
                          <Input
                            type="url"
                            value={ref.url}
                            onChange={(e) => updateRef(i, { url: e.target.value })}
                            placeholder="https://…"
                            className="rounded-lg h-8 text-xs"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeRef(i)}
                          className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                          aria-label="Remove"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-border flex items-center gap-2 shrink-0 bg-muted/20">
          {!parsed ? (
            <Button className="w-full" onClick={handleParse} disabled={!text.trim() || loading}>
              {loading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Parsing…</>
              ) : (
                <><Sparkles className="w-4 h-4 mr-2" />Parse with AI</>
              )}
            </Button>
          ) : (
            <>
              <Button variant="ghost" onClick={() => setParsed(null)} className="shrink-0">
                <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
              </Button>
              <Button className="flex-1" onClick={handleAdd} disabled={!title.trim()}>
                Create task
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}
