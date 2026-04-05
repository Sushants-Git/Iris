import { useEffect, useRef, useState } from 'react'
import { Plus, RotateCcw, Minus } from 'lucide-react'
import { useCanvas } from '@/hooks/useCanvas'
import { CanvasCard } from './CanvasCard'
import { LinkCard } from './LinkCard'
import { NoteCard } from './NoteCard'
import { AddItemModal } from '@/components/modals/AddItemModal'
import { EditCardModal } from '@/components/modals/EditCardModal'
import { CommandSearch } from './CommandSearch'
import { Minimap } from './Minimap'
import { Button } from '@/components/ui/button'
import { screenToCanvas, isImageUrl } from '@/lib/utils'
import { previewApi } from '@/lib/api-client'
import type { Item } from '@/types'
import type { CreateItemPayload, UpdateItemPayload } from '@/lib/api-client'

const YOUTUBE_SIZE = { width: 220, height: 276 }

function isYouTubeUrl(url: string) {
  return url.includes('youtube.com') || url.includes('youtu.be')
}

interface Props {
  items: Item[]
  isLoading: boolean
  boardId: string
  onCreateItem: (payload: CreateItemPayload) => void
  onUpdateItem: (id: string, payload: UpdateItemPayload) => void
  onDeleteItem: (id: string) => void
}

export function Canvas({
  items,
  isLoading,
  boardId,
  onCreateItem,
  onUpdateItem,
  onDeleteItem,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const { transform, pan, zoom, reset, panTo } = useCanvas()
  const transformRef = useRef(transform)
  transformRef.current = transform

  const [addOpen, setAddOpen] = useState(false)
  const [editItem, setEditItem] = useState<Item | null>(null)
  const [pasting, setPasting] = useState(false)
  const [cmdOpen, setCmdOpen] = useState(false)
  const [highlightId, setHighlightId] = useState<string | null>(null)
  const [topIds, setTopIds] = useState<string[]>([])
  const [showMinimap, setShowMinimap] = useState(false)
  const minimapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Clear highlight and search when board changes (Canvas doesn't remount between boards)
  useEffect(() => {
    setHighlightId(null)
    setCmdOpen(false)
  }, [boardId])

  function flashMinimap() {
    setShowMinimap(true)
    if (minimapTimerRef.current) clearTimeout(minimapTimerRef.current)
    minimapTimerRef.current = setTimeout(() => setShowMinimap(false), 1200)
  }

  // ── Selection ───────────────────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [selectionRect, setSelectionRect] = useState<{ sx: number; sy: number; ex: number; ey: number } | null>(null)
  const selBoxRef = useRef<{ sx: number; sy: number; ex: number; ey: number } | null>(null)

  // ── Pan state ───────────────────────────────────────────────────────────────
  const [isPanning, setIsPanning] = useState(false)
  const panRef = useRef<{ startX: number; startY: number } | null>(null)
  const spaceRef = useRef(false)

  // ── Card click detection (distinguish click vs drag) ────────────────────────
  const cardClickRef = useRef<{ id: string; x: number; y: number } | null>(null)

  // ── Wheel zoom + trackpad pan ───────────────────────────────────────────────
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const handler = (e: WheelEvent) => {
      e.preventDefault()
      const rect = el.getBoundingClientRect()
      if (!e.ctrlKey && e.deltaMode === 0 && Math.abs(e.deltaX) + Math.abs(e.deltaY) < 200) {
        pan(-e.deltaX, -e.deltaY)
      } else {
        zoom(e.deltaY, e.clientX - rect.left, e.clientY - rect.top)
      }
      flashMinimap()
    }
    el.addEventListener('wheel', handler, { passive: false })
    return () => el.removeEventListener('wheel', handler)
  }, [zoom, pan])

  // ── Space + Delete key ──────────────────────────────────────────────────────
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (e.code === 'Space') {
        e.preventDefault()
        spaceRef.current = true
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIds.size > 0) {
        selectedIds.forEach((id) => onDeleteItem(id))
        setSelectedIds(new Set())
      }
    }
    function onKeyUp(e: KeyboardEvent) {
      if (e.code === 'Space') spaceRef.current = false
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [selectedIds, onDeleteItem])

  // ── Ctrl+V paste ────────────────────────────────────────────────────────────
  useEffect(() => {
    async function handlePaste(e: ClipboardEvent) {
      const active = document.activeElement
      if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) return
      if (document.querySelector('[role="dialog"]')) return

      const text = e.clipboardData?.getData('text/plain')?.trim()
      if (!text) return

      let isUrl = false
      try {
        const u = new URL(text)
        isUrl = u.protocol === 'http:' || u.protocol === 'https:'
      } catch { isUrl = false }

      const el = containerRef.current
      const rect = el?.getBoundingClientRect()
      const pos = rect
        ? screenToCanvas(rect.width / 2, rect.height / 2, transformRef.current)
        : { x: 100, y: 100 }

      if (isUrl) {
        if (isImageUrl(text)) {
          onCreateItem({ type: 'link', url: text, x: pos.x, y: pos.y, width: 280, height: 280 })
          return
        }
        const extraSize = isYouTubeUrl(text) ? YOUTUBE_SIZE : {}
        setPasting(true)
        try {
          const preview = await previewApi.fetch(text)
          onCreateItem({
            type: 'link',
            url: text,
            scrapedTitle: preview.title ?? undefined,
            scrapedDescription: preview.description ?? undefined,
            scrapedThumbnail: preview.thumbnail ?? undefined,
            x: pos.x,
            y: pos.y,
            ...extraSize,
          })
        } catch {
          onCreateItem({ type: 'link', url: text, x: pos.x, y: pos.y, ...extraSize })
        } finally {
          setPasting(false)
        }
      } else {
        onCreateItem({ type: 'note', noteContent: text, x: pos.x, y: pos.y })
      }
    }
    window.addEventListener('paste', handlePaste)
    return () => window.removeEventListener('paste', handlePaste)
  }, [onCreateItem])

  // ── Cmd+K / Ctrl+K search ───────────────────────────────────────────────────
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCmdOpen((v) => !v)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // ── Background pointer (pan or rubber-band select) ──────────────────────────
  function onBgPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    const target = e.target as HTMLElement
    if (target.closest('button, a, input, textarea, [data-card]')) return

    e.currentTarget.setPointerCapture(e.pointerId)

    // Middle mouse or space+left → pan
    if (e.button === 1 || (e.button === 0 && spaceRef.current)) {
      panRef.current = { startX: e.clientX, startY: e.clientY }
      setIsPanning(true)
      return
    }

    if (e.button !== 0) return

    // Left drag → rubber band selection
    const rect = containerRef.current!.getBoundingClientRect()
    const sx = e.clientX - rect.left
    const sy = e.clientY - rect.top
    selBoxRef.current = { sx, sy, ex: sx, ey: sy }
    setSelectionRect({ sx, sy, ex: sx, ey: sy })
  }

  function onBgPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (panRef.current) {
      pan(e.clientX - panRef.current.startX, e.clientY - panRef.current.startY)
      panRef.current = { startX: e.clientX, startY: e.clientY }
      flashMinimap()
      return
    }
    if (!selBoxRef.current) return

    const rect = containerRef.current!.getBoundingClientRect()
    const ex = e.clientX - rect.left
    const ey = e.clientY - rect.top
    selBoxRef.current = { ...selBoxRef.current, ex, ey }
    setSelectionRect({ ...selBoxRef.current })

    // Compute canvas-space bounds of rubber band
    const t = transformRef.current
    const x1 = (Math.min(selBoxRef.current.sx, ex) - t.x) / t.scale
    const y1 = (Math.min(selBoxRef.current.sy, ey) - t.y) / t.scale
    const x2 = (Math.max(selBoxRef.current.sx, ex) - t.x) / t.scale
    const y2 = (Math.max(selBoxRef.current.sy, ey) - t.y) / t.scale

    const next = new Set<string>()
    for (const item of items) {
      if (item.x < x2 && item.x + item.width > x1 && item.y < y2 && item.y + item.height > y1) {
        next.add(item.id)
      }
    }
    setSelectedIds(next)
  }

  function onBgPointerUp() {
    if (panRef.current) {
      panRef.current = null
      setIsPanning(false)
      return
    }
    if (selBoxRef.current) {
      const hasDragged =
        Math.abs(selBoxRef.current.ex - selBoxRef.current.sx) > 4 ||
        Math.abs(selBoxRef.current.ey - selBoxRef.current.sy) > 4
      if (!hasDragged) setSelectedIds(new Set())
      selBoxRef.current = null
      setSelectionRect(null)
    }
  }

  function handleCardPointerDown(e: React.PointerEvent, id: string) {
    cardClickRef.current = { id, x: e.clientX, y: e.clientY }
  }

  function handleCardPointerUp(e: React.PointerEvent, id: string, shiftKey: boolean) {
    const start = cardClickRef.current
    if (!start || start.id !== id) return
    const moved = Math.hypot(e.clientX - start.x, e.clientY - start.y)
    cardClickRef.current = null
    if (moved > 5) return // was a drag, not a click
    if (shiftKey) {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        return next
      })
    } else {
      setSelectedIds(new Set([id]))
    }
  }

  function getNewCardPos() {
    const el = containerRef.current
    if (!el) return { x: 100, y: 100 }
    const rect = el.getBoundingClientRect()
    return screenToCanvas(rect.width / 2, rect.height / 2, transform)
  }

  const cursor = isPanning ? 'grabbing' : spaceRef.current ? 'grab' : 'default'

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden bg-[radial-gradient(circle,_#e5e7eb_1px,_transparent_1px)] bg-[length:24px_24px]"
      style={{ touchAction: 'none', cursor }}
      onPointerDown={onBgPointerDown}
      onPointerMove={onBgPointerMove}
      onPointerUp={onBgPointerUp}
    >
      {/* World div */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
          transformOrigin: '0 0',
          willChange: 'transform',
        }}
      >
        {[...items].filter((item) => item.type !== 'subcategory').sort((a, b) => {
          const ai = topIds.indexOf(a.id)
          const bi = topIds.indexOf(b.id)
          if (ai === bi) return 0
          if (ai === -1) return -1
          if (bi === -1) return 1
          return ai - bi
        }).map((item) => (
          <div
            key={item.id}
            data-card="true"
            onPointerDown={(e) => handleCardPointerDown(e, item.id)}
            onPointerUp={(e) => handleCardPointerUp(e, item.id, e.shiftKey)}
          >
            <CanvasCard
              item={item}
              transform={transform}
              highlighted={item.id === highlightId}
              selected={selectedIds.has(item.id)}
              onUpdate={(payload) => onUpdateItem(item.id, payload)}
              onDelete={() => onDeleteItem(item.id)}
              onEdit={() => setEditItem(item)}
              onBringToFront={() => setTopIds((prev) => [...prev.filter((id) => id !== item.id), item.id])}
            >
              {item.type === 'link' ? (
                <LinkCard item={item} />
              ) : (
                <NoteCard
                  item={item}
                  onChange={(noteContent) => onUpdateItem(item.id, { noteContent })}
                />
              )}
            </CanvasCard>
          </div>
        ))}
      </div>

      {/* Rubber-band selection rect */}
      {selectionRect && (
        <div
          className="absolute pointer-events-none border border-primary/60 bg-primary/10 rounded-sm z-20"
          style={{
            left: Math.min(selectionRect.sx, selectionRect.ex),
            top: Math.min(selectionRect.sy, selectionRect.ey),
            width: Math.abs(selectionRect.ex - selectionRect.sx),
            height: Math.abs(selectionRect.ey - selectionRect.sy),
          }}
        />
      )}

      {/* Empty state */}
      {!isLoading && items.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 pointer-events-none select-none">
          <p className="text-muted-foreground text-sm font-medium">
            Press <kbd className="px-1.5 py-0.5 bg-muted border border-border rounded text-xs">⌘V</kbd> to paste a link, or click <span className="font-semibold">+</span> to add a card
          </p>
        </div>
      )}

      {pasting && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-background border border-border rounded-full px-4 py-1.5 text-sm text-muted-foreground shadow-sm z-20 flex items-center gap-2">
          <span className="w-3 h-3 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          Fetching preview…
        </div>
      )}

      {/* Cmd+K search */}
      {cmdOpen && (
        <CommandSearch
          items={items}
          onClose={() => setCmdOpen(false)}
          onSelect={(item) => {
            const el = containerRef.current
            if (el) {
              const rect = el.getBoundingClientRect()
              panTo(item.x + item.width / 2, item.y + item.height / 2, rect.width, rect.height)
            }
            setCmdOpen(false)
            setHighlightId(null)
            requestAnimationFrame(() => setHighlightId(item.id))
          }}
        />
      )}

      {/* Toolbar */}
      <div
        className="absolute bottom-5 right-5 flex gap-2 z-10"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <Button
          variant="outline"
          size="icon"
          className="rounded-full shadow-md bg-background"
          onClick={reset}
          title="Reset view"
        >
          <RotateCcw className="w-4 h-4" />
        </Button>
        <Button
          size="icon"
          className="rounded-full shadow-md w-10 h-10"
          onClick={() => setAddOpen(true)}
          title="Add card"
        >
          <Plus className="w-5 h-5" />
        </Button>
      </div>

      {selectedIds.size > 1 && (
        <div
          className="absolute bottom-5 left-1/2 -translate-x-1/2 bg-background border border-border rounded-full px-3 py-1.5 text-xs text-muted-foreground shadow-sm z-10 flex items-center gap-2 select-none"
          onPointerDown={(e) => e.stopPropagation()}
        >
          {selectedIds.size} selected
          <button
            onClick={() => {
              selectedIds.forEach((id) => onDeleteItem(id))
              setSelectedIds(new Set())
            }}
            className="text-destructive hover:text-destructive/80 font-medium"
          >
            Delete
          </button>
        </div>
      )}

      <AddItemModal
        open={addOpen}
        onOpenChange={setAddOpen}
        onAdd={(payload) => {
          const { x, y } = getNewCardPos()
          onCreateItem({ ...payload, x, y })
        }}
      />

      {editItem && (
        <EditCardModal
          item={editItem}
          open={!!editItem}
          onOpenChange={(v) => { if (!v) setEditItem(null) }}
          onSave={(payload) => {
            onUpdateItem(editItem.id, payload)
            setEditItem(null)
          }}
        />
      )}

      {/* Zoom controls */}
      <div
        className="group absolute bottom-5 left-5 flex items-center bg-background/80 border border-border rounded-md shadow-sm z-10 overflow-hidden select-none"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <button
          className="w-0 group-hover:w-7 opacity-0 group-hover:opacity-100 transition-all duration-150 flex items-center justify-center h-7 text-muted-foreground hover:text-foreground hover:bg-muted shrink-0 overflow-hidden"
          onClick={() => {
            const el = containerRef.current
            if (!el) return
            const { width, height } = el.getBoundingClientRect()
            zoom(150, width / 2, height / 2)
          }}
        >
          <Minus className="w-3 h-3 shrink-0" />
        </button>
        <button
          className="px-2 h-7 text-xs text-muted-foreground hover:text-foreground transition-colors"
          onClick={reset}
          title="Reset zoom"
        >
          {Math.round(transform.scale * 100)}%
        </button>
        <button
          className="w-0 group-hover:w-7 opacity-0 group-hover:opacity-100 transition-all duration-150 flex items-center justify-center h-7 text-muted-foreground hover:text-foreground hover:bg-muted shrink-0 overflow-hidden"
          onClick={() => {
            const el = containerRef.current
            if (!el) return
            const { width, height } = el.getBoundingClientRect()
            zoom(-150, width / 2, height / 2)
          }}
        >
          <Plus className="w-3 h-3 shrink-0" />
        </button>
      </div>

      {/* Minimap — visible only while moving */}
      <div className={`transition-opacity duration-300 ${showMinimap ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <Minimap
          items={items}
          transform={transform}
          viewportW={containerRef.current?.clientWidth ?? 800}
          viewportH={containerRef.current?.clientHeight ?? 600}
          onPanTo={(cx, cy) => {
            const el = containerRef.current
            if (!el) return
            panTo(cx, cy, el.clientWidth, el.clientHeight)
          }}
        />
      </div>
    </div>
  )
}
