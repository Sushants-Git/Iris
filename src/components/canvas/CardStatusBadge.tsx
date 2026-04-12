import { useState, useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import type { Status } from '@/types'

interface Props {
  status: Status
  onChange: (status: Status) => void
}

const STATUS_CONFIG: Record<Status, { label: string; dot: string; chip: string }> = {
  pending:     { label: 'Pending',     dot: 'bg-muted-foreground/30', chip: 'bg-transparent text-muted-foreground/60 border-transparent' },
  in_progress: { label: 'In Progress', dot: 'bg-primary',             chip: 'bg-primary/10 text-primary border-primary/20 dark:bg-primary/20 dark:text-primary dark:border-primary/30' },
  done:        { label: 'Done',        dot: 'bg-teal-500',            chip: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-400 dark:border-teal-800/50' },
}

export function CardStatusBadge({ status, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const cfg = STATUS_CONFIG[status]

  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [open])

  const options = (Object.entries(STATUS_CONFIG) as [Status, typeof cfg][])
    .filter(([v]) => v !== status)

  return (
    <div ref={ref} className="relative">
      <button
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v) }}
        title="Change status"
        className={cn(
          'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[11px] font-medium transition-colors select-none',
          cfg.chip,
        )}
      >
        <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', cfg.dot)} />
        {cfg.label}
      </button>

      {open && (
        <div
          className="absolute left-0 top-6 z-50 flex flex-col gap-1 p-1.5 bg-popover border border-border rounded-xl shadow-lg min-w-[120px]"
          onPointerDown={(e) => e.stopPropagation()}
        >
          {options.map(([value, c]) => (
            <button
              key={value}
              onClick={(e) => { e.stopPropagation(); onChange(value); setOpen(false) }}
              className={cn(
                'inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[11px] font-medium transition-colors w-full text-left',
                c.chip,
              )}
            >
              <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', c.dot)} />
              {c.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
