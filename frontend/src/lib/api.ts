// Client-side API helpers. SAFE to import from Client Components.
// Server-only helpers live in `./api-server.ts` so we never pull
// `next/headers` into the browser bundle.

import type { Company } from '@/types/company'

export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

export type RateLimitInfo = {
  limit: number
  remaining: number
  reset_at: string
  scope: 'user' | 'anon'
}

export type ApiError = {
  status: number
  message: string
  rate?: RateLimitInfo
  rateLimited: boolean
  body?: unknown
}

export function readRateHeaders(res: Response): RateLimitInfo | undefined {
  const limit = res.headers.get('x-ratelimit-limit')
  const remaining = res.headers.get('x-ratelimit-remaining')
  const reset = res.headers.get('x-ratelimit-reset')
  const scope = res.headers.get('x-ratelimit-scope')
  if (!limit || !remaining || !reset || !scope) return undefined
  return {
    limit: Number(limit),
    remaining: Number(remaining),
    reset_at: reset,
    scope: scope === 'user' ? 'user' : 'anon',
  }
}

export async function parseError(res: Response): Promise<ApiError> {
  const rate = readRateHeaders(res)
  let body: unknown
  let message = `${res.status} ${res.statusText}`
  try {
    body = await res.json()
    if (body && typeof body === 'object') {
      const detail = (body as Record<string, unknown>).detail
      if (typeof detail === 'string') message = detail
      else if (detail && typeof detail === 'object') {
        const m = (detail as Record<string, unknown>).message
        if (typeof m === 'string') message = m
      }
    }
  } catch {
    /* ignore */
  }
  return { status: res.status, message, rate, rateLimited: res.status === 429, body }
}

async function browserAuthHeaders(): Promise<HeadersInit> {
  if (typeof window === 'undefined') return {}
  try {
    const { supabaseBrowser } = await import('./supabase/client')
    const sb = supabaseBrowser()
    const { data } = await sb.auth.getSession()
    const token = data.session?.access_token
    return token ? { Authorization: `Bearer ${token}` } : {}
  } catch {
    return {}
  }
}

async function clientFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const auth = await browserAuthHeaders()
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { ...(init?.headers ?? {}), ...auth },
    cache: 'no-store',
  })
  if (!res.ok) throw await parseError(res)
  return (await res.json()) as T
}

export const api = {
  companies: {
    list: () => clientFetch<Company[]>('/api/v1/companies'),
    get: (id: string) => clientFetch<Company>(`/api/v1/companies/${id}`),
    analyze: (body: { name: string; description: string; website: string }) =>
      clientFetch<Company>('/api/v1/companies/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }),
  },
  me: () =>
    clientFetch<{
      authenticated: boolean
      user: { id: string; email: string | null } | null
      rate_limit: RateLimitInfo & { used: number; now: string }
    }>('/api/v1/me'),
}
