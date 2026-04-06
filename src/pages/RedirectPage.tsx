import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { boardsApi } from '@/lib/api-client'

export function RedirectPage() {
  const navigate = useNavigate()
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return
    ran.current = true

    boardsApi
      .list()
      .then(async (boards) => {
        if (boards.length > 0) {
          const lastId = localStorage.getItem('iris_last_board')
          const target = boards.find((b) => b.id === lastId) ?? boards[0]
          navigate(`/boards/${target.id}`, { replace: true })
        } else {
          const board = await boardsApi.create('My Board')
          navigate(`/boards/${board.id}`, { replace: true })
        }
      })
      .catch(() => {
        // API unreachable — stay on loading screen, user will see the error
      })
  }, [navigate])

  return (
    <div className="flex items-center justify-center h-full gap-2 text-muted-foreground text-sm">
      <span className="w-4 h-4 rounded-full border-2 border-muted-foreground border-t-transparent animate-spin" />
      Loading…
    </div>
  )
}
