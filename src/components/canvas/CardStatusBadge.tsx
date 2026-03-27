import type { Status } from '@/types'

interface Props {
  status: Status
  onChange: (status: Status) => void
}

export function CardStatusBadge({ status, onChange }: Props) {
  const isDone = status === 'done'

  return (
    <button
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation()
        onChange(isDone ? 'pending' : 'done')
      }}
      title={isDone ? 'Mark as pending' : 'Mark as done'}
      className="select-none"
    >
      <span
        className={[
          'block w-2.5 h-2.5 rounded-full transition-colors',
          isDone
            ? 'bg-emerald-500 hover:bg-emerald-400 ring-2 ring-emerald-200'
            : 'bg-amber-400 hover:bg-amber-500 ring-2 ring-amber-100',
        ].join(' ')}
      />
    </button>
  )
}
