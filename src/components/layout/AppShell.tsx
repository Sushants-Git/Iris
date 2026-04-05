import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { Menu, Clock } from 'lucide-react'
import { Sidebar } from './Sidebar'
import { WorkLogPanel } from '@/components/WorkLogPanel'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { cn } from '@/lib/utils'

export function AppShell() {
  const isMobile = useMediaQuery('(max-width: 768px)')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [workLogOpen, setWorkLogOpen] = useState(false)

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'l') {
        e.preventDefault()
        setWorkLogOpen((v) => !v)
      }
      if (!isMobile && (e.metaKey || e.ctrlKey) && e.key === 'j') {
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
            onClick={() => setSidebarOpen((v) => !v)}
            className="p-1 rounded-md hover:bg-muted"
            aria-label="Toggle menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-semibold text-sm flex-1">Iris</span>
          <button
            onClick={() => setWorkLogOpen((v) => !v)}
            className="p-1 rounded-md hover:bg-muted text-muted-foreground"
            aria-label="Work log"
          >
            <Clock className="w-5 h-5" />
          </button>
        </header>

        {/* Sidebar backdrop */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Floating sidebar panel */}
        <div
          className={cn(
            'fixed top-16 left-3 z-50 transition-all duration-300 ease-in-out',
            sidebarOpen ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-2 pointer-events-none',
          )}
        >
          <Sidebar
            onClose={() => setSidebarOpen(false)}
            onNavigate={() => setSidebarOpen(false)}
          />
        </div>

        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>

        <WorkLogPanel open={workLogOpen} onClose={() => setWorkLogOpen(false)} />
      </div>
    )
  }

  return (
    <div className="flex h-full">
      {/* Floating sidebar */}
      <div
        className={cn(
          'fixed top-3 right-3 z-40 transition-all duration-300 ease-in-out',
          sidebarOpen ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-2 pointer-events-none',
        )}
      >
        <Sidebar onClose={() => setSidebarOpen(false)} isOpen={sidebarOpen} />
      </div>

      <main className="flex-1 overflow-hidden">
        <Outlet />
      </main>

      <WorkLogPanel open={workLogOpen} onClose={() => setWorkLogOpen(false)} />
    </div>
  )
}
