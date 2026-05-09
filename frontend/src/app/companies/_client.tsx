'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import type { Company } from '@/types/company'
import { ScoreBadge } from '@/components/ui/ScoreBadge'
import { SourceBadge } from '@/components/ui/SourceBadge'

function unique<T>(arr: (T | null | undefined)[]): T[] {
  return [...new Set(arr.filter((v): v is T => v !== null && v !== undefined))]
}

export function CompaniesClient({ initialCompanies }: { initialCompanies: Company[] }) {
  const [search, setSearch] = useState('')
  const [sector, setSector] = useState('')
  const [stage, setStage] = useState('')
  const [source, setSource] = useState('')
  const [minScore, setMinScore] = useState(0)

  const sectors = useMemo(() => unique(initialCompanies.map((c) => c.sector)), [initialCompanies])
  const stages  = useMemo(() => unique(initialCompanies.map((c) => c.stage)),  [initialCompanies])
  const sources = useMemo(() => unique(initialCompanies.map((c) => c.source)), [initialCompanies])

  const filtered = useMemo(() => {
    return initialCompanies.filter((c) => {
      if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false
      if (sector && c.sector !== sector) return false
      if (stage  && c.stage  !== stage)  return false
      if (source && c.source !== source) return false
      if (minScore > 0 && (c.score ?? 0) < minScore) return false
      return true
    })
  }, [initialCompanies, search, sector, stage, source, minScore])

  const hasFilters = search || sector || stage || source || minScore > 0

  return (
    <main className="max-w-7xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Companies</h1>
        <p className="text-muted text-sm mt-1">
          {filtered.length} of {initialCompanies.length} companies
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white/60 border border-edge rounded-xl p-4 mb-6 flex flex-wrap gap-3 items-end">
        {/* Search */}
        <div className="flex flex-col gap-1 flex-1 min-w-48">
          <label className="text-xs font-semibold text-muted uppercase tracking-wider">
            Search
          </label>
          <input
            type="text"
            placeholder="Company name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 rounded-lg border border-edge bg-paper px-3 text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-acid/60"
          />
        </div>

        {/* Sector */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-muted uppercase tracking-wider">Sector</label>
          <select
            value={sector}
            onChange={(e) => setSector(e.target.value)}
            className="h-9 rounded-lg border border-edge bg-paper px-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-acid/60"
          >
            <option value="">All sectors</option>
            {sectors.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Stage */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-muted uppercase tracking-wider">Stage</label>
          <select
            value={stage}
            onChange={(e) => setStage(e.target.value)}
            className="h-9 rounded-lg border border-edge bg-paper px-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-acid/60"
          >
            <option value="">All stages</option>
            {stages.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Source */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-muted uppercase tracking-wider">Source</label>
          <select
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="h-9 rounded-lg border border-edge bg-paper px-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-acid/60"
          >
            <option value="">All sources</option>
            {sources.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Min score */}
        <div className="flex flex-col gap-1 min-w-36">
          <label className="text-xs font-semibold text-muted uppercase tracking-wider">
            Min Score: <span className="text-ink">{minScore}</span>
          </label>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={minScore}
            onChange={(e) => setMinScore(Number(e.target.value))}
            className="h-9 accent-acid"
          />
        </div>

        {/* Clear */}
        {hasFilters && (
          <button
            onClick={() => { setSearch(''); setSector(''); setStage(''); setSource(''); setMinScore(0) }}
            className="h-9 px-4 rounded-lg border border-edge text-xs font-semibold text-muted hover:text-ink hover:border-ink transition-colors self-end"
          >
            Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white/60 border border-edge rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-edge bg-paper">
              {['#', 'Company', 'Score', 'Sector', 'Stage', 'Source', 'CRM'].map((h) => (
                <th
                  key={h}
                  className="text-left px-4 py-3 text-muted text-xs font-semibold uppercase tracking-wider first:w-10"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-edge">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-12 text-muted">
                  No companies match your filters.
                </td>
              </tr>
            )}
            {filtered.map((company, i) => (
              <tr key={company.id} className="hover:bg-acid/5 transition-colors group">
                <td className="px-4 py-3 font-mono text-muted text-xs">{i + 1}</td>
                <td className="px-4 py-3">
                  <Link
                    href={`/companies/${company.id}`}
                    className="font-semibold text-ink group-hover:text-heat transition-colors"
                  >
                    {company.name}
                  </Link>
                  {company.summary && (
                    <p className="text-muted text-xs mt-0.5 line-clamp-1">{company.summary}</p>
                  )}
                </td>
                <td className="px-4 py-3"><ScoreBadge score={company.score} /></td>
                <td className="px-4 py-3 text-muted">{company.sector ?? '—'}</td>
                <td className="px-4 py-3 text-muted">{company.stage ?? '—'}</td>
                <td className="px-4 py-3"><SourceBadge source={company.source} /></td>
                <td className="px-4 py-3">
                  <span className="text-xs text-muted capitalize">{company.crm_stage}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  )
}
