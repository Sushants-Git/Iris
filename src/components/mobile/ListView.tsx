import { useState } from 'react'
import { Plus, ExternalLink, Trash2, Link } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ListItem } from './ListItem'
import { AddItemModal } from '@/components/modals/AddItemModal'
import { isImageUrl } from '@/lib/utils'
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
        /* Fallback: show the link */
        <div className="w-full h-full flex flex-col items-center justify-center gap-2 p-3">
          <Link className="w-5 h-5 text-muted-foreground" />
          <p className="text-xs text-muted-foreground text-center break-all line-clamp-3">{item.url}</p>
        </div>
      )}

      {/* Open link */}
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

      {/* Delete */}
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

  const sorted = [...items].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )

  const imageItems = sorted.filter(
    (item) => item.type === 'link' && item.url && isImageUrl(item.url),
  )
  const regularItems = sorted.filter(
    (item) => !(item.type === 'link' && item.url && isImageUrl(item.url)),
  )

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {isLoading &&
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />
          ))}

        {!isLoading && sorted.length === 0 && (
          <div className="flex flex-col items-center justify-center h-48 gap-2">
            <p className="text-muted-foreground text-sm">Nothing here yet</p>
            <Button size="sm" onClick={() => setAddOpen(true)}>
              Add your first item
            </Button>
          </div>
        )}

        {/* Image grid */}
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

        {/* Regular items */}
        {regularItems.map((item) => (
          <ListItem
            key={item.id}
            item={item}
            onStatusToggle={(status) => onStatusToggle(item.id, status)}
            onDelete={() => onDelete(item.id)}
          />
        ))}
      </div>

      <div className="sticky bottom-0 p-4 flex justify-end bg-gradient-to-t from-background to-transparent">
        <Button
          size="icon"
          className="rounded-full shadow-lg w-12 h-12"
          onClick={() => setAddOpen(true)}
        >
          <Plus className="w-5 h-5" />
        </Button>
      </div>

      <AddItemModal
        open={addOpen}
        onOpenChange={setAddOpen}
        onAdd={onCreateItem}
      />
    </div>
  )
}
