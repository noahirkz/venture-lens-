'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase/client'

type Mode = 'login' | 'signup'

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter()
  const params = useSearchParams()
  const next = params.get('next') || '/'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr(null)
    setInfo(null)
    setLoading(true)
    const sb = supabaseBrowser()
    try {
      if (mode === 'signup') {
        const { error } = await sb.auth.signUp({ email, password })
        if (error) throw error
        // If email confirmations are enabled, session may be null until verified.
        const { data } = await sb.auth.getSession()
        if (data.session) {
          router.push(next)
          router.refresh()
        } else {
          setInfo('Check your inbox to confirm your email, then sign in.')
        }
      } else {
        const { error } = await sb.auth.signInWithPassword({ email, password })
        if (error) throw error
        router.push(next)
        router.refresh()
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  const isSignup = mode === 'signup'

  return (
    <main className="max-w-sm mx-auto px-6 py-16">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-ink">
          {isSignup ? 'Create your account' : 'Sign in'}
        </h1>
        <p className="text-muted text-sm mt-1">
          {isSignup
            ? 'Signed-in users get 7 daily searches (vs 3 for guests).'
            : 'Welcome back. Sign in to lift your daily search cap.'}
        </p>
      </div>

      <form onSubmit={submit} className="space-y-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted">
            Email
          </label>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-11 rounded-xl border border-edge bg-white/60 px-4 text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-acid/60"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted">
            Password
          </label>
          <input
            type="password"
            required
            minLength={6}
            autoComplete={isSignup ? 'new-password' : 'current-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-11 rounded-xl border border-edge bg-white/60 px-4 text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-acid/60"
          />
        </div>

        {err && (
          <div className="border border-heat/30 bg-heat/5 text-heat rounded-lg px-3 py-2 text-xs">
            {err}
          </div>
        )}
        {info && (
          <div className="border border-acid/40 bg-acid/10 text-ink rounded-lg px-3 py-2 text-xs">
            {info}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full h-12 rounded-xl bg-acid text-ink font-bold text-sm tracking-wide uppercase hover:bg-acid/80 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? '…' : isSignup ? 'Create account' : 'Sign in'}
        </button>
      </form>

      <p className="text-xs text-muted mt-6 text-center">
        {isSignup ? (
          <>
            Already have an account?{' '}
            <Link href={`/login?next=${encodeURIComponent(next)}`} className="text-ink font-semibold underline underline-offset-2">
              Sign in
            </Link>
          </>
        ) : (
          <>
            Need an account?{' '}
            <Link href={`/signup?next=${encodeURIComponent(next)}`} className="text-ink font-semibold underline underline-offset-2">
              Sign up
            </Link>
          </>
        )}
      </p>
    </main>
  )
}
