import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { itemsApi, type CreateItemPayload, type UpdateItemPayload } from '@/lib/api-client'
import type { Item } from '@/types'

export function useItems(boardId: string | undefined) {
  return useQuery({
    queryKey: ['items', boardId],
    queryFn: () => itemsApi.list(boardId!),
    enabled: !!boardId,
  })
}

export function useCreateItem(boardId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateItemPayload) =>
      itemsApi.create(boardId, payload),
    onMutate: async (payload) => {
      await qc.cancelQueries({ queryKey: ['items', boardId] })
      const prev = qc.getQueryData<Item[]>(['items', boardId])
      // Show card immediately before server confirms
      const optimistic: Item = {
        id: `optimistic-${Date.now()}`,
        boardId,
        type: payload.type,
        url: payload.url ?? null,
        scrapedTitle: payload.scrapedTitle ?? null,
        scrapedDescription: payload.scrapedDescription ?? null,
        scrapedThumbnail: payload.scrapedThumbnail ?? null,
        customTitle: payload.customTitle ?? null,
        customDescription: null,
        customThumbnail: null,
        noteContent: payload.noteContent ?? null,
        subcategory: payload.subcategory ?? null,
        x: payload.x ?? 100,
        y: payload.y ?? 100,
        width: payload.width ?? 320,
        height: payload.height ?? 200,
        rotation: 0,
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      qc.setQueryData<Item[]>(['items', boardId], (old) => [...(old ?? []), optimistic])
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      // Roll back optimistic card if server rejected it
      if (ctx?.prev) qc.setQueryData(['items', boardId], ctx.prev)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['items', boardId] }),
  })
}

export function useUpdateItem(boardId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateItemPayload }) =>
      itemsApi.update(id, payload),
    onMutate: async ({ id, payload }) => {
      await qc.cancelQueries({ queryKey: ['items', boardId] })
      const prev = qc.getQueryData<Item[]>(['items', boardId])
      qc.setQueryData<Item[]>(['items', boardId], (old) =>
        old?.map((item) =>
          item.id === id ? { ...item, ...payload } : item,
        ),
      )
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(['items', boardId], ctx.prev)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['items', boardId] }),
  })
}

export function useDeleteItem(boardId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => itemsApi.delete(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ['items', boardId] })
      const prev = qc.getQueryData<Item[]>(['items', boardId])
      qc.setQueryData<Item[]>(['items', boardId], (old) =>
        old?.filter((item) => item.id !== id),
      )
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(['items', boardId], ctx.prev)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['items', boardId] }),
  })
}
