import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import type { Item } from '@/types'
import type { UpdateItemPayload } from '@/lib/api-client'

interface Props {
  item: Item
  open: boolean
  onOpenChange: (v: boolean) => void
  onSave: (payload: UpdateItemPayload) => void
}

export function EditCardModal({ item, open, onOpenChange, onSave }: Props) {
  const [title, setTitle] = useState(item.customTitle ?? item.scrapedTitle ?? '')
  const [description, setDescription] = useState(
    item.customDescription ?? item.scrapedDescription ?? '',
  )
  const [thumbnail, setThumbnail] = useState(
    item.customThumbnail ?? item.scrapedThumbnail ?? '',
  )

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSave({
      customTitle: title.trim() || null,
      customDescription: description.trim() || null,
      customThumbnail: thumbnail.trim() || null,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Card</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-title">Title</Label>
            <Input
              id="edit-title"
              placeholder="Override title…"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-desc">Description</Label>
            <Textarea
              id="edit-desc"
              placeholder="Override description…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          {item.type === 'link' && (
            <div className="space-y-2">
              <Label htmlFor="edit-thumb">Thumbnail URL</Label>
              <Input
                id="edit-thumb"
                type="url"
                placeholder="https://example.com/image.jpg"
                value={thumbnail}
                onChange={(e) => setThumbnail(e.target.value)}
              />
              {thumbnail && (
                <img
                  src={thumbnail}
                  alt="Preview"
                  className="w-full h-24 object-cover rounded-md border border-border"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = 'none'
                  }}
                />
              )}
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
