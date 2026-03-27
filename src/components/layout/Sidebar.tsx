import { useState, useRef } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { Plus, Trash2, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useBoards, useDeleteBoard, useUpdateBoard } from '@/hooks/useBoards'
import { CreateBoardModal } from '@/components/modals/CreateBoardModal'

interface Props {
  onNavigate?: () => void
}

export function Sidebar({ onNavigate }: Props) {
  const { boardId } = useParams<{ boardId: string }>()
  const navigate = useNavigate()
  const { data: boards = [], isLoading } = useBoards()
  const deleteBoard = useDeleteBoard()
  const updateBoard = useUpdateBoard()
  const [createOpen, setCreateOpen] = useState(false)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const renameInputRef = useRef<HTMLInputElement>(null)

  function startRename(id: string, currentName: string) {
    setRenamingId(id)
    setRenameValue(currentName)
    setTimeout(() => renameInputRef.current?.select(), 0)
  }

  function commitRename() {
    if (!renamingId) return
    const trimmed = renameValue.trim()
    if (trimmed) updateBoard.mutate({ id: renamingId, name: trimmed })
    setRenamingId(null)
  }

  function handleDelete(id: string) {
    deleteBoard.mutate(id)
    if (boardId === id) navigate('/')
  }

  return (
    <aside className="flex flex-col h-full w-64 border-r border-border bg-sidebar text-sidebar-foreground">
      {/* Header */}
      <div className="flex items-center px-4 py-4 border-b border-sidebar-border">
        <span className="font-semibold text-sm">Iris</span>
      </div>

      {/* Board list */}
      <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
        {isLoading && (
          <div className="px-2 py-1 text-xs text-muted-foreground">Loading…</div>
        )}

        {boards.map((board) => (
          <div key={board.id} className="group relative flex items-center rounded-md">
            {renamingId === board.id ? (
              <div className="flex-1 flex items-center gap-1 px-2 py-1">
                <input
                  ref={renameInputRef}
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitRename()
                    if (e.key === 'Escape') setRenamingId(null)
                  }}
                  className="flex-1 text-sm bg-transparent border-b border-primary outline-none min-w-0"
                  autoFocus
                />
                <button onClick={commitRename} className="p-0.5 text-emerald-600 hover:text-emerald-700">
                  <Check className="w-3 h-3" />
                </button>
                <button onClick={() => setRenamingId(null)} className="p-0.5 text-muted-foreground hover:text-foreground">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <>
                <Link
                  to={`/boards/${board.id}`}
                  onClick={onNavigate}
                  onDoubleClick={() => startRename(board.id, board.name)}
                  className={cn(
                    'flex-1 flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors truncate',
                    boardId === board.id
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent/60',
                  )}
                >
                  <span className="truncate">{board.name}</span>
                </Link>
                <button
                  onClick={() => handleDelete(board.id)}
                  className="absolute right-1 opacity-0 group-hover:opacity-100 p-1 rounded hover:text-destructive transition-opacity"
                  aria-label="Delete board"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </>
            )}
          </div>
        ))}

        {!isLoading && boards.length === 0 && (
          <div className="px-2 py-1 text-xs text-muted-foreground">No boards yet</div>
        )}
      </nav>

      {/* Footer */}
      <div className="px-2 py-3 border-t border-sidebar-border">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-sm"
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="w-4 h-4" />
          New Board
        </Button>
      </div>

      <CreateBoardModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(id) => navigate(`/boards/${id}`)}
      />
    </aside>
  )
}
