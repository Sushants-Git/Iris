import { useEffect, useRef, useState } from 'react'
import { Search } from 'lucide-react'
import { getTitle } from '@/types'
import type { Item } from '@/types'
import { isImageUrl } from '@/lib/utils'
import { Input } from '@/components/ui/input'

interface Props {
  items: Item[]
  onSelect: (item: Item) => void
  onClose: () => void
}

export function CommandSearch({ items, onSelect, onClose }: Props) {
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
    // Scroll first item into view on open
    const el = listRef.current?.children[0] as HTMLElement | undefined
    el?.scrollIntoView({ block: 'nearest' })
  }, [])

  const filtered = query.trim()
    ? items.filter((item) =>
        getTitle(item).toLowerCase().includes(query.toLowerCase()),
      )
    : items

  // Reset to first item whenever results change
  useEffect(() => {
    setActiveIndex(0)
  }, [query])

  // Scroll active item into view
  useEffect(() => {
    const el = listRef.current?.children[activeIndex] as HTMLElement | undefined
    el?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIndex((i) => Math.min(i + 1, filtered.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIndex((i) => Math.max(i - 1, 0))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (filtered[activeIndex]) onSelect(filtered[activeIndex])
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose, onSelect, filtered, activeIndex])

  return (
    <div
      className="absolute inset-0 z-50 flex items-start justify-center pt-20"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="w-[480px] max-w-[90vw] bg-background border border-border rounded-xl shadow-xl overflow-hidden"
        onPointerDown={(e) => e.stopPropagation()}
      >
        {/* Input */}
        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <Input
            ref={inputRef}
            type="text"
            placeholder="Search cards…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 border-0 bg-transparent shadow-none focus-visible:ring-0 px-0 h-auto text-sm"
          />
          <kbd className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border shrink-0">
            esc
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-72 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground text-center">No cards found</p>
          ) : (
            filtered.map((item, i) => (
              <button
                key={item.id}
                onClick={() => onSelect(item)}
                onMouseEnter={() => setActiveIndex(i)}
                className={`w-full flex items-center gap-3 px-4 py-2 text-left transition-colors ${i === activeIndex ? 'bg-muted/80' : 'hover:bg-muted/40'}`}
              >
                {item.type === 'link' && item.url && isImageUrl(item.url) ? (
                  <img
                    src={item.url}
                    alt=""
                    className="w-8 h-8 rounded object-cover shrink-0 bg-muted"
                  />
                ) : (
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      item.status === 'done'
                        ? 'bg-teal-500'
                        : item.status === 'in_progress'
                          ? 'bg-primary'
                          : 'bg-muted-foreground/30'
                    }`}
                  />
                )}
                <span className="text-sm truncate">{getTitle(item)}</span>
                {item.type === 'link' && item.url && !isImageUrl(item.url) && (
                  <span className="ml-auto text-xs text-muted-foreground shrink-0 truncate max-w-32">
                    {new URL(item.url).hostname}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
