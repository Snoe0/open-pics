'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const LoginPage = () => {
  const router = useRouter()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setMessage(null)
    setLoading(true)
    const supabase = createClient()

    if (mode === 'signin') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
      else {
        router.push('/')
        router.refresh()
      }
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password })
      if (error) setError(error.message)
      else if (data.session) {
        router.push('/')
        router.refresh()
      } else {
        setMessage('Check your email to confirm your account, then sign in.')
      }
    }
    setLoading(false)
  }

  return (
    <main className="flex-1 flex items-center justify-center p-6">
      <div className="w-full max-w-sm border border-border bg-surface">
        <div className="px-8 pt-8 pb-6 border-b border-border">
          <h1 className="text-xl font-semibold tracking-tight">VAULT</h1>
          <p className="mt-1 text-sm text-muted">
            {mode === 'signin' ? 'Sign in to your team library' : 'Create your account'}
          </p>
        </div>
        <form onSubmit={submit} className="px-8 py-6 space-y-4">
          <div>
            <label htmlFor="email" className="block text-xs uppercase tracking-wider text-muted mb-1.5">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-surface-2 border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-xs uppercase tracking-wider text-muted mb-1.5">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-surface-2 border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent"
            />
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          {message && <p className="text-sm text-success">{message}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-accent hover:bg-accent-hover text-accent-fg py-2 text-sm font-medium disabled:opacity-50 transition-colors"
          >
            {loading ? 'Working…' : mode === 'signin' ? 'Sign in' : 'Sign up'}
          </button>
        </form>
        <div className="px-8 py-4 border-t border-border text-sm text-muted">
          {mode === 'signin' ? (
            <>
              No account?{' '}
              <button onClick={() => setMode('signup')} className="text-accent hover:text-accent-hover">
                Sign up
              </button>
            </>
          ) : (
            <>
              Have an account?{' '}
              <button onClick={() => setMode('signin')} className="text-accent hover:text-accent-hover">
                Sign in
              </button>
            </>
          )}
        </div>
      </div>
    </main>
  )
}

export default LoginPage
