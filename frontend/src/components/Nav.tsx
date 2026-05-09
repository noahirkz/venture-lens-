'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const LINKS = [
  { href: '/',           label: 'Dashboard' },
  { href: '/companies',  label: 'Companies' },
  { href: '/analyze',    label: 'Analyze' },
]

export function Nav() {
  const path = usePathname()

  return (
    <header className="sticky top-0 z-50 bg-ink text-paper border-b border-paper/10">
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
        {/* Wordmark */}
        <Link href="/" className="flex items-center gap-2 group">
          <span className="text-acid font-bold text-lg tracking-tight">VL</span>
          <span className="font-semibold text-paper text-sm tracking-widest uppercase">
            VentureLens
          </span>
        </Link>

        {/* Links */}
        <nav className="flex items-center gap-1">
          {LINKS.map(({ href, label }) => {
            const active =
              href === '/' ? path === '/' : path.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={[
                  'px-3 py-1.5 rounded text-xs font-semibold tracking-wider uppercase transition-colors',
                  active
                    ? 'bg-acid text-ink'
                    : 'text-paper/60 hover:text-paper hover:bg-paper/10',
                ].join(' ')}
              >
                {label}
              </Link>
            )
          })}
        </nav>
      </div>
    </header>
  )
}
