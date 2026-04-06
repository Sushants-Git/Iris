import { useState, useEffect, useRef } from 'react'
import type { Status } from '@/types'

interface Props {
  status: Status
  onChange: (status: Status) => void
}

const DOT_COLOR: Record<Status, string> = {
  pending:     'bg-amber-400 ring-amber-100',
  in_progress: 'bg-blue-500 ring-blue-100',
  done:        'bg-emerald-500 ring-emerald-100',
}

export function CardStatusBadge({ status, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Close when clicking outside
  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [open])

  function pick(next: Status) {
    // Clicking the already-active option resets to pending
    onChange(next === status ? 'pending' : next)
    setOpen(false)
  }

  return (
    <div ref={ref} className="relative">
      <button
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v) }}
        title="Change status"
        className="select-none"
      >
        <span
          className={[
            'block w-2.5 h-2.5 rounded-full transition-colors ring-2',
            DOT_COLOR[status],
          ].join(' ')}
        />
      </button>

      {open && (
        <div
          className="absolute left-0 top-5 z-50 flex items-center gap-2 px-2.5 py-2 bg-popover border border-border rounded-lg shadow-lg"
          onPointerDown={(e) => e.stopPropagation()}
        >
          {/* Blue — in progress */}
          <button
            onClick={(e) => { e.stopPropagation(); pick('in_progress') }}
            title="In progress"
            className="group flex flex-col items-center gap-1"
          >
            <span
              className={[
                'block w-3 h-3 rounded-full ring-2 transition-transform group-hover:scale-110',
                status === 'in_progress'
                  ? 'bg-blue-500 ring-blue-300'
                  : 'bg-blue-500 ring-blue-100',
              ].join(' ')}
            />
          </button>

          {/* Green — done */}
          <button
            onClick={(e) => { e.stopPropagation(); pick('done') }}
            title="Done"
            className="group flex flex-col items-center gap-1"
          >
            <span
              className={[
                'block w-3 h-3 rounded-full ring-2 transition-transform group-hover:scale-110',
                status === 'done'
                  ? 'bg-emerald-500 ring-emerald-300'
                  : 'bg-emerald-500 ring-emerald-100',
              ].join(' ')}
            />
          </button>
        </div>
      )}
    </div>
  )
}
