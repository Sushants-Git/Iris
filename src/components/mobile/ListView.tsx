import { useState } from 'react'
import { Plus, ExternalLink, Trash2, Link, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ListItem } from './ListItem'
import { AddItemModal } from '@/components/modals/AddItemModal'
import { isImageUrl } from '@/lib/utils'
import { getTitle } from '@/types'
import type { Item, Status } from '@/types'
import type { CreateItemPayload } from '@/lib/api-client'

interface Props {
  items: Item[]
  isLoading: boolean
  boardId: string
  onStatusToggle: (id: string, status: Status) => void
  onDelete: (id: string) => void
  onCreateItem: (payload: CreateItemPayload) => void
}

function ImageGridItem({
  item,
  onDelete,
}: {
  item: Item
  onDelete: () => void
}) {
  const [imgFailed, setImgFailed] = useState(false)
  return (
    <div className="relative rounded-xl overflow-hidden aspect-square bg-muted">
      {!imgFailed ? (
        <img
          src={item.url!}
          alt=""
          className="w-full h-full object-cover"
          onError={() => setImgFailed(true)}
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center gap-2 p-3">
          <Link className="w-5 h-5 text-muted-foreground" />
          <p className="text-xs text-muted-foreground text-center break-all line-clamp-3">{item.url}</p>
        </div>
      )}

      {item.url && (
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute top-1.5 right-1.5 p-1 rounded-md bg-black/30 text-white backdrop-blur-sm"
        >
          <ExternalLink className="w-3 h-3" />
        </a>
      )}

      <button
        onClick={onDelete}
        className="absolute bottom-1.5 right-1.5 p-1 rounded-md bg-black/30 text-white backdrop-blur-sm"
      >
        <Trash2 className="w-3 h-3" />
      </button>
    </div>
  )
}

export function ListView({
  items,
  isLoading,
  onStatusToggle,
  onDelete,
  onCreateItem,
}: Props) {
  const [addOpen, setAddOpen] = useState(false)
  const [query, setQuery] = useState('')

  const sorted = [...items].sort((a, b) => {
    // done items sink to the bottom
    if (a.status !== b.status) return a.status === 'done' ? 1 : -1
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })

  const filtered = query.trim()
    ? sorted.filter((item) => {
        const q = query.toLowerCase()
        return (
          getTitle(item).toLowerCase().includes(q) ||
          item.url?.toLowerCase().includes(q) ||
          item.noteContent?.toLowerCase().includes(q)
        )
      })
    : sorted

  const imageItems = filtered.filter(
    (item) => item.type === 'link' && item.url && isImageUrl(item.url),
  )
  const regularItems = filtered.filter(
    (item) => !(item.type === 'link' && item.url && isImageUrl(item.url)),
  )

  return (
    <div className="flex flex-col h-full">
      {/* Search bar */}
      <div className="px-4 pt-3 pb-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-muted border-0 outline-none placeholder:text-muted-foreground"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-24 space-y-3">
        {isLoading &&
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />
          ))}

        {!isLoading && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center h-48 gap-2">
            <p className="text-muted-foreground text-sm">
              {query ? 'No results' : 'Nothing here yet'}
            </p>
            {!query && (
              <Button size="sm" onClick={() => setAddOpen(true)}>
                Add your first item
              </Button>
            )}
          </div>
        )}

        {imageItems.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            {imageItems.map((item) => (
              <ImageGridItem
                key={item.id}
                item={item}
                onDelete={() => onDelete(item.id)}
              />
            ))}
          </div>
        )}

        {regularItems.map((item) => (
          <ListItem
            key={item.id}
            item={item}
            onStatusToggle={(status) => onStatusToggle(item.id, status)}
            onDelete={() => onDelete(item.id)}
          />
        ))}
      </div>

      {/* FAB — fixed so it never scrolls behind the header */}
      <button
        onClick={() => setAddOpen(true)}
        className="fixed bottom-6 right-4 z-30 w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center"
        aria-label="Add item"
      >
        <Plus className="w-5 h-5" />
      </button>

      <AddItemModal
        open={addOpen}
        onOpenChange={setAddOpen}
        onAdd={onCreateItem}
      />
    </div>
  )
}
