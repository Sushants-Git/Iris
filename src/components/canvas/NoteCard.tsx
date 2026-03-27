import { useState, useRef } from 'react'
import type { Item } from '@/types'

interface Props {
  item: Item
  onChange: (content: string) => void
}

export function NoteCard({ item, onChange }: Props) {
  const [value, setValue] = useState(item.noteContent ?? '')
  const savedRef = useRef(item.noteContent ?? '')

  function handleBlur() {
    if (value !== savedRef.current) {
      savedRef.current = value
      onChange(value)
    }
  }

  return (
    <textarea
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={handleBlur}
      onPointerDown={(e) => e.stopPropagation()}
      placeholder="Write a note…"
      className="w-full h-full resize-none border-none outline-none bg-transparent p-3 text-sm text-card-foreground placeholder:text-muted-foreground leading-relaxed"
      style={{ fontFamily: 'inherit' }}
    />
  )
}
