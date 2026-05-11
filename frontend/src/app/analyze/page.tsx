'use client'

import { useState } from 'react'
import type { Company } from '@/types/company'
import { ScoreRing } from '@/components/ui/ScoreRing'
import { SignalBars } from '@/components/ui/SignalBars'
import { SourceBadge } from '@/components/ui/SourceBadge'
import Link from 'next/link'
import { api, type ApiError } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'

const STEPS = [
  'Scraping web…',
  'Running Claude…',
  'Scoring signals…',
]

type State = 'idle' | 'loading' | 'done' | 'error' | 'rate_limited'

type RateError = {
  scope: 'user' | 'anon'
  limit: number
  resetAt: string
  message: string
}

function fmtResetIn(resetIso: string): string {
  if (!resetIso) return ''
  const ms = new Date(resetIso).getTime() - Date.now()
  if (Number.isNaN(ms) || ms <= 0) return 'now'
  const h = Math.floor(ms / 3_600_000)
  const m = Math.floor((ms % 3_600_000) / 60_000)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

export default function AnalyzePage() {
  const { user } = useAuth()
  const [form, setForm] = useState({ name: '', description: '', website: '' })
  const [state, setState] = useState<State>('idle')
  const [stepIdx, setStepIdx] = useState(-1)
  const [doneSteps, setDoneSteps] = useState<number[]>([])
  const [result, setResult] = useState<Company | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [rateError, setRateError] = useState<RateError | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim() || !form.description.trim()) return

    setState('loading')
    setResult(null)
    setRateError(null)
    setDoneSteps([])
    setStepIdx(0)

    const tick = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

    try {
      await tick(500)
      setDoneSteps([0])
      setStepIdx(1)

      const data = await api.companies.analyze(form)

      setDoneSteps([0, 1])
      setStepIdx(2)
      await tick(500)
      setDoneSteps([0, 1, 2])
      await tick(300)

      setResult(data)
      setState('done')
    } catch (err) {
      const apiErr = err as ApiError
      if (apiErr?.rateLimited) {
        const detailObj =
          apiErr.body && typeof apiErr.body === 'object'
            ? ((apiErr.body as Record<string, unknown>).detail as Record<string, unknown> | undefined)
            : undefined
        setRateError({
          scope: apiErr.rate?.scope ?? (user ? 'user' : 'anon'),
          limit: apiErr.rate?.limit ?? Number(detailObj?.limit ?? 0),
          resetAt: apiErr.rate?.reset_at ?? String(detailObj?.reset_at ?? ''),
          message: apiErr.message,
        })
        setState('rate_limited')
      } else {
        setState('error')
        setErrorMsg(apiErr?.message || (err instanceof Error ? err.message : 'Unknown error'))
      }
    }
  }

  const reset = () => {
    setState('idle')
    setResult(null)
    setStepIdx(-1)
    setDoneSteps([])
    setErrorMsg('')
    setRateError(null)
  }

  const summary = result?.raw_data?.summary
  const signals = result?.score_reason?.signals

  return (
    <main className="max-w-3xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Live Analyze</h1>
        <p className="text-muted text-sm mt-1">
          Paste any startup — Claude scores it in real-time.
        </p>
      </div>

      {/* ── Input form ─────────────────────────────────────────────── */}
      {state !== 'done' && state !== 'rate_limited' && (
        <form onSubmit={handleSubmit} className="space-y-4 mb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted">
                Company Name *
              </label>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="e.g. Acme AI"
                required
                disabled={state === 'loading'}
                className="h-11 rounded-xl border border-edge bg-white/60 px-4 text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-acid/60 disabled:opacity-50"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted">
                Website
              </label>
              <input
                name="website"
                value={form.website}
                onChange={handleChange}
                placeholder="acme.ai"
                disabled={state === 'loading'}
                className="h-11 rounded-xl border border-edge bg-white/60 px-4 text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-acid/60 disabled:opacity-50"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted">
              Description *
            </label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="What does this company do? Include any funding, team, or traction signals…"
              required
              rows={5}
              disabled={state === 'loading'}
              className="rounded-xl border border-edge bg-white/60 px-4 py-3 text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-acid/60 resize-none disabled:opacity-50"
            />
          </div>

          <button
            type="submit"
            disabled={state === 'loading' || !form.name.trim() || !form.description.trim()}
            className="w-full h-12 rounded-xl bg-acid text-ink font-bold text-sm tracking-wide uppercase hover:bg-acid/80 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {state === 'loading' ? 'Analyzing…' : 'Analyze with Claude'}
          </button>
        </form>
      )}

      {/* ── Loading steps ──────────────────────────────────────────── */}
      {state === 'loading' && (
        <div className="bg-ink rounded-2xl p-6 space-y-4">
          {STEPS.map((label, i) => {
            const done = doneSteps.includes(i)
            const active = stepIdx === i && !done
            return (
              <div key={i} className="flex items-center gap-3">
                {/* Indicator */}
                <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0">
                  {done ? (
                    <svg className="w-5 h-5 text-acid" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : active ? (
                    <span className="w-4 h-4 rounded-full border-2 border-acid border-t-transparent animate-spin block" />
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-paper/20 block" />
                  )}
                </div>
                <span
                  className={[
                    'text-sm font-medium transition-colors',
                    done   ? 'text-acid'    :
                    active ? 'text-paper'   :
                             'text-paper/30',
                  ].join(' ')}
                >
                  {label}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Error ──────────────────────────────────────────────────── */}
      {state === 'error' && (
        <div className="border border-heat/30 bg-heat/5 rounded-xl p-5">
          <p className="font-semibold text-heat text-sm mb-1">Analysis failed</p>
          <p className="text-xs text-muted">{errorMsg || 'Could not reach the backend.'}</p>
          <button
            onClick={reset}
            className="mt-3 text-xs font-semibold text-ink border border-edge rounded-lg px-3 py-1.5 hover:bg-paper transition-colors"
          >
            Try again
          </button>
        </div>
      )}

      {/* ── Rate limited ───────────────────────────────────────────── */}
      {state === 'rate_limited' && rateError && (
        <div className="border border-acid/40 bg-acid/10 rounded-2xl p-6">
          <p className="font-bold text-ink mb-1">
            Daily limit reached ({rateError.limit}/day for{' '}
            {rateError.scope === 'user' ? 'signed-in users' : 'guests'})
          </p>
          <p className="text-sm text-muted mb-4">
            {rateError.message}
            {rateError.resetAt && ` Resets in ${fmtResetIn(rateError.resetAt)}.`}
          </p>
          <div className="flex gap-2">
            {rateError.scope === 'anon' && (
              <Link
                href="/signup?next=/analyze"
                className="text-xs font-bold bg-acid text-ink px-4 py-2 rounded-lg hover:bg-acid/80 transition-colors uppercase tracking-wider"
              >
                Sign up for more →
              </Link>
            )}
            <button
              onClick={reset}
              className="text-xs font-semibold border border-edge text-muted px-4 py-2 rounded-lg hover:border-ink hover:text-ink transition-colors uppercase tracking-wider"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* ── Result ─────────────────────────────────────────────────── */}
      {state === 'done' && result && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Header */}
          <div className="flex items-start gap-5">
            <div className="bg-ink rounded-2xl p-4 shrink-0">
              <ScoreRing score={result.score} />
            </div>
            <div className="flex flex-col justify-center gap-2 pt-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-2xl font-bold text-ink">{result.name}</h2>
                <SourceBadge source={result.source} />
              </div>
              {result.summary && (
                <p className="text-sm text-muted leading-relaxed">{result.summary}</p>
              )}
              <div className="flex gap-2 pt-1">
                <Link
                  href={`/companies/${result.id}`}
                  className="text-xs font-semibold bg-acid text-ink px-3 py-1.5 rounded-lg hover:bg-acid/80 transition-colors"
                >
                  Full Profile →
                </Link>
                <button
                  onClick={reset}
                  className="text-xs font-semibold border border-edge text-muted px-3 py-1.5 rounded-lg hover:border-ink hover:text-ink transition-colors"
                >
                  Analyze another
                </button>
              </div>
            </div>
          </div>

          {/* Claude intelligence */}
          {summary && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(
                [
                  ['Problem Solved',         summary.problem_solved],
                  ['Target Market',          summary.target_market],
                  ['Business Model',         summary.business_model],
                  ['Competitive Advantage',  summary.competitive_advantage],
                ] as [string, string][]
              )
                .filter(([, v]) => v)
                .map(([label, value]) => (
                  <div key={label} className="border border-edge rounded-xl p-4 bg-white/60">
                    <p className="text-[10px] text-muted uppercase tracking-wider font-semibold mb-1">
                      {label}
                    </p>
                    <p className="text-sm text-ink leading-relaxed">{value}</p>
                  </div>
                ))}
              {summary.red_flags && (
                <div className="sm:col-span-2 border border-heat/30 bg-heat/5 rounded-xl p-4">
                  <p className="text-[10px] text-heat uppercase tracking-wider font-semibold mb-1">
                    Red Flags
                  </p>
                  <p className="text-sm text-ink leading-relaxed">{summary.red_flags}</p>
                </div>
              )}
            </div>
          )}

          {/* Signal bars */}
          {signals && (
            <div className="bg-white/60 border border-edge rounded-xl p-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted mb-4">
                Signal Breakdown
              </h3>
              <SignalBars signals={signals} />
              {result.score_reason?.reasoning && (
                <p className="mt-4 pt-4 border-t border-edge text-sm text-muted italic leading-relaxed">
                  {result.score_reason.reasoning}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </main>
  )
}
