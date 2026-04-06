import { useState, useRef } from 'react'
import { Copy, Check, FileText, Trash2, CheckCircle2, Circle } from 'lucide-react'
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
  pending:     'bg-amber-400 hover:bg-amber-500 border-card',
  in_progress: 'bg-blue-500 hover:bg-blue-400 border-card',
  done:        'bg-emerald-500 hover:bg-emerald-400 border-card',
}

export function ListItem({ item, onStatusToggle, onDelete, isSelectMode, isSelected, onToggleSelect }: Props) {
  const title = getTitle(item)
  const description = getDescription(item)
  const thumbnail = getThumbnail(item)
  const isDone = item.status === 'done'
  const [copied, setCopied] = useState(false)

  // Double-tap detection
  const lastTapRef = useRef(0)
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleDotClick(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()

    const now = Date.now()
    const gap = now - lastTapRef.current
    lastTapRef.current = now

    if (tapTimerRef.current) {
      clearTimeout(tapTimerRef.current)
      tapTimerRef.current = null
    }

    if (gap < 300) {
      // Double tap → done (or back to pending if already done)
      onStatusToggle(isDone ? 'pending' : 'done')
    } else {
      tapTimerRef.current = setTimeout(() => {
        tapTimerRef.current = null
        // Single tap: pending ↔ in_progress; done → pending
        if (item.status === 'pending') onStatusToggle('in_progress')
        else if (item.status === 'in_progress') onStatusToggle('pending')
        else onStatusToggle('pending') // done → pending
      }, 300)
    }
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
      className={[
        'relative flex gap-3 p-3 bg-card border rounded-xl transition-colors select-none',
        isSelectMode && isSelected ? 'border-primary bg-primary/5' : 'border-border',
        isSelectMode ? 'active:bg-muted cursor-pointer' : '',
      ].join(' ')}
      onClick={isSelectMode ? onToggleSelect : undefined}
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
        <button
          onClick={handleDotClick}
          title="Tap: in progress · Double-tap: done"
          className="absolute -top-1.5 left-3 z-10 p-1 -m-1"
        >
          <span
            className={[
              'block w-3 h-3 rounded-full border-2 transition-colors',
              DOT_COLORS[item.status],
            ].join(' ')}
          />
        </button>
      )}

      {/* Clickable body */}
      {!isSelectMode && item.type === 'link' && item.url ? (
        <a href={item.url} target="_blank" rel="noopener noreferrer" className="flex gap-3 flex-1 min-w-0">
          {cardContent}
        </a>
      ) : (
        <div className="flex gap-3 flex-1 min-w-0">{cardContent}</div>
      )}

      {/* Actions — hidden in select mode */}
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
  )
}
