import type { ScoreSignals } from '@/types/company'
import { scoreColor } from './ScoreBadge'

const SIGNALS: { key: keyof ScoreSignals; label: string; weight: number }[] = [
  { key: 'team',             label: 'Team',              weight: 30 },
  { key: 'traction',         label: 'Traction',          weight: 25 },
  { key: 'market',           label: 'Market',            weight: 20 },
  { key: 'funding_velocity', label: 'Funding Velocity',  weight: 15 },
  { key: 'differentiation',  label: 'Differentiation',   weight: 10 },
]

export function SignalBars({ signals }: { signals: ScoreSignals }) {
  return (
    <div className="space-y-4">
      {SIGNALS.map(({ key, label, weight }) => {
        const val = signals[key]
        const color = scoreColor(val)
        return (
          <div key={key}>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-ink">{label}</span>
                <span className="text-xs text-muted">{weight}%</span>
              </div>
              <span
                className="text-sm font-bold tabular-nums"
                style={{ color }}
              >
                {val}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-edge overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{ width: `${val}%`, backgroundColor: color, transition: 'width 0.5s ease' }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
