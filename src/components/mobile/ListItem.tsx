import { useState, useRef } from 'react'
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

// What status swiping in each direction resolves to
function swipeTarget(status: Status, dir: 'right' | 'left'): Status {
  if (dir === 'right') return status === 'done' ? 'pending' : 'done'
  return status === 'in_progress' ? 'pending' : 'in_progress'
}

// Background color of the swipe reveal
const SWIPE_BG: Record<Status, string> = {
  done:        'bg-emerald-500',
  in_progress: 'bg-blue-500',
  pending:     'bg-amber-400',
}

const THRESHOLD = 72

export function ListItem({ item, onStatusToggle, onDelete, isSelectMode, isSelected, onToggleSelect }: Props) {
  const title = getTitle(item)
  const description = getDescription(item)
  const thumbnail = getThumbnail(item)
  const isDone = item.status === 'done'
  const [copied, setCopied] = useState(false)
  const [swipeX, setSwipeX] = useState(0)
  const [snapping, setSnapping] = useState(false)

  const ptr = useRef<{ id: number; startX: number; startY: number; axis: 'h' | 'v' | null; triggered: boolean } | null>(null)

  function onPointerDown(e: React.PointerEvent) {
    if (isSelectMode) return
    ptr.current = { id: e.pointerId, startX: e.clientX, startY: e.clientY, axis: null, triggered: false }
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

    e.preventDefault()
    // Resist past threshold
    const raw = dx
    const clamped = Math.sign(raw) * Math.min(Math.abs(raw), THRESHOLD + (Math.abs(raw) - THRESHOLD) * 0.2)
    setSnapping(false)
    setSwipeX(clamped)
  }

  function onPointerUp(e: React.PointerEvent) {
    if (!ptr.current || ptr.current.id !== e.pointerId) return
    const dx = e.clientX - ptr.current.startX
    const wasHorizontal = ptr.current.axis === 'h'
    ptr.current = null

    setSnapping(true)
    setSwipeX(0)

    if (!wasHorizontal || Math.abs(dx) < THRESHOLD) return

    const dir = dx > 0 ? 'right' : 'left'
    onStatusToggle(swipeTarget(item.status, dir))
  }

  function handleCopy(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!item.url) return
    navigator.clipboard.writeText(item.url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  // Background shown during swipe
  const dir = swipeX > 0 ? 'right' : swipeX < 0 ? 'left' : null
  const bgStatus = dir ? swipeTarget(item.status, dir) : null
  const bgOpacity = Math.min(Math.abs(swipeX) / THRESHOLD, 1)
  const pastThreshold = Math.abs(swipeX) >= THRESHOLD

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

  return (
    <div
      className="relative overflow-hidden rounded-xl"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onClick={isSelectMode ? onToggleSelect : undefined}
    >
      {/* Swipe background */}
      {bgStatus && (
        <div
          className={`absolute inset-0 rounded-xl flex items-center ${dir === 'right' ? 'justify-start pl-5' : 'justify-end pr-5'} ${SWIPE_BG[bgStatus]}`}
          style={{ opacity: bgOpacity }}
        >
          <CheckIcon
            className={`w-5 h-5 text-white transition-transform duration-100 ${pastThreshold ? 'scale-110' : 'scale-90'}`}
          />
        </div>
      )}

      {/* Card */}
      <div
        className={[
          'relative flex gap-3 p-3 bg-card border rounded-xl select-none',
          isSelectMode && isSelected ? 'border-primary bg-primary/5' : 'border-border',
          isSelectMode ? 'cursor-pointer' : '',
        ].join(' ')}
        style={{
          transform: `translateX(${swipeX}px)`,
          transition: snapping ? 'transform 0.25s cubic-bezier(0.25,1,0.5,1)' : 'none',
          willChange: 'transform',
        }}
      >
        {/* Select indicator OR status dot */}
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
