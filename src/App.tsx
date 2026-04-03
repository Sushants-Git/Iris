import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AppShell } from '@/components/layout/AppShell'
import { BoardPage } from '@/pages/BoardPage'
import { RedirectPage } from '@/pages/RedirectPage'
import { PasswordGate } from '@/components/PasswordGate'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
})

export default function App() {
  return (
    <PasswordGate>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<AppShell />}>
              <Route path="/" element={<RedirectPage />} />
              <Route path="/boards/:boardId" element={<BoardPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
    </PasswordGate>
  )
}
