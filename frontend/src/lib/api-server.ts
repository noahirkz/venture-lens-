// Server-only API helpers. NEVER import this from a Client Component —
// it pulls in `next/headers` and the cookie-aware Supabase client.
// Use these in Server Components, Route Handlers, and Server Actions.

import { headers as nextHeaders } from 'next/headers'
import type { Company } from '@/types/company'
import { API_BASE, parseError } from './api'
import { supabaseServer } from './supabase/server'

async function serverHeaders(): Promise<HeadersInit> {
  const out: Record<string, string> = {}
  const h = await nextHeaders()
  const xff = h.get('x-forwarded-for')
  const realIp = h.get('x-real-ip')
  if (xff) out['x-forwarded-for'] = xff
  if (realIp) out['x-real-ip'] = realIp

  try {
    const sb = await supabaseServer()
    const { data } = await sb.auth.getSession()
    const token = data.session?.access_token
    if (token) out['Authorization'] = `Bearer ${token}`
  } catch {
    /* unauth */
  }
  return out
}

async function serverFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const auth = await serverHeaders()
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { ...(init?.headers ?? {}), ...auth },
    cache: 'no-store',
  })
  if (!res.ok) throw await parseError(res)
  return (await res.json()) as T
}

export const serverApi = {
  companies: {
    list: () => serverFetch<Company[]>('/api/v1/companies'),
    get: (id: string) => serverFetch<Company>(`/api/v1/companies/${id}`),
  },
}
