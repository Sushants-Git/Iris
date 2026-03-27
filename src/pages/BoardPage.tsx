import { useParams, Navigate } from 'react-router-dom'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { useItems, useCreateItem, useUpdateItem, useDeleteItem } from '@/hooks/useItems'
import { useBoards } from '@/hooks/useBoards'
import { useHistory } from '@/hooks/useHistory'
import { Canvas } from '@/components/canvas/Canvas'
import { ListView } from '@/components/mobile/ListView'

export function BoardPage() {
  const { boardId } = useParams<{ boardId: string }>()
  const isMobile = useMediaQuery('(max-width: 768px)')
  const { data: boards, isLoading: boardsLoading } = useBoards()

  // All hooks must be called unconditionally before any early returns
  const { data: items = [], isLoading } = useItems(boardId)
  const createItem = useCreateItem(boardId ?? '')
  const updateItem = useUpdateItem(boardId ?? '')
  const deleteItem = useDeleteItem(boardId ?? '')

  const { handleCreate, handleUpdate, handleDelete } = useHistory(
    {
      create: (payload, onSuccess) => createItem.mutate(payload, { onSuccess }),
      update: (id, payload) => updateItem.mutate({ id, payload }),
      delete: (id) => deleteItem.mutate(id),
    },
    items,
  )

  if (!boardId) return <Navigate to="/" replace />

  if (!boardsLoading && boards && !boards.find((b) => b.id === boardId)) {
    return <Navigate to="/" replace />
  }

  if (isMobile) {
    return (
      <ListView
        items={items}
        isLoading={isLoading}
        boardId={boardId}
        onStatusToggle={(id, status) => updateItem.mutate({ id, payload: { status } })}
        onDelete={(id) => deleteItem.mutate(id)}
        onCreateItem={createItem.mutate}
      />
    )
  }

  return (
    <Canvas
      items={items}
      isLoading={isLoading}
      boardId={boardId}
      onCreateItem={handleCreate}
      onUpdateItem={handleUpdate}
      onDeleteItem={handleDelete}
    />
  )
}
