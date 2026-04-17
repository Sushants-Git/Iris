import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Sparkles, Link2, ListTodo, CheckSquare, Square, Loader2, X, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { aiApi, type AIParsedResult } from '@/lib/api-client'
import type { CreateItemPayload } from '@/lib/api-client'
import type { WorkTag } from '@/types/worklog'
import { cn } from '@/lib/utils'

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  onCreateItem: (payload: CreateItemPayload) => void
  onCreateTask: (title: string, tag: WorkTag, url?: string) => void
  getNewCardPos: () => { x: number; y: number }
}

export function AIParseModal({ open, onOpenChange, onCreateItem, onCreateTask, getNewCardPos }: Props) {
  const [text, setText] = useState('')
  const [result, setResult] = useState<AIParsedResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedLinks, setSelectedLinks] = useState<Set<number>>(new Set())
  const [selectedTasks, setSelectedTasks] = useState<Set<number>>(new Set())
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') handleClose()
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && !result) handleParse()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, result, text])

  useEffect(() => {
    if (open) {
      setTimeout(() => textareaRef.current?.focus(), 50)
    }
  }, [open])

  if (!open) return null

  async function handleParse() {
    if (!text.trim()) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await aiApi.parse(text.trim())
      setResult(res)
      setSelectedLinks(new Set(res.links.map((_, i) => i)))
      setSelectedTasks(new Set(res.tasks.map((_, i) => i)))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  function handleAdd() {
    if (!result) return
    let offset = 0
    result.links.forEach((link, i) => {
      if (!selectedLinks.has(i)) return
      const { x, y } = getNewCardPos()
      onCreateItem({
        type: 'link',
        url: link.url,
        customTitle: link.title,
        x: x + offset,
        y: y + offset,
        width: 280,
        height: 280,
      })
      offset += 20
    })
    result.tasks.forEach((task, i) => {
      if (!selectedTasks.has(i)) return
      onCreateTask(task.title, 'work', task.url ?? undefined)
    })
    handleClose()
  }

  function handleClose() {
    onOpenChange(false)
    setText('')
    setResult(null)
    setError(null)
    setSelectedLinks(new Set())
    setSelectedTasks(new Set())
  }

  function toggleLink(i: number) {
    setSelectedLinks((prev) => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })
  }

  function toggleTask(i: number) {
    setSelectedTasks((prev) => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })
  }

  function toggleAll(kind: 'links' | 'tasks') {
    if (!result) return
    if (kind === 'links') {
      setSelectedLinks((prev) =>
        prev.size === result.links.length ? new Set() : new Set(result.links.map((_, i) => i)),
      )
    } else {
      setSelectedTasks((prev) =>
        prev.size === result.tasks.length ? new Set() : new Set(result.tasks.map((_, i) => i)),
      )
    }
  }

  const totalSelected = selectedLinks.size + selectedTasks.size
  const hasResults = result && (result.links.length > 0 || result.tasks.length > 0)

  // Stop wheel/pointer/keyboard events from bubbling to canvas-level handlers.
  const stop = (e: React.SyntheticEvent) => e.stopPropagation()

  const modal = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-150"
      onWheel={stop}
      onPointerDown={stop}
    >
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={handleClose}
      />
      <div className="relative bg-background border border-border rounded-2xl shadow-2xl w-full max-w-xl flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-150">

        {/* Header */}
        <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-border shrink-0">
          <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-sm leading-tight">Add via AI</span>
            <span className="text-[11px] text-muted-foreground leading-tight">
              {result ? 'Review and pick what to add' : 'Extract links and tasks from any text'}
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
          {!result && (
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
                  {text.length > 0 ? `${text.length.toLocaleString()} characters` : 'Tip: works best with structured text'}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  <kbd className="px-1.5 py-0.5 rounded border border-border bg-muted/50 font-sans text-[10px]">⌘</kbd>
                  {' '}
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

          {hasResults && (
            <div className="p-5 space-y-5">
              {result.links.length > 0 && (
                <section>
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-1.5">
                      <Link2 className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Links — {result.links.length}
                      </span>
                      <span className="text-[11px] text-muted-foreground/60">→ canvas</span>
                    </div>
                    <button
                      onClick={() => toggleAll('links')}
                      className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {selectedLinks.size === result.links.length ? 'Deselect all' : 'Select all'}
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    {result.links.map((link, i) => {
                      const on = selectedLinks.has(i)
                      return (
                        <button
                          key={i}
                          onClick={() => toggleLink(i)}
                          className={cn(
                            'group w-full flex items-start gap-3 px-3 py-2.5 rounded-xl border text-left transition-all',
                            on
                              ? 'bg-primary/5 border-primary/30 shadow-sm'
                              : 'bg-background border-border/60 opacity-60 hover:opacity-100 hover:border-border',
                          )}
                        >
                          {on
                            ? <CheckSquare className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                            : <Square className="w-4 h-4 text-muted-foreground/70 shrink-0 mt-0.5" />}
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-foreground truncate">{link.title}</p>
                            <p className="text-xs text-muted-foreground truncate mt-0.5">{link.url}</p>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </section>
              )}

              {result.tasks.length > 0 && (
                <section>
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-1.5">
                      <ListTodo className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Tasks — {result.tasks.length}
                      </span>
                      <span className="text-[11px] text-muted-foreground/60">→ work log</span>
                    </div>
                    <button
                      onClick={() => toggleAll('tasks')}
                      className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {selectedTasks.size === result.tasks.length ? 'Deselect all' : 'Select all'}
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    {result.tasks.map((task, i) => {
                      const on = selectedTasks.has(i)
                      return (
                        <button
                          key={i}
                          onClick={() => toggleTask(i)}
                          className={cn(
                            'group w-full flex items-start gap-3 px-3 py-2.5 rounded-xl border text-left transition-all',
                            on
                              ? 'bg-primary/5 border-primary/30 shadow-sm'
                              : 'bg-background border-border/60 opacity-60 hover:opacity-100 hover:border-border',
                          )}
                        >
                          {on
                            ? <CheckSquare className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                            : <Square className="w-4 h-4 text-muted-foreground/70 shrink-0 mt-0.5" />}
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-foreground">{task.title}</p>
                            {task.url && (
                              <p className="text-xs text-muted-foreground truncate mt-0.5">{task.url}</p>
                            )}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </section>
              )}
            </div>
          )}

          {result && !hasResults && (
            <div className="px-5 py-10 text-center">
              <p className="text-sm text-muted-foreground">No links or tasks found in that text.</p>
              <p className="text-xs text-muted-foreground/70 mt-1">Try pasting something with URLs or action items.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-border flex items-center gap-2 shrink-0 bg-muted/20">
          {!result ? (
            <Button
              className="w-full"
              onClick={handleParse}
              disabled={!text.trim() || loading}
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Parsing…</>
              ) : (
                <><Sparkles className="w-4 h-4 mr-2" />Parse with AI</>
              )}
            </Button>
          ) : (
            <>
              <Button
                variant="ghost"
                onClick={() => { setResult(null); setError(null) }}
                className="shrink-0"
              >
                <ArrowLeft className="w-4 h-4 mr-1.5" />
                Back
              </Button>
              <Button
                className="flex-1"
                onClick={handleAdd}
                disabled={totalSelected === 0}
              >
                {totalSelected === 0
                  ? 'Select items to add'
                  : `Add ${totalSelected} item${totalSelected === 1 ? '' : 's'}`}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}
