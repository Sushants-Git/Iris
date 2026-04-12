import { useState } from 'react'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { getToken, setToken, clearToken } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

function isAuthed() {
  return !!getToken()
}

interface Props {
  children: React.ReactNode
}

export function PasswordGate({ children }: Props) {
  const [authed, setAuthed] = useState(isAuthed)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPw, setShowPw] = useState(false)

  if (authed) return <>{children}</>

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const data = await res.json()
      if (data.ok && data.token) {
        setToken(data.token)
        setAuthed(true)
      } else {
        setError('Wrong password')
        setPassword('')
      }
    } catch {
      setError('Could not connect')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-background">
      <div className="w-full max-w-sm px-6">
        <h1 className="text-2xl font-semibold mb-8 text-center">Iris</h1>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="relative">
            <Input
              type={showPw ? 'text' : 'password'}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              autoComplete="current-password"
              className="h-10 pr-10"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => setShowPw((v) => !v)}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground"
              tabIndex={-1}
            >
              {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </Button>
          </div>

          {error && <p className="text-sm text-destructive text-center">{error}</p>}

          <Button type="submit" disabled={loading || !password} className="w-full h-10">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enter'}
          </Button>
        </form>
      </div>
    </div>
  )
}

// Call this anywhere to force logout (e.g. on 401 from API)
export function logout() {
  clearToken()
  window.location.reload()
}
