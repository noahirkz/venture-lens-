'use client'

import { scoreColor } from './ScoreBadge'

const R = 44
const SW = 7
const C = 2 * Math.PI * R
const SIZE = 110

export function ScoreRing({ score, className = '' }: { score: number | null; className?: string }) {
  const s = score ?? 0
  const offset = C - (s / 100) * C
  const color = scoreColor(score)

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="-rotate-90"
      >
        {/* Track */}
        <circle
          cx={SIZE / 2} cy={SIZE / 2} r={R}
          strokeWidth={SW}
          stroke="currentColor"
          className="text-edge"
          fill="none"
        />
        {/* Progress */}
        <circle
          cx={SIZE / 2} cy={SIZE / 2} r={R}
          strokeWidth={SW}
          stroke={color}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      {/* Center label */}
      <div className="absolute flex flex-col items-center leading-none">
        <span
          className="text-2xl font-bold tabular-nums"
          style={{ color, fontFamily: 'var(--font-syne)' }}
        >
          {score ?? '—'}
        </span>
        <span className="text-[10px] text-muted mt-0.5 uppercase tracking-wider">score</span>
      </div>
    </div>
  )
}
