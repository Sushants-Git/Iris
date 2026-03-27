import { ExternalLink } from 'lucide-react'
import { getTitle, getDescription, getThumbnail } from '@/types'
import { TwitterCard } from './TwitterCard'
import { ImageCard } from './ImageCard'
import { isImageUrl } from '@/lib/utils'
import type { Item } from '@/types'

interface Props {
  item: Item
}

function getTweetId(url: string): string | null {
  const match = url.match(/(?:twitter\.com|x\.com)\/\w+\/status\/(\d+)/)
  return match?.[1] ?? null
}

export function LinkCard({ item }: Props) {
  const tweetId = item.url ? getTweetId(item.url) : null

  // Pure image — fills the card, no chrome
  if (item.url && isImageUrl(item.url)) {
    return <ImageCard url={item.url} />
  }

  // Render embedded tweet for Twitter/X URLs
  if (tweetId) {
    return (
      <div className="h-full overflow-y-auto overscroll-contain">
        <TwitterCard tweetId={tweetId} />
      </div>
    )
  }

  const title = getTitle(item)
  const description = getDescription(item)
  const thumbnail = getThumbnail(item)
  const isYouTube = item.url?.includes('youtube.com') || item.url?.includes('youtu.be')

  return (
    <div className="flex flex-col h-full">
      {/* Thumbnail */}
      {thumbnail && (
        <div className="relative w-full bg-muted overflow-hidden" style={{ height: '120px' }}>
          <img
            src={thumbnail}
            alt=""
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = 'none'
            }}
          />
          {isYouTube && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-10 h-10 rounded-full bg-black/60 flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-5 h-5 text-white fill-current">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Text content */}
      <div className="flex-1 p-3 flex flex-col gap-1 min-h-0">
        <p className="text-sm font-medium leading-snug line-clamp-2 text-card-foreground">
          {title}
        </p>
        {description && (
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
            {description}
          </p>
        )}
      </div>

      {/* URL footer */}
      {item.url && (
        <div className="px-3 pb-2">
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors truncate"
          >
            <ExternalLink className="w-3 h-3 shrink-0" />
            <span className="truncate">{new URL(item.url).hostname}</span>
          </a>
        </div>
      )}
    </div>
  )
}
