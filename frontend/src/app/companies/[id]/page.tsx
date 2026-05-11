import { notFound } from 'next/navigation'
import Link from 'next/link'
import { serverApi } from '@/lib/api-server'
import { ScoreRing } from '@/components/ui/ScoreRing'
import { SignalBars } from '@/components/ui/SignalBars'
import { SourceBadge } from '@/components/ui/SourceBadge'

// Per-user rate limit means we can't statically cache; render fresh.
export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const company = await serverApi.companies.get(id).catch(() => null)
  return { title: company?.name ?? 'Company' }
}

function SummaryCard({ label, value }: { label: string; value: string | undefined }) {
  if (!value) return null
  return (
    <div className="border border-edge rounded-xl p-4 bg-white/40">
      <p className="text-xs text-muted uppercase tracking-wider font-semibold mb-1.5">{label}</p>
      <p className="text-sm text-ink leading-relaxed">{value}</p>
    </div>
  )
}

function formatUSD(n: number | null) {
  if (!n) return null
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`
  return `$${n}`
}

export default async function CompanyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const company = await serverApi.companies.get(id).catch(() => null)
  if (!company) notFound()

  const summary = company.raw_data?.summary
  const signals = company.score_reason?.signals

  return (
    <main className="max-w-5xl mx-auto px-6 py-10">
      {/* Back */}
      <Link
        href="/companies"
        className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-ink transition-colors mb-8 font-semibold uppercase tracking-wider"
      >
        ← Companies
      </Link>

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-6 mb-10">
        {/* Score ring */}
        <div className="bg-ink rounded-2xl p-5 flex items-center justify-center shrink-0">
          <ScoreRing score={company.score} />
        </div>

        {/* Name + meta */}
        <div className="flex flex-col justify-center gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight text-ink">
              {company.name}
            </h1>
            <SourceBadge source={company.source} />
          </div>

          {company.summary && (
            <p className="text-base text-muted leading-relaxed max-w-xl">
              {company.summary}
            </p>
          )}

          <div className="flex flex-wrap gap-3 pt-1">
            {company.website && (
              <a
                href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold bg-acid text-ink px-3 py-1.5 rounded-lg hover:bg-acid/80 transition-colors"
              >
                Visit Website ↗
              </a>
            )}
            {company.source_url && (
              <a
                href={company.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold border border-edge text-muted px-3 py-1.5 rounded-lg hover:border-ink hover:text-ink transition-colors"
              >
                Source ↗
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* ── Left column: Claude intelligence ───────────────────── */}
        <div className="lg:col-span-3 space-y-6">

          {/* Claude summary cards */}
          {summary && (
            <section>
              <h2 className="text-sm font-bold uppercase tracking-wider text-muted mb-3">
                Claude Intelligence
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <SummaryCard label="Problem Solved"        value={summary.problem_solved} />
                <SummaryCard label="Target Market"        value={summary.target_market} />
                <SummaryCard label="Business Model"       value={summary.business_model} />
                <SummaryCard label="Competitive Advantage" value={summary.competitive_advantage} />
                {summary.red_flags && (
                  <div className="sm:col-span-2 border border-heat/30 bg-heat/5 rounded-xl p-4">
                    <p className="text-xs text-heat uppercase tracking-wider font-semibold mb-1.5">
                      Red Flags
                    </p>
                    <p className="text-sm text-ink leading-relaxed">{summary.red_flags}</p>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Score signals */}
          {signals && (
            <section>
              <h2 className="text-sm font-bold uppercase tracking-wider text-muted mb-3">
                Signal Breakdown
              </h2>
              <div className="bg-white/60 border border-edge rounded-xl p-5">
                <SignalBars signals={signals} />
                {company.score_reason?.reasoning && (
                  <p className="mt-4 pt-4 border-t border-edge text-sm text-muted italic leading-relaxed">
                    {company.score_reason.reasoning}
                  </p>
                )}
              </div>
            </section>
          )}

          {/* Description */}
          {company.description && (
            <section>
              <h2 className="text-sm font-bold uppercase tracking-wider text-muted mb-3">
                Description
              </h2>
              <div className="bg-white/60 border border-edge rounded-xl p-5">
                <p className="text-sm text-ink leading-relaxed">{company.description}</p>
              </div>
            </section>
          )}
        </div>

        {/* ── Right column: meta + founders + funding ─────────────── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Company details */}
          <section className="bg-ink rounded-xl p-5 text-paper">
            <h2 className="text-xs font-bold uppercase tracking-wider text-paper/50 mb-4">
              Details
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Sector',       value: company.sector },
                { label: 'Stage',        value: company.stage },
                { label: 'HQ',           value: company.hq_country },
                { label: 'Founded',      value: company.founded_year },
                { label: 'Employees',    value: company.employee_count },
                { label: 'Total Raised', value: formatUSD(company.total_raised) },
                { label: 'Last Round',   value: company.last_round },
                { label: 'CRM Stage',    value: company.crm_stage },
              ]
                .filter(({ value }) => value !== null && value !== undefined)
                .map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-[10px] text-paper/40 uppercase tracking-wider font-semibold">
                      {label}
                    </p>
                    <p className="text-sm font-medium text-paper capitalize mt-0.5">
                      {String(value)}
                    </p>
                  </div>
                ))}
            </div>
          </section>

          {/* Founders */}
          {company.founders && company.founders.length > 0 && (
            <section>
              <h2 className="text-sm font-bold uppercase tracking-wider text-muted mb-3">
                Founders
              </h2>
              <div className="space-y-3">
                {company.founders.map((f) => (
                  <div
                    key={f.id}
                    className="bg-white/60 border border-edge rounded-xl p-4"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-sm text-ink">{f.name}</p>
                        {f.background && (
                          <p className="text-xs text-muted mt-0.5 line-clamp-2">
                            {f.background}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        {f.is_repeat && (
                          <span className="text-[10px] bg-acid/20 text-ink px-1.5 py-0.5 rounded font-semibold">
                            Repeat
                          </span>
                        )}
                        {f.prior_exits > 0 && (
                          <span className="text-[10px] text-muted">
                            {f.prior_exits} exit{f.prior_exits !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </div>
                    {f.linkedin_url && (
                      <a
                        href={f.linkedin_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-block text-[10px] text-muted hover:text-ink transition-colors underline underline-offset-2"
                      >
                        LinkedIn ↗
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Funding events */}
          {company.funding_events && company.funding_events.length > 0 && (
            <section>
              <h2 className="text-sm font-bold uppercase tracking-wider text-muted mb-3">
                Funding Timeline
              </h2>
              <div className="relative pl-4 border-l-2 border-edge space-y-4">
                {company.funding_events
                  .sort((a, b) => (b.event_date ?? '').localeCompare(a.event_date ?? ''))
                  .map((ev) => (
                    <div key={ev.id} className="relative">
                      <div className="absolute -left-[1.35rem] top-1 w-2.5 h-2.5 rounded-full bg-acid border-2 border-paper" />
                      <p className="text-xs text-muted">
                        {ev.event_date
                          ? new Date(ev.event_date).toLocaleDateString('en-US', {
                              month: 'short',
                              year: 'numeric',
                            })
                          : 'Date unknown'}
                      </p>
                      <p className="text-sm font-semibold text-ink">
                        {ev.round_type ?? 'Unknown round'}
                        {ev.amount_usd ? ` · ${formatUSD(ev.amount_usd)}` : ''}
                      </p>
                      {ev.investors && (
                        <p className="text-xs text-muted mt-0.5">{ev.investors}</p>
                      )}
                    </div>
                  ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </main>
  )
}
