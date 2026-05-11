import type { Metadata } from 'next'
import { Syne } from 'next/font/google'
import './globals.css'
import { Nav } from '@/components/Nav'
import { AuthProvider } from '@/lib/auth-context'

const syne = Syne({
  subsets: ['latin'],
  variable: '--font-syne',
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: { default: 'VentureLens', template: '%s — VentureLens' },
  description: 'AI startup intelligence for venture capital',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={syne.variable}>
      <body>
        <AuthProvider>
          <Nav />
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
