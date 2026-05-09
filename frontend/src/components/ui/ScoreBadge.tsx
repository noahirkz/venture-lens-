export function scoreColor(score: number | null): string {
  if (score === null) return '#8c8980'
  if (score >= 80) return '#c8ff00'
  if (score >= 60) return '#f59e0b'
  return '#ff4d1c'
}

export function scoreBg(score: number | null): string {
  if (score === null) return 'rgba(140,137,128,0.15)'
  if (score >= 80) return 'rgba(200,255,0,0.12)'
  if (score >= 60) return 'rgba(245,158,11,0.12)'
  return 'rgba(255,77,28,0.12)'
}

export function ScoreBadge({
  score,
  size = 'sm',
}: {
  score: number | null
  size?: 'sm' | 'md'
}) {
  const label = score === null ? '—' : score.toString()
  const pad = size === 'md' ? 'px-3 py-1 text-sm' : 'px-2 py-0.5 text-xs'

  return (
    <span
      className={`inline-block rounded font-bold font-mono tabular-nums leading-none ${pad}`}
      style={{ color: scoreColor(score), background: scoreBg(score) }}
    >
      {label}
    </span>
  )
}
