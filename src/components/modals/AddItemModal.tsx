import { useState } from 'react'
import { Loader2, Link2, FileText } from 'lucide-react'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { previewApi } from '@/lib/api-client'
import type { CreateItemPayload } from '@/lib/api-client'
import type { PreviewResult } from '@/types'

type Mode = 'link' | 'note'

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  onAdd: (payload: CreateItemPayload) => void
}

export function AddItemModal({ open, onOpenChange, onAdd }: Props) {
  const isMobile = useMediaQuery('(max-width: 768px)')
  const [mode, setMode] = useState<Mode>('link')
  const [url, setUrl] = useState('')
  const [noteContent, setNoteContent] = useState('')
  const [preview, setPreview] = useState<PreviewResult | null>(null)
  const [fetching, setFetching] = useState(false)

  function reset() {
    setUrl('')
    setNoteContent('')
    setPreview(null)
    setFetching(false)
  }

  function handleClose(v: boolean) {
    if (!v) reset()
    onOpenChange(v)
  }

  async function fetchPreview(rawUrl: string) {
    if (isMobile) return
    const trimmed = rawUrl.trim()
    if (!trimmed) { setPreview(null); return }
    try {
      new URL(trimmed)
    } catch {
      setPreview(null)
      return
    }
    setFetching(true)
    try {
      const result = await previewApi.fetch(trimmed)
      setPreview(result)
    } catch {
      setPreview({ ok: false, fallback: true })
    } finally {
      setFetching(false)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (mode === 'link') {
      const trimmed = url.trim()
      if (!trimmed) return
      const isYouTube = trimmed.includes('youtube.com') || trimmed.includes('youtu.be')
      onAdd({
        type: 'link',
        url: trimmed,
        scrapedTitle: preview?.title ?? undefined,
        scrapedDescription: preview?.description ?? undefined,
        scrapedThumbnail: preview?.thumbnail ?? undefined,
        ...(isYouTube ? { width: 220, height: 276 } : {}),
      })
    } else {
      if (!noteContent.trim()) return
      onAdd({ type: 'note', noteContent: noteContent.trim() })
    }
    handleClose(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md top-[8%] sm:top-1/2 translate-y-0 sm:-translate-y-1/2">
        <DialogHeader>
          <DialogTitle>Add to Canvas</DialogTitle>
        </DialogHeader>

        {/* Mode toggle */}
        <div className="flex gap-1 p-1 bg-muted rounded-lg">
          <button
            type="button"
            onClick={() => setMode('link')}
            className={`flex-1 flex items-center justify-center gap-2 py-1.5 px-3 rounded-md text-sm font-medium transition-colors ${
              mode === 'link'
                ? 'bg-background shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Link2 className="w-3.5 h-3.5" />
            Link
          </button>
          <button
            type="button"
            onClick={() => setMode('note')}
            className={`flex-1 flex items-center justify-center gap-2 py-1.5 px-3 rounded-md text-sm font-medium transition-colors ${
              mode === 'note'
                ? 'bg-background shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Note
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'link' ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="url">URL</Label>
                <div className="relative">
                  <Input
                    id="url"
                    type="text"
                    inputMode="url"
                    autoCapitalize="off"
                    autoCorrect="off"
                    autoComplete="off"
                    placeholder="https://…"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    onBlur={(e) => fetchPreview(e.target.value)}
                    autoFocus
                  />
                  {fetching && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
                  )}
                </div>
              </div>

              {/* Preview — desktop only */}
              {!isMobile && preview && preview.ok && (
                <div className="border border-border rounded-lg overflow-hidden">
                  {preview.thumbnail && (
                    <img
                      src={preview.thumbnail}
                      alt=""
                      className="w-full h-28 object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = 'none'
                      }}
                    />
                  )}
                  <div className="p-3 space-y-0.5">
                    {preview.title && preview.title !== url.trim() && (
                      <p className="text-sm font-medium line-clamp-1">{preview.title}</p>
                    )}
                    {preview.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {preview.description}
                      </p>
                    )}
                  </div>
                </div>
              )}
              {!isMobile && preview && preview.fallback && (
                <p className="text-xs text-muted-foreground">
                  Could not load preview — will show as a plain link card.
                </p>
              )}
            </>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="note">Note</Label>
              <Textarea
                id="note"
                placeholder="Write something…"
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                rows={5}
                autoFocus
              />
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => handleClose(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                fetching ||
                (mode === 'link' ? !url.trim() : !noteContent.trim())
              }
            >
              Add
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
