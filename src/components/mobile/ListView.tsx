import { useState } from 'react'
import { Plus, Copy, Check, Trash2, Link, Search, FolderOpen } from 'lucide-react'
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
  const [copied, setCopied] = useState(false)

  function handleCopy(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!item.url) return
    navigator.clipboard.writeText(item.url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  const inner = (
    <>
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
    </>
  )

  return (
    <div className="relative rounded-xl overflow-hidden aspect-square bg-muted">
      {item.url ? (
        <a href={item.url} target="_blank" rel="noopener noreferrer" className="block w-full h-full">
          {inner}
        </a>
      ) : inner}

      {item.url && (
        <button
          onClick={handleCopy}
          className="absolute top-1.5 right-1.5 p-1 rounded-md bg-black/30 text-white backdrop-blur-sm"
          title="Copy link"
        >
          {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
        </button>
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

function SubcategoryHeader({ name }: { name: string }) {
  return (
    <div className="flex items-center gap-2 pt-2 pb-1">
      <FolderOpen className="w-4 h-4 text-muted-foreground shrink-0" />
      <span className="text-sm font-semibold text-foreground">{name}</span>
      <div className="flex-1 h-px bg-border" />
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

  // Separate item types
  const imageItems = filtered.filter(
    (item) => item.type === 'link' && item.url && isImageUrl(item.url),
  )
  const subcategoryHeaders = filtered.filter((item) => item.type === 'subcategory')
  const regularItems = filtered.filter(
    (item) =>
      item.type !== 'subcategory' &&
      !(item.type === 'link' && item.url && isImageUrl(item.url)),
  )

  // Match an item's URL against a subcategory's URL pattern (hostname match)
  function matchesUrl(itemUrl: string | null, patternUrl: string | null): boolean {
    if (!itemUrl || !patternUrl) return false
    try {
      const pattern = new URL(patternUrl).hostname.replace(/^www\./, '')
      const host = new URL(itemUrl).hostname.replace(/^www\./, '')
      return host === pattern || host.endsWith(`.${pattern}`)
    } catch {
      return false
    }
  }

  // Build grouped structure: subcategory name → items (by explicit tag OR url pattern)
  const groups: { name: string; items: Item[] }[] = subcategoryHeaders.map((header) => {
    const name = getTitle(header)
    return {
      name,
      items: regularItems.filter(
        (item) => item.subcategory === name || matchesUrl(item.url, header.url),
      ),
    }
  })

  // Items matched by URL pattern count as grouped even if not explicitly tagged
  const groupedIds = new Set(groups.flatMap((g) => g.items.map((i) => i.id)))
  const ungrouped = regularItems.filter((item) => !groupedIds.has(item.id))

  const subcategoryNames = subcategoryHeaders.map((h) => getTitle(h))
  const isEmpty = imageItems.length === 0 && subcategoryHeaders.length === 0 && regularItems.length === 0

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

      {/* pt-2 gives room for the status dot that overflows the first card's top border */}
      <div className="flex-1 overflow-y-auto px-4 pt-2 pb-24 space-y-3">
        {isLoading &&
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />
          ))}

        {!isLoading && isEmpty && (
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

        {/* Subcategory groups */}
        {groups.map(({ name, items: groupItems }) => (
          <div key={name}>
            <SubcategoryHeader name={name} />
            {groupItems.length === 0 ? (
              <p className="text-xs text-muted-foreground pl-6 py-2">No items yet</p>
            ) : (
              <div className="space-y-3">
                {groupItems.map((item) => (
                  <ListItem
                    key={item.id}
                    item={item}
                    onStatusToggle={(status) => onStatusToggle(item.id, status)}
                    onDelete={() => onDelete(item.id)}
                  />
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Ungrouped items */}
        {ungrouped.map((item) => (
          <ListItem
            key={item.id}
            item={item}
            onStatusToggle={(status) => onStatusToggle(item.id, status)}
            onDelete={() => onDelete(item.id)}
          />
        ))}
      </div>

      {/* FAB */}
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
        subcategoryNames={subcategoryNames}
      />
    </div>
  )
}
