import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

type CookieBatch = { name: string; value: string; options?: CookieOptions }

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: CookieBatch[]) {
          cookiesToSet.forEach(({ name, value }: CookieBatch) =>
            request.cookies.set(name, value),
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }: CookieBatch) =>
            response.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // Refreshes session if expired. Required by @supabase/ssr.
  await supabase.auth.getUser()

  return response
}

export const config = {
  matcher: [
    // Skip Next internals and static assets.
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
