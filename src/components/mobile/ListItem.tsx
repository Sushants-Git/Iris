import { useState, useRef, useEffect } from 'react'
import { Copy, Check, FileText, Trash2, CheckCircle2, Circle, Check as CheckIcon } from 'lucide-react'
import { getThumbnail, getTitle, getDescription } from '@/types'
import { formatDate } from '@/lib/utils'
import type { Item, Status } from '@/types'

interface Props {
  item: Item
  onStatusToggle: (status: Status) => void
  onDelete: () => void
  isSelectMode?: boolean
  isSelected?: boolean
  onToggleSelect?: () => void
}

const DOT_COLORS: Record<Status, string> = {
  pending:     'bg-amber-400 border-card',
  in_progress: 'bg-blue-500 border-card',
  done:        'bg-emerald-500 border-card',
}

const SWIPE_BG: Record<Status, string> = {
  done:        'bg-emerald-500',
  in_progress: 'bg-blue-500',
  pending:     'bg-amber-400',
}

function swipeTarget(status: Status, dir: 'right' | 'left'): Status {
  if (dir === 'right') return status === 'done' ? 'pending' : 'done'
  return status === 'in_progress' ? 'pending' : 'in_progress'
}

const THRESHOLD = 72
// How far the card flies past the threshold before springing back
const FLY_EXTRA = 36

// Phase of the card during/after swipe
type Phase = 'idle' | 'dragging' | 'flying' | 'springing'

export function ListItem({ item, onStatusToggle, onDelete, isSelectMode, isSelected, onToggleSelect }: Props) {
  const title = getTitle(item)
  const description = getDescription(item)
  const thumbnail = getThumbnail(item)
  const isDone = item.status === 'done'
  const [copied, setCopied] = useState(false)
  const [swipeX, setSwipeX] = useState(0)
  const [phase, setPhase] = useState<Phase>('idle')

  const outerRef = useRef<HTMLDivElement>(null)
  const ptr = useRef<{ id: number; startX: number; startY: number; axis: 'h' | 'v' | null } | null>(null)
  // Track committed swipe direction so bg stays correct during the fly-back animation
  const committedDir = useRef<'right' | 'left' | null>(null)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  function later(fn: () => void, ms: number) {
    const id = setTimeout(fn, ms)
    timers.current.push(id)
  }

  useEffect(() => {
    return () => { timers.current.forEach(clearTimeout) }
  }, [])

  // Non-passive touchmove so we can preventDefault during horizontal swipes
  useEffect(() => {
    const el = outerRef.current
    if (!el) return
    function onTouchMove(e: TouchEvent) {
      if (ptr.current?.axis === 'h') e.preventDefault()
    }
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    return () => el.removeEventListener('touchmove', onTouchMove)
  }, [])

  function onPointerDown(e: React.PointerEvent) {
    if (isSelectMode) return
    e.currentTarget.setPointerCapture(e.pointerId)
    ptr.current = { id: e.pointerId, startX: e.clientX, startY: e.clientY, axis: null }
    setPhase('dragging')
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!ptr.current || ptr.current.id !== e.pointerId) return
    const dx = e.clientX - ptr.current.startX
    const dy = e.clientY - ptr.current.startY

    if (!ptr.current.axis) {
      if (Math.hypot(dx, dy) < 6) return
      ptr.current.axis = Math.abs(dx) >= Math.abs(dy) ? 'h' : 'v'
    }
    if (ptr.current.axis !== 'h') return

    // Rubber-band resistance past threshold
    const abs = Math.abs(dx)
    const clamped = Math.sign(dx) * (abs < THRESHOLD ? abs : THRESHOLD + (abs - THRESHOLD) * 0.18)
    setSwipeX(clamped)
  }

  function onPointerUp(e: React.PointerEvent) {
    if (!ptr.current || ptr.current.id !== e.pointerId) return
    const dx = e.clientX - ptr.current.startX
    const wasH = ptr.current.axis === 'h'
    ptr.current = null

    if (wasH && Math.abs(dx) >= THRESHOLD) {
      const dir = dx > 0 ? 'right' : 'left'
      committedDir.current = dir

      // Trigger status change immediately (optimistic)
      onStatusToggle(swipeTarget(item.status, dir))

      // 1. Fly a little further in the swipe direction
      const flyTarget = swipeX + (dir === 'right' ? FLY_EXTRA : -FLY_EXTRA)
      setPhase('flying')
      setSwipeX(flyTarget)

      // 2. Spring back to center
      later(() => {
        setPhase('springing')
        setSwipeX(0)
        later(() => {
          setPhase('idle')
          committedDir.current = null
        }, 420)
      }, 130)
    } else {
      // Didn't commit — spring back
      committedDir.current = null
      setPhase('springing')
      setSwipeX(0)
      later(() => setPhase('idle'), 350)
    }
  }

  // ── Derived visuals ──────────────────────────────────────────────────────────

  // Direction for the bg reveal (locked in once committed)
  const activeDir = committedDir.current ?? (swipeX > 0 ? 'right' : swipeX < 0 ? 'left' : null)
  const bgStatus = activeDir ? swipeTarget(item.status, activeDir) : null
  const rawOpacity = Math.min(1, Math.abs(swipeX) / THRESHOLD)
  // Once committed, bg stays at full opacity during fly-back
  const bgOpacity = committedDir.current ? Math.max(rawOpacity, 0) : rawOpacity
  const pastThreshold = Math.abs(swipeX) >= THRESHOLD || committedDir.current !== null

  const isDragging = phase === 'dragging'

  const cardTransition: React.CSSProperties['transition'] = {
    idle:      'none',
    dragging:  'none',
    flying:    'transform 0.13s ease-in',
    springing: 'transform 0.42s cubic-bezier(0.34, 1.5, 0.64, 1)',
  }[phase]

  // ── Card content ─────────────────────────────────────────────────────────────

  const cardContent = (
    <>
      {item.type === 'link' && thumbnail ? (
        <div className="w-16 h-16 shrink-0 rounded-lg overflow-hidden bg-muted mt-1">
          <img
            src={thumbnail}
            alt=""
            className="w-full h-full object-cover"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
          />
        </div>
      ) : (
        <div className="w-16 h-16 shrink-0 rounded-lg bg-muted flex items-center justify-center mt-1">
          <FileText className="w-6 h-6 text-muted-foreground" />
        </div>
      )}
      <div className="flex-1 min-w-0 flex flex-col gap-1 pt-1">
        <p className={[
          'text-sm font-medium leading-snug line-clamp-2 break-all',
          isDone ? 'text-muted-foreground line-through decoration-muted-foreground/50' : 'text-card-foreground',
        ].join(' ')}>
          {title}
        </p>
        {description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{description}</p>
        )}
        <span className="text-xs text-muted-foreground mt-auto pt-1">
          {formatDate(item.createdAt)}
        </span>
      </div>
    </>
  )

  function handleCopy(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!item.url) return
    navigator.clipboard.writeText(item.url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  return (
    // pt-2 gives 8 px of headroom so the dot at -top-1.5 on the card is visible.
    // No overflow-hidden here — the swipe bg has its own clipping wrapper.
    <div
      ref={outerRef}
      className="relative pt-2"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onClick={isSelectMode ? onToggleSelect : undefined}
    >
      {/* Swipe reveal — clipped to the card area (top-2 downward) */}
      <div className="absolute inset-x-0 top-2 bottom-0 overflow-hidden rounded-xl">
        {bgStatus && (
          <div
            className={[
              'absolute inset-0 flex items-center',
              activeDir === 'right' ? 'justify-start pl-5' : 'justify-end pr-5',
              SWIPE_BG[bgStatus],
            ].join(' ')}
            style={{ opacity: bgOpacity }}
          >
            <CheckIcon
              className={[
                'w-5 h-5 text-white transition-transform duration-150',
                pastThreshold ? 'scale-125' : 'scale-90',
              ].join(' ')}
            />
          </div>
        )}
      </div>

      {/* Card — slides horizontally */}
      <div
        className={[
          'relative flex gap-3 p-3 bg-card border rounded-xl select-none transition-shadow',
          isSelectMode && isSelected ? 'border-primary bg-primary/5' : 'border-border',
          isSelectMode ? 'cursor-pointer' : '',
          isDragging && swipeX !== 0 ? 'shadow-lg' : '',
        ].join(' ')}
        style={{
          transform: `translateX(${swipeX}px)`,
          transition: cardTransition,
          willChange: 'transform',
        }}
      >
        {/* Status dot — sits at -top-1.5, visible in the pt-2 gap above */}
        {isSelectMode ? (
          <div className="absolute -top-1.5 left-3 z-10">
            {isSelected
              ? <CheckCircle2 className="w-4 h-4 text-primary bg-background rounded-full" />
              : <Circle className="w-4 h-4 text-muted-foreground/50 bg-background rounded-full" />
            }
          </div>
        ) : (
          <div className="absolute -top-1.5 left-3 z-10">
            <span className={`block w-3 h-3 rounded-full border-2 ${DOT_COLORS[item.status]}`} />
          </div>
        )}

        {/* Clickable body */}
        {!isSelectMode && item.type === 'link' && item.url ? (
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex gap-3 flex-1 min-w-0"
            onClick={(e) => { if (swipeX !== 0) e.preventDefault() }}
          >
            {cardContent}
          </a>
        ) : (
          <div className="flex gap-3 flex-1 min-w-0">{cardContent}</div>
        )}

        {/* Actions */}
        {!isSelectMode && (
          <div className="flex flex-col items-end justify-between shrink-0">
            {item.type === 'link' && item.url && (
              <button
                onClick={handleCopy}
                className="p-1.5 rounded-md hover:bg-muted text-muted-foreground"
                title="Copy link"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              </button>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); onDelete() }}
              className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
