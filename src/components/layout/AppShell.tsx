import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { Sidebar } from './Sidebar'
import { useMediaQuery } from '@/hooks/useMediaQuery'

export function AppShell() {
  const isMobile = useMediaQuery('(max-width: 768px)')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    if (isMobile) return
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'j') {
        e.preventDefault()
        setSidebarOpen((v) => !v)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isMobile])

  if (isMobile) {
    return (
      <div className="flex flex-col h-full">
        {/* Mobile top bar */}
        <header className="flex items-center gap-3 px-4 py-3 border-b border-border bg-background sticky top-0 z-40">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1 rounded-md hover:bg-muted"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-semibold text-sm">Iris</span>
        </header>

        {/* Mobile drawer */}
        {sidebarOpen && (
          <>
            <div
              className="fixed inset-0 bg-black/40 z-40"
              onClick={() => setSidebarOpen(false)}
            />
            <div className="fixed inset-y-0 left-0 z-50 flex">
              <Sidebar onNavigate={() => setSidebarOpen(false)} />
              <button
                className="absolute top-3 right-[-40px] p-2 text-white"
                onClick={() => setSidebarOpen(false)}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </>
        )}

        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    )
  }

  return (
    <div className="flex h-full">
      {sidebarOpen && (
        <>
          <div
            className="fixed inset-0 z-30"
            onPointerDown={() => setSidebarOpen(false)}
          />
          <div className="relative z-40 shrink-0" onPointerDown={(e) => e.stopPropagation()}>
            <Sidebar />
          </div>
        </>
      )}
      <main className="flex-1 overflow-hidden">
        <Outlet />
      </main>
    </div>
  )
}
