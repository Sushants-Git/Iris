import { ExternalLink, FileText, Trash2 } from 'lucide-react'
import { getThumbnail, getTitle, getDescription } from '@/types'
import { formatDate } from '@/lib/utils'
import type { Item, Status } from '@/types'

interface Props {
  item: Item
  onStatusToggle: (status: Status) => void
  onDelete: () => void
}

export function ListItem({ item, onStatusToggle, onDelete }: Props) {
  const title = getTitle(item)
  const description = getDescription(item)
  const thumbnail = getThumbnail(item)
  const isDone = item.status === 'done'

  return (
    <div className="relative flex gap-3 p-3 bg-card border border-border rounded-xl">
      {/* Status dot — overlaps top-left border */}
      <button
        onClick={() => onStatusToggle(isDone ? 'pending' : 'done')}
        title={isDone ? 'Mark as pending' : 'Mark as done'}
        className="absolute -top-1.5 left-3 z-10"
      >
        <span
          className={[
            'block w-3 h-3 rounded-full border-2 border-card transition-colors',
            isDone
              ? 'bg-emerald-500 hover:bg-emerald-400'
              : 'bg-amber-400 hover:bg-amber-500',
          ].join(' ')}
        />
      </button>

      {/* Thumbnail or icon */}
      {item.type === 'link' && thumbnail ? (
        <div className="w-16 h-16 shrink-0 rounded-lg overflow-hidden bg-muted mt-1">
          <img
            src={thumbnail}
            alt=""
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = 'none'
            }}
          />
        </div>
      ) : (
        <div className="w-16 h-16 shrink-0 rounded-lg bg-muted flex items-center justify-center mt-1">
          <FileText className="w-6 h-6 text-muted-foreground" />
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0 flex flex-col gap-1 pt-1">
        <p className={[
          'text-sm font-medium leading-snug line-clamp-2',
          isDone ? 'text-muted-foreground line-through decoration-muted-foreground/50' : 'text-card-foreground',
        ].join(' ')}>
          {title}
        </p>
        {description && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {description}
          </p>
        )}
        <span className="text-xs text-muted-foreground mt-auto pt-1">
          {formatDate(item.createdAt)}
        </span>
      </div>

      {/* Actions */}
      <div className="flex flex-col items-end justify-between shrink-0">
        {item.type === 'link' && item.url && (
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        )}
        <button
          onClick={onDelete}
          className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
