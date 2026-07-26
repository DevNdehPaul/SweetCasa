'use client'

import { FormEvent, useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { useAuth } from '@/lib/auth'

export default function LoginPage() {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await login(email, password)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-navy px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-gold/15">
            <ShieldCheck className="text-gold" size={22} strokeWidth={2} />
          </div>
          <div className="font-display text-3xl text-white">SweetCasa</div>
          <div className="mt-1 text-xs uppercase tracking-[0.16em] text-gold">Trust Desk</div>
        </div>

        <form onSubmit={handleSubmit} className="rounded-card bg-white p-6 shadow-xl">
          <h1 className="mb-1 font-display text-xl text-ink">Admin sign in</h1>
          <p className="mb-5 text-sm text-ink/55">Verify listings, documents, and reports.</p>

          {error && (
            <div className="mb-4 rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
              {error}
            </div>
          )}

          <label className="mb-3 block text-sm">
            <span className="mb-1 block font-medium text-ink">Email</span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-navy"
              placeholder="admin@sweetcasa.com"
            />
          </label>

          <label className="mb-5 block text-sm">
            <span className="mb-1 block font-medium text-ink">Password</span>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-line px-3 py-2 text-sm outline-none focus:border-navy"
              placeholder="••••••••"
            />
          </label>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-navy py-2.5 text-sm font-medium text-white transition-colors hover:bg-navy-light disabled:opacity-60"
          >
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="mt-5 text-center text-xs text-white/40">
          Admin accounts are created with <code className="text-white/60">npm run seed:admin</code>, not this form.
        </p>
      </div>
    </div>
  )
}
