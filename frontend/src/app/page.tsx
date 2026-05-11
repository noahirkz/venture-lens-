import Link from 'next/link'
import { serverApi } from '@/lib/api-server'
import type { Company } from '@/types/company'
import { ScoreBadge } from '@/components/ui/ScoreBadge'
import { SourceBadge } from '@/components/ui/SourceBadge'

// Per-user rate limit means we can't statically cache; render fresh.
export const dynamic = 'force-dynamic'

function computeStats(companies: Company[]) {
  const scored = companies.filter((c) => c.score !== null)
  const avgScore = scored.length
    ? Math.round(scored.reduce((s, c) => s + c.score!, 0) / scored.length)
    : 0

  const counts: Record<string, number> = {}
  for (const c of companies) {
    if (c.sector) counts[c.sector] = (counts[c.sector] ?? 0) + 1
  }
  const topSector =
    Object.entries(counts).sort(([, a], [, b]) => b - a)[0]?.[0] ?? '—'

  return { total: companies.length, avgScore, topSector }
}

export default async function Home() {
  let companies: Company[] = []
  let error = false

  try {
    companies = await serverApi.companies.list()
  } catch {
    error = true
  }

  const { total, avgScore, topSector } = computeStats(companies)
  const top20 = companies.slice(0, 20)

  return (
    <main className="max-w-7xl mx-auto px-6 py-10">
      {/* ── Hero stats ───────────────────────────────────────────────── */}
      <div className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight text-ink mb-1">
          Signal Dashboard
        </h1>
        <p className="text-muted text-sm">
          AI-scored startup intelligence, refreshed continuously.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-10">
        {[
          { label: 'Companies Tracked', value: total.toLocaleString() },
          {
            label: 'Avg Signal Score',
            value: avgScore,
            accent: true,
          },
          { label: 'Top Sector', value: topSector },
        ].map(({ label, value, accent }) => (
          <div
            key={label}
            className="bg-ink rounded-xl px-6 py-5 flex flex-col gap-1"
          >
            <span className="text-paper/50 text-xs uppercase tracking-widest font-semibold">
              {label}
            </span>
            <span
              className="text-3xl font-bold truncate"
              style={{ color: accent ? '#c8ff00' : '#f5f2eb' }}
            >
              {value}
            </span>
          </div>
        ))}
      </div>

      {/* ── Leaderboard ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold tracking-tight">Top Companies by Signal Score</h2>
        <Link
          href="/companies"
          className="text-xs font-semibold text-muted hover:text-ink transition-colors"
        >
          View all →
        </Link>
      </div>

      {error && (
        <div className="border border-heat/30 bg-heat/5 text-heat rounded-lg px-4 py-3 text-sm mb-4">
          Could not reach the backend API. Make sure the server is running on port 8000.
        </div>
      )}

      <div className="bg-white/60 border border-edge rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-edge bg-paper">
              <th className="text-left px-4 py-3 text-muted text-xs font-semibold uppercase tracking-wider w-10">
                #
              </th>
              <th className="text-left px-4 py-3 text-muted text-xs font-semibold uppercase tracking-wider">
                Company
              </th>
              <th className="text-left px-4 py-3 text-muted text-xs font-semibold uppercase tracking-wider w-20">
                Score
              </th>
              <th className="text-left px-4 py-3 text-muted text-xs font-semibold uppercase tracking-wider hidden md:table-cell">
                Sector
              </th>
              <th className="text-left px-4 py-3 text-muted text-xs font-semibold uppercase tracking-wider hidden lg:table-cell">
                Stage
              </th>
              <th className="text-left px-4 py-3 text-muted text-xs font-semibold uppercase tracking-wider">
                Source
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-edge">
            {top20.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-12 text-muted text-sm">
                  No companies yet — run the pipeline or use{' '}
                  <Link href="/analyze" className="text-ink underline underline-offset-2">
                    Analyze
                  </Link>{' '}
                  to add one.
                </td>
              </tr>
            )}
            {top20.map((company, i) => (
              <tr
                key={company.id}
                className="hover:bg-acid/5 transition-colors group"
              >
                <td className="px-4 py-3 font-mono text-muted text-xs">
                  {i + 1}
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/companies/${company.id}`}
                    className="font-semibold text-ink group-hover:text-heat transition-colors"
                  >
                    {company.name}
                  </Link>
                  {company.summary && (
                    <p className="text-muted text-xs mt-0.5 line-clamp-1">
                      {company.summary}
                    </p>
                  )}
                </td>
                <td className="px-4 py-3">
                  <ScoreBadge score={company.score} />
                </td>
                <td className="px-4 py-3 text-muted hidden md:table-cell">
                  {company.sector ?? '—'}
                </td>
                <td className="px-4 py-3 text-muted hidden lg:table-cell">
                  {company.stage ?? '—'}
                </td>
                <td className="px-4 py-3">
                  <SourceBadge source={company.source} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  )
}
