import { useState, useRef } from 'react'
import { Plus, Copy, Check, Trash2, Link, Search, FolderOpen, Pencil, CheckCircle2, Circle, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ListItem } from './ListItem'
import { AddItemModal } from '@/components/modals/AddItemModal'
import { isImageUrl } from '@/lib/utils'
import { getTitle } from '@/types'
import type { Item, Status } from '@/types'
import type { CreateItemPayload, UpdateItemPayload } from '@/lib/api-client'

interface Props {
  items: Item[]
  isLoading: boolean
  boardId: string
  onStatusToggle: (id: string, status: Status) => void
  onDelete: (id: string) => void
  onUpdateItem: (id: string, payload: UpdateItemPayload) => void
  onCreateItem: (payload: CreateItemPayload) => void
}

function ImageGridItem({
  item,
  onDelete,
  isSelectMode,
  isSelected,
  onToggleSelect,
}: {
  item: Item
  onDelete: () => void
  isSelectMode?: boolean
  isSelected?: boolean
  onToggleSelect?: () => void
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
    <div
      className={`relative rounded-xl overflow-hidden aspect-square bg-muted ${isSelectMode && isSelected ? 'ring-2 ring-primary' : ''}`}
      onClick={isSelectMode ? onToggleSelect : undefined}
    >
      {isSelectMode ? (
        <div className="w-full h-full">{inner}</div>
      ) : item.url ? (
        <a href={item.url} target="_blank" rel="noopener noreferrer" className="block w-full h-full">
          {inner}
        </a>
      ) : inner}

      {/* Select indicator */}
      {isSelectMode && (
        <div className="absolute top-1.5 left-1.5 z-10">
          {isSelected
            ? <CheckCircle2 className="w-5 h-5 text-primary drop-shadow" />
            : <Circle className="w-5 h-5 text-white/80 drop-shadow" />
          }
        </div>
      )}

      {!isSelectMode && item.url && (
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={handleCopy}
          className="absolute top-1.5 right-1.5 bg-black/30 text-white hover:bg-black/50 hover:text-white backdrop-blur-sm rounded-md"
          title="Copy link"
        >
          {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
        </Button>
      )}

      {!isSelectMode && (
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={onDelete}
          className="absolute bottom-1.5 right-1.5 bg-black/30 text-white hover:bg-black/50 hover:text-white backdrop-blur-sm rounded-md"
        >
          <Trash2 className="w-3 h-3" />
        </Button>
      )}
    </div>
  )
}

function SubcategorySection({
  header,
  groupItems,
  isSelectMode,
  selectedIds,
  onToggleSelect,
  onStatusToggle,
  onDelete,
  onDeleteHeader,
  onRenameHeader,
}: {
  header: Item
  groupItems: Item[]
  isSelectMode: boolean
  selectedIds: Set<string>
  onToggleSelect: (id: string) => void
  onStatusToggle: (id: string, status: Status) => void
  onDelete: (id: string) => void
  onDeleteHeader: () => void
  onRenameHeader: (newName: string) => void
}) {
  const [renaming, setRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const name = getTitle(header)

  function startRename() {
    setRenameValue(name)
    setRenaming(true)
    setTimeout(() => inputRef.current?.select(), 0)
  }

  function commitRename() {
    const trimmed = renameValue.trim()
    if (trimmed && trimmed !== name) onRenameHeader(trimmed)
    setRenaming(false)
  }

  return (
    <div className="mb-2">
      <div className="flex items-center gap-2 pt-2 pb-1">
        <FolderOpen className="w-4 h-4 text-muted-foreground shrink-0" />
        {renaming ? (
          <>
            <Input
              ref={inputRef}
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitRename()
                if (e.key === 'Escape') setRenaming(false)
              }}
              onBlur={commitRename}
              className="flex-1 h-7 text-sm font-semibold bg-transparent border-0 border-b border-primary rounded-none shadow-none focus-visible:ring-0 px-0 min-w-0"
              autoFocus
            />
            <Button variant="ghost" size="icon-xs" onClick={() => setRenaming(false)}>
              <X className="w-3.5 h-3.5" />
            </Button>
          </>
        ) : (
          <>
            <span
              className="text-sm font-semibold text-foreground"
              onDoubleClick={startRename}
            >
              {name}
            </span>
            <div className="flex-1 h-px bg-border" />
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={startRename}
              title="Rename category"
            >
              <Pencil className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={onDeleteHeader}
              className="hover:text-destructive"
              title="Delete category"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </>
        )}
      </div>

      {groupItems.length === 0 ? (
        <p className="text-xs text-muted-foreground pl-6 py-2">No items yet</p>
      ) : (
        <div className="space-y-3 pt-1">
          {groupItems.map((item) => (
            <ListItem
              key={item.id}
              item={item}
              onStatusToggle={(status) => onStatusToggle(item.id, status)}
              onDelete={() => onDelete(item.id)}
              isSelectMode={isSelectMode}
              isSelected={selectedIds.has(item.id)}
              onToggleSelect={() => onToggleSelect(item.id)}
            />
          ))}
        </div>
      )}
      <div className="mt-4 mb-4 h-px bg-border" />
    </div>
  )
}

export function ListView({
  items,
  isLoading,
  onStatusToggle,
  onDelete,
  onUpdateItem,
  onCreateItem,
}: Props) {
  const [addOpen, setAddOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [isSelectMode, setIsSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const statusOrder = { in_progress: 0, pending: 1, done: 2 }

  // Stable sort: only re-orders when items are added/removed, not when status changes.
  // This prevents cards from jumping around after a swipe gesture.
  const prevIdKeyRef = useRef('')
  const stableIdsRef = useRef<string[]>([])
  const idKey = items.map(i => i.id).sort().join(',')
  if (idKey !== prevIdKeyRef.current) {
    prevIdKeyRef.current = idKey
    stableIdsRef.current = [...items]
      .sort((a, b) => {
        const sd = statusOrder[a.status] - statusOrder[b.status]
        if (sd !== 0) return sd
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      })
      .map(i => i.id)
  }
  const itemMap = new Map(items.map(i => [i.id, i]))
  const sorted = stableIdsRef.current
    .map(id => itemMap.get(id))
    .filter((i): i is Item => i !== undefined)

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
  const subcategoryHeaders = filtered.filter((item) => item.type === 'subcategory')
  const regularItems = filtered.filter(
    (item) =>
      item.type !== 'subcategory' &&
      !(item.type === 'link' && item.url && isImageUrl(item.url)),
  )

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

  const groups: { header: Item; items: Item[] }[] = subcategoryHeaders.map((header) => {
    const name = getTitle(header)
    return {
      header,
      items: regularItems.filter(
        (item) => item.subcategory === name || matchesUrl(item.url, header.url),
      ),
    }
  })

  const groupedIds = new Set(groups.flatMap((g) => g.items.map((i) => i.id)))
  const ungrouped = regularItems.filter((item) => !groupedIds.has(item.id))

  const subcategoryNames = subcategoryHeaders.map((h) => getTitle(h))
  const isEmpty = imageItems.length === 0 && subcategoryHeaders.length === 0 && regularItems.length === 0

  function toggleSelectMode() {
    setIsSelectMode((v) => !v)
    setSelectedIds(new Set())
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleDeleteSelected() {
    selectedIds.forEach((id) => onDelete(id))
    setSelectedIds(new Set())
    setIsSelectMode(false)
  }

  function handleRenameHeader(headerId: string, oldName: string, newName: string) {
    onUpdateItem(headerId, { customTitle: newName })
    // Update all items explicitly tagged with the old category name
    items.forEach((item) => {
      if (item.subcategory === oldName) {
        onUpdateItem(item.id, { subcategory: newName })
      }
    })
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search + select mode toggle */}
      <div className="px-4 pt-3 pb-2 flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9 rounded-lg bg-muted border-0 shadow-none focus-visible:ring-0"
          />
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleSelectMode}
          className="shrink-0"
        >
          {isSelectMode ? 'Cancel' : 'Select'}
        </Button>
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
                isSelectMode={isSelectMode}
                isSelected={selectedIds.has(item.id)}
                onToggleSelect={() => toggleSelect(item.id)}
              />
            ))}
          </div>
        )}

        {/* Subcategory groups */}
        {groups.map(({ header, items: groupItems }) => (
          <SubcategorySection
            key={header.id}
            header={header}
            groupItems={groupItems}
            isSelectMode={isSelectMode}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
            onStatusToggle={onStatusToggle}
            onDelete={onDelete}
            onDeleteHeader={() => onDelete(header.id)}
            onRenameHeader={(newName) => handleRenameHeader(header.id, getTitle(header), newName)}
          />
        ))}

        {/* Ungrouped items */}
        {ungrouped.map((item) => (
          <ListItem
            key={item.id}
            item={item}
            onStatusToggle={(status) => onStatusToggle(item.id, status)}
            onDelete={() => onDelete(item.id)}
            isSelectMode={isSelectMode}
            isSelected={selectedIds.has(item.id)}
            onToggleSelect={() => toggleSelect(item.id)}
          />
        ))}
      </div>

      {/* Multi-select delete bar */}
      {isSelectMode && selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-4 right-20 z-30 flex items-center justify-between gap-3 px-4 py-3 bg-card border border-border rounded-xl shadow-lg">
          <span className="text-sm font-medium text-foreground">
            {selectedIds.size} selected
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDeleteSelected}
            className="gap-1.5 text-destructive hover:text-destructive"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </Button>
        </div>
      )}

      {/* FAB — hidden in select mode */}
      {!isSelectMode && (
        <Button
          onClick={() => setAddOpen(true)}
          className="fixed bottom-6 right-4 z-30 w-12 h-12 rounded-full shadow-lg p-0"
          aria-label="Add item"
        >
          <Plus className="w-5 h-5" />
        </Button>
      )}

      <AddItemModal
        open={addOpen}
        onOpenChange={setAddOpen}
        onAdd={onCreateItem}
        subcategoryNames={subcategoryNames}
      />
    </div>
  )
}
