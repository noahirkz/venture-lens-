import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

type CookieBatch = { name: string; value: string; options?: CookieOptions }

export async function supabaseServer() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: CookieBatch[]) {
          // In Server Components, set is a no-op; middleware refreshes.
          try {
            cookiesToSet.forEach(({ name, value, options }: CookieBatch) =>
              cookieStore.set(name, value, options),
            )
          } catch {
            // ignored — read-only context
          }
        },
      },
    },
  )
}
