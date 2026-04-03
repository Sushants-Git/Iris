import { useState, useRef, useEffect } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { Plus, Trash2, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useBoards, useDeleteBoard, useUpdateBoard } from '@/hooks/useBoards'
import { CreateBoardModal } from '@/components/modals/CreateBoardModal'

interface Props {
  onNavigate?: () => void
  onClose?: () => void
  isOpen?: boolean
}

export function Sidebar({ onNavigate, onClose, isOpen = true }: Props) {
  const { boardId } = useParams<{ boardId: string }>()
  const navigate = useNavigate()
  const { data: boards = [], isLoading } = useBoards()
  const deleteBoard = useDeleteBoard()
  const updateBoard = useUpdateBoard()
  const [createOpen, setCreateOpen] = useState(false)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const currentIndex = boards.findIndex((b) => b.id === boardId)
  const [focusedIndex, setFocusedIndex] = useState(() => Math.max(currentIndex, 0))
  const renameInputRef = useRef<HTMLInputElement>(null)
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (!isOpen) return
      if (renamingId) return
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        const next = Math.min(focusedIndex + 1, boards.length - 1)
        setFocusedIndex(next)
        if (boards[next]) navigate(`/boards/${boards[next].id}`)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        const next = Math.max(focusedIndex - 1, 0)
        setFocusedIndex(next)
        if (boards[next]) navigate(`/boards/${boards[next].id}`)
      } else if (e.key === 'Enter' || e.key === 'Escape') {
        onNavigate?.()
        onClose?.()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [boards, focusedIndex, renamingId, navigate, onNavigate, isOpen])

  // Scroll focused item into view
  useEffect(() => {
    itemRefs.current[focusedIndex]?.scrollIntoView({ block: 'nearest' })
  }, [focusedIndex])

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
    <aside className="flex flex-col w-56 max-h-[80vh] bg-sidebar text-sidebar-foreground shadow-2xl rounded-xl border border-sidebar-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center px-4 py-4 border-b border-sidebar-border">
        <span className="font-semibold text-sm flex-1">Iris</span>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-sidebar-accent text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Close sidebar"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Board list */}
      <nav className="overflow-y-auto px-2 py-2 space-y-0.5">
        {isLoading && (
          <div className="px-2 py-1 text-xs text-muted-foreground">Loading…</div>
        )}

        {boards.map((board, i) => (
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
                  ref={(el) => { itemRefs.current[i] = el }}
                  to={`/boards/${board.id}`}
                  onClick={onNavigate}
                  onDoubleClick={() => startRename(board.id, board.name)}
                  onMouseEnter={() => setFocusedIndex(i)}
                  className={cn(
                    'flex-1 flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors truncate',
                    focusedIndex === i
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
