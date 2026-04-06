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

  const options: { value: Status; className: string; title: string }[] = [
    { value: 'pending',     className: 'bg-amber-400 ring-amber-200',   title: 'Pending' },
    { value: 'in_progress', className: 'bg-blue-500 ring-blue-200',     title: 'In progress' },
    { value: 'done',        className: 'bg-emerald-500 ring-emerald-200', title: 'Done' },
  ].filter((o) => o.value !== status) as { value: Status; className: string; title: string }[]

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
          {options.map((o) => (
            <button
              key={o.value}
              onClick={(e) => { e.stopPropagation(); onChange(o.value); setOpen(false) }}
              title={o.title}
              className="group"
            >
              <span className={`block w-3 h-3 rounded-full ring-2 transition-transform group-hover:scale-110 ${o.className}`} />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
