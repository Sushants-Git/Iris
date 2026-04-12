import { useRef, useState, useEffect, memo } from 'react'
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
  const [pos, setPos] = useState({ x: item.x, y: item.y })
  const [size, setSize] = useState({ w: item.width, h: item.height })
  const [rotation, setRotation] = useState(item.rotation ?? 0)
  const [showSize, setShowSize] = useState(false)
  const [animating, setAnimating] = useState(false)
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const rotateRef = useRef<{ startAngle: number; startRotation: number; current: number } | null>(null)

  useEffect(() => {
    if (!highlighted) return
    setAnimating(false)
    // force reflow so animation restarts even if triggered twice
    requestAnimationFrame(() => setAnimating(true))
    const t = setTimeout(() => setAnimating(false), 900)
    return () => clearTimeout(t)
  }, [highlighted])

  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null)
  const resizeRef = useRef<{ startX: number; startY: number; origW: number; origH: number } | null>(null)

  // Keep local size in sync if the item changes externally (e.g. after server confirm)
  useEffect(() => {
    setSize({ w: item.width, h: item.height })
  }, [item.width, item.height])

  useEffect(() => {
    setPos({ x: item.x, y: item.y })
  }, [item.x, item.y])

  useEffect(() => {
    setRotation(item.rotation ?? 0)
  }, [item.rotation])

  // ── Rotation handlers ───────────────────────────────────────────────────────
  function onRotatePointerDown(e: React.PointerEvent) {
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    const rect = cardRef.current!.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const startAngle = Math.atan2(e.clientY - cy, e.clientX - cx) * (180 / Math.PI)
    rotateRef.current = { startAngle, startRotation: rotation, current: rotation }
  }

  function onRotatePointerMove(e: React.PointerEvent) {
    if (!rotateRef.current) return
    const rect = cardRef.current!.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const angle = Math.atan2(e.clientY - cy, e.clientX - cx) * (180 / Math.PI)
    let next = rotateRef.current.startRotation + (angle - rotateRef.current.startAngle)
    if (e.shiftKey) next = Math.round(next / 15) * 15
    rotateRef.current.current = next
    setRotation(next)
  }

  function onRotatePointerUp() {
    if (!rotateRef.current) return
    onUpdate({ rotation: rotateRef.current.current })
    rotateRef.current = null
  }

  // ── Drag handlers ──────────────────────────────────────────────────────────
  function onDragPointerDown(e: React.PointerEvent) {
    if (e.button !== 0) return
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: pos.x,
      origY: pos.y,
    }
  }

  function onDragPointerMove(e: React.PointerEvent) {
    if (!dragRef.current) return
    const scale = transformRef.current?.scale ?? 1
    const dx = (e.clientX - dragRef.current.startX) / scale
    const dy = (e.clientY - dragRef.current.startY) / scale
    setPos({ x: dragRef.current.origX + dx, y: dragRef.current.origY + dy })
  }

  function onDragPointerUp() {
    if (!dragRef.current) return
    dragRef.current = null
    onUpdate({ x: pos.x, y: pos.y })
  }

  // ── Resize handlers ────────────────────────────────────────────────────────
  function onResizePointerDown(e: React.PointerEvent) {
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    resizeRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origW: size.w,
      origH: size.h,
    }
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    setShowSize(true)
  }

  function onResizePointerMove(e: React.PointerEvent) {
    if (!resizeRef.current) return
    const scale = transformRef.current?.scale ?? 1
    const dw = (e.clientX - resizeRef.current.startX) / scale
    const dh = (e.clientY - resizeRef.current.startY) / scale
    setSize({
      w: Math.max(MIN_W, resizeRef.current.origW + dw),
      h: Math.max(MIN_H, resizeRef.current.origH + dh),
    })
  }

  function onResizePointerUp() {
    if (!resizeRef.current) return
    resizeRef.current = null
    onUpdate({ width: size.w, height: size.h })
    // Keep visible for 2s so user can read/copy
    hideTimerRef.current = setTimeout(() => setShowSize(false), 2000)
  }

  const isDragging = !!dragRef.current
  const isResizing = !!resizeRef.current
  const isImage = item.type === 'link' && !!item.url && isImageUrl(item.url)

  return (
    <div
      ref={cardRef}
      style={{
        position: 'absolute',
        left: pos.x,
        top: pos.y,
        width: size.w,
        height: size.h,
        transform: rotation ? `rotate(${rotation}deg)` : undefined,
        transformOrigin: 'center',
      }}
      className="group"
    >
      {/* Rotation handle — image cards only */}
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
          : isDragging || isResizing
          ? '0 8px 32px -8px oklch(0.375 0.155 12 / 0.25)'
          : '0 1px 8px -2px oklch(0.78 0.04 308 / 0.18), 0 0 0 1px oklch(0.78 0.04 305 / 0.12)',
      }}
    >
      {/* Size badge — shown while resizing and 2s after */}
      {showSize && (
        <div className="absolute bottom-5 left-2 z-10 pointer-events-none">
          <div className="px-2 py-0.5 rounded-md bg-foreground/80 text-background text-xs font-mono tabular-nums shadow-sm select-all backdrop-blur-sm">
            {Math.round(size.w)} × {Math.round(size.h)}
          </div>
        </div>
      )}

      {/* Drag handle bar */}
      <div
        onPointerDown={onDragPointerDown}
        onPointerMove={onDragPointerMove}
        onPointerUp={onDragPointerUp}
        className="flex items-center justify-between px-3 py-1.5 border-b border-border/60 cursor-grab active:cursor-grabbing select-none"
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
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); onBringToFront() }}
            className="p-1 rounded hover:bg-accent text-muted-foreground/70 hover:text-foreground opacity-0 group-hover:opacity-100 transition-all"
            aria-label="Bring to front"
          >
            <BringToFront className="w-3 h-3" />
          </button>
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); onEdit() }}
            className="p-1 rounded hover:bg-accent text-muted-foreground/70 hover:text-foreground opacity-0 group-hover:opacity-100 transition-all"
            aria-label="Edit card"
          >
            <Pencil className="w-3 h-3" />
          </button>
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); onDelete() }}
            className="p-1 rounded hover:bg-destructive/10 text-muted-foreground/70 hover:text-destructive opacity-0 group-hover:opacity-100 transition-all"
            aria-label="Delete card"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Card content */}
      <div className="flex-1 overflow-hidden">
        {children}
      </div>

      {/* Resize handle */}
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
