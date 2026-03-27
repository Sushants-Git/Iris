import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { boardsApi } from '@/lib/api-client'

export function useBoards() {
  return useQuery({
    queryKey: ['boards'],
    queryFn: boardsApi.list,
  })
}

export function useCreateBoard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => boardsApi.create(name),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['boards'] }),
  })
}

export function useUpdateBoard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      boardsApi.update(id, name),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['boards'] }),
  })
}

export function useDeleteBoard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => boardsApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['boards'] }),
  })
}
