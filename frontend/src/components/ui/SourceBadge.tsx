const PRESETS: Record<string, { label: string; color: string; bg: string }> = {
  producthunt: { label: 'PH',     color: '#ff6154', bg: 'rgba(255,97,84,0.12)' },
  yc:          { label: 'YC',     color: '#ff6600', bg: 'rgba(255,102,0,0.12)' },
  manual:      { label: 'Manual', color: '#8c8980', bg: 'rgba(140,137,128,0.12)' },
}

export function SourceBadge({ source }: { source: string | null }) {
  const key = source?.toLowerCase() ?? 'manual'
  const preset = PRESETS[key] ?? {
    label: source ?? '—',
    color: '#8c8980',
    bg: 'rgba(140,137,128,0.12)',
  }

  return (
    <span
      className="inline-block px-2 py-0.5 text-xs font-semibold rounded uppercase tracking-wide"
      style={{ color: preset.color, background: preset.bg }}
    >
      {preset.label}
    </span>
  )
}
