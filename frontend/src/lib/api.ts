import type { Company } from '@/types/company'

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'

async function apiFetch<T>(
  path: string,
  options?: RequestInit & { revalidate?: number },
): Promise<T> {
  const { revalidate = 30, ...rest } = options ?? {}
  const res = await fetch(`${API_BASE}${path}`, {
    next: { revalidate },
    ...rest,
  })
  if (!res.ok) {
    throw new Error(`API ${res.status}: ${path}`)
  }
  return res.json() as Promise<T>
}

export const api = {
  companies: {
    list: () => apiFetch<Company[]>('/api/v1/companies', { revalidate: 30 }),
    get: (id: string) =>
      apiFetch<Company>(`/api/v1/companies/${id}`, { revalidate: 0 }),
    analyze: (body: { name: string; description: string; website: string }) =>
      apiFetch<Company>('/api/v1/companies/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        revalidate: 0,
      }),
  },
}
