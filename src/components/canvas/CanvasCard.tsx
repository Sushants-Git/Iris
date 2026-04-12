import { useRef, useState, useEffect, useLayoutEffect, memo } from 'react'
import { Trash2, GripHorizontal, Pencil, RotateCw, BringToFront } from 'lucide-react'
import { cn, isImageUrl } from '@/lib/utils'
import { CardStatusBadge } from './CardStatusBadge'
import type { Item, Status } from '@/types'
import type { CanvasTransform } from '@/hooks/useCanvas'
import type { RefObject } from 'react'

const MIN_W = 220
const MIN_H = 140

interface Props {
  item: Item
  transformRef: RefObject<CanvasTransform>
  highlighted?: boolean
  selected?: boolean
  onUpdate: (payload: {
    x?: number
    y?: number
    width?: number
    height?: number
    rotation?: number
    status?: Status
  }) => void
  onDelete: () => void
  onEdit: () => void
  onBringToFront: () => void
  children: React.ReactNode
}

export const CanvasCard = memo(function CanvasCard({
  item,
  transformRef,
  highlighted,
  selected,
  onUpdate,
  onDelete,
  onEdit,
  onBringToFront,
  children,
}: Props) {
  const cardRef = useRef<HTMLDivElement>(null)

  // ── Position + size owned entirely by direct DOM — never in React style props ─
  // React's reconciler never writes left/top/width/height, so our imperative
  // updates during drag/resize can never be overwritten by a re-render.
  const posRef  = useRef({ x: item.x,     y: item.y      })
  const sizeRef = useRef({ w: item.width, h: item.height })

  function applyPos(x: number, y: number) {
    posRef.current = { x, y }
    if (cardRef.current) {
      cardRef.current.style.left = `${x}px`
      cardRef.current.style.top  = `${y}px`
    }
  }

  function applySize(w: number, h: number) {
    sizeRef.current = { w, h }
    if (cardRef.current) {
      cardRef.current.style.width  = `${w}px`
      cardRef.current.style.height = `${h}px`
    }
  }

  // Set position + size before first paint — no 0,0 flash
  useLayoutEffect(() => {
    applyPos(item.x, item.y)
    applySize(item.width, item.height)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Sync from server, but never interrupt an active drag or resize
  useEffect(() => {
    if (!dragRef.current)   applyPos(item.x, item.y)
  }, [item.x, item.y])       // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!resizeRef.current) applySize(item.width, item.height)
  }, [item.width, item.height]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── React state — only for things that genuinely need re-renders ────────────
  const [rotation,  setRotation]  = useState(item.rotation ?? 0)
  const [showSize,  setShowSize]  = useState(false)
  const [sizeLabel, setSizeLabel] = useState({ w: item.width, h: item.height })
  const [animating, setAnimating] = useState(false)
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => { setRotation(item.rotation ?? 0) }, [item.rotation])

  useEffect(() => {
    if (!highlighted) return
    setAnimating(false)
    requestAnimationFrame(() => setAnimating(true))
    const t = setTimeout(() => setAnimating(false), 900)
    return () => clearTimeout(t)
  }, [highlighted])

  // ── Interaction refs ────────────────────────────────────────────────────────
  const dragRef   = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null)
  const resizeRef = useRef<{ startX: number; startY: number; origW: number; origH: number } | null>(null)
  const rotateRef = useRef<{ startAngle: number; startRotation: number; current: number } | null>(null)

  // ── Rotation ────────────────────────────────────────────────────────────────
  function onRotatePointerDown(e: React.PointerEvent) {
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    const rect = cardRef.current!.getBoundingClientRect()
    const cx = rect.left + rect.width  / 2
    const cy = rect.top  + rect.height / 2
    rotateRef.current = {
      startAngle:    Math.atan2(e.clientY - cy, e.clientX - cx) * (180 / Math.PI),
      startRotation: rotation,
      current:       rotation,
    }
  }
  function onRotatePointerMove(e: React.PointerEvent) {
    if (!rotateRef.current) return
    const rect = cardRef.current!.getBoundingClientRect()
    const cx = rect.left + rect.width  / 2
    const cy = rect.top  + rect.height / 2
    let next = rotateRef.current.startRotation +
      Math.atan2(e.clientY - cy, e.clientX - cx) * (180 / Math.PI) -
      rotateRef.current.startAngle
    if (e.shiftKey) next = Math.round(next / 15) * 15
    rotateRef.current.current = next
    setRotation(next)
  }
  function onRotatePointerUp() {
    if (!rotateRef.current) return
    onUpdate({ rotation: rotateRef.current.current })
    rotateRef.current = null
  }

  // ── Drag ────────────────────────────────────────────────────────────────────
  function onDragPointerDown(e: React.PointerEvent) {
    if (e.button !== 0) return
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX:  posRef.current.x,
      origY:  posRef.current.y,
    }
  }
  function onDragPointerMove(e: React.PointerEvent) {
    if (!dragRef.current) return
    const s = transformRef.current?.scale ?? 1
    applyPos(
      dragRef.current.origX + (e.clientX - dragRef.current.startX) / s,
      dragRef.current.origY + (e.clientY - dragRef.current.startY) / s,
    )
  }
  function onDragPointerUp(e: React.PointerEvent) {
    if (!dragRef.current) return
    const s = transformRef.current?.scale ?? 1
    const x = dragRef.current.origX + (e.clientX - dragRef.current.startX) / s
    const y = dragRef.current.origY + (e.clientY - dragRef.current.startY) / s
    dragRef.current = null
    applyPos(x, y)
    onUpdate({ x, y })
  }

  // ── Resize ──────────────────────────────────────────────────────────────────
  function onResizePointerDown(e: React.PointerEvent) {
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    resizeRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origW:  sizeRef.current.w,
      origH:  sizeRef.current.h,
    }
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    setShowSize(true)
  }
  function onResizePointerMove(e: React.PointerEvent) {
    if (!resizeRef.current) return
    const s = transformRef.current?.scale ?? 1
    const w = Math.max(MIN_W, resizeRef.current.origW + (e.clientX - resizeRef.current.startX) / s)
    const h = Math.max(MIN_H, resizeRef.current.origH + (e.clientY - resizeRef.current.startY) / s)
    applySize(w, h)
    setSizeLabel({ w, h })
  }
  function onResizePointerUp(e: React.PointerEvent) {
    if (!resizeRef.current) return
    const s = transformRef.current?.scale ?? 1
    const w = Math.max(MIN_W, resizeRef.current.origW + (e.clientX - resizeRef.current.startX) / s)
    const h = Math.max(MIN_H, resizeRef.current.origH + (e.clientY - resizeRef.current.startY) / s)
    resizeRef.current = null
    applySize(w, h)
    setSizeLabel({ w, h })
    onUpdate({ width: w, height: h })
    hideTimerRef.current = setTimeout(() => setShowSize(false), 2000)
  }

  const isImage = item.type === 'link' && !!item.url && isImageUrl(item.url)

  return (
    <div
      ref={cardRef}
      style={{
        position: 'absolute',
        // left / top / width / height are intentionally absent from this style object.
        // They are set imperatively by applyPos/applySize (and initialised by
        // useLayoutEffect) so React's reconciler never touches them and can never
        // overwrite our in-flight drag/resize values.
        transform: rotation ? `rotate(${rotation}deg)` : undefined,
        transformOrigin: 'center',
      }}
      className="group"
    >
      {isImage && (
        <div
          className="absolute -top-7 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-background border border-border shadow-sm cursor-grab active:cursor-grabbing flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
          onPointerDown={onRotatePointerDown}
          onPointerMove={onRotatePointerMove}
          onPointerUp={onRotatePointerUp}
        >
          <RotateCw className="w-3 h-3 text-muted-foreground" />
        </div>
      )}

      <div
        className={cn(
          'w-full h-full bg-card border border-border/70 rounded-xl flex flex-col overflow-hidden',
          animating && 'card-highlight',
        )}
        style={{
          boxShadow: selected
            ? '0 0 0 2px var(--color-primary, #8b2045), 0 4px 20px -4px oklch(0.375 0.155 12 / 0.2)'
            : dragRef.current || resizeRef.current
            ? '0 8px 32px -8px oklch(0.375 0.155 12 / 0.25)'
            : '0 1px 8px -2px oklch(0.78 0.04 308 / 0.18), 0 0 0 1px oklch(0.78 0.04 305 / 0.12)',
        }}
      >
        {showSize && (
          <div className="absolute bottom-5 left-2 z-10 pointer-events-none">
            <div className="px-2 py-0.5 rounded-md bg-foreground/80 text-background text-xs font-mono tabular-nums shadow-sm select-all backdrop-blur-sm">
              {Math.round(sizeLabel.w)} × {Math.round(sizeLabel.h)}
            </div>
          </div>
        )}

        <div
          onPointerDown={onDragPointerDown}
          onPointerMove={onDragPointerMove}
          onPointerUp={onDragPointerUp}
          className="flex items-center justify-between px-3 py-1.5 border-b border-border/60 cursor-grab active:cursor-grabbing select-none shrink-0"
        >
          <div className="flex items-center gap-2">
            <GripHorizontal className="w-3.5 h-3.5 text-muted-foreground/50" />
            {!isImage && (
              <CardStatusBadge
                status={item.status}
                onChange={(status) => onUpdate({ status })}
              />
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <button onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onBringToFront() }}
              className="p-1 rounded hover:bg-accent text-muted-foreground/70 hover:text-foreground opacity-0 group-hover:opacity-100 transition-all" aria-label="Bring to front">
              <BringToFront className="w-3 h-3" />
            </button>
            <button onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onEdit() }}
              className="p-1 rounded hover:bg-accent text-muted-foreground/70 hover:text-foreground opacity-0 group-hover:opacity-100 transition-all" aria-label="Edit card">
              <Pencil className="w-3 h-3" />
            </button>
            <button onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onDelete() }}
              className="p-1 rounded hover:bg-destructive/10 text-muted-foreground/70 hover:text-destructive opacity-0 group-hover:opacity-100 transition-all" aria-label="Delete card">
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          {children}
        </div>

        <div
          onPointerDown={onResizePointerDown}
          onPointerMove={onResizePointerMove}
          onPointerUp={onResizePointerUp}
          className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize flex items-end justify-end p-0.5"
          style={{ touchAction: 'none' }}
        >
          <svg width="8" height="8" viewBox="0 0 8 8" className="text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity">
            <path d="M0 8 L8 0 M4 8 L8 4" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </div>
      </div>
    </div>
  )
})
