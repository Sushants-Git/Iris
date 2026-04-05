import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { Menu } from 'lucide-react'
import { Sidebar } from './Sidebar'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { cn } from '@/lib/utils'

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
            onClick={() => setSidebarOpen((v) => !v)}
            className="p-1 rounded-md hover:bg-muted"
            aria-label="Toggle menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-semibold text-sm">Iris</span>
        </header>

        {/* Click-outside backdrop */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Floating panel — anchored top-left to align with menu button */}
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
      </div>
    )
  }

  return (
    <div className="flex h-full">
      {/* Floating sidebar — always mounted so the close animation plays */}
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
    </div>
  )
}
