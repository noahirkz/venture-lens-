import { Suspense } from 'react'
import { AuthForm } from '../_auth/AuthForm'

export const metadata = { title: 'Sign in' }

export default function LoginPage() {
  // AuthForm uses useSearchParams() — Next 15 requires it inside Suspense
  // to avoid bailing the whole page out of static rendering.
  return (
    <Suspense fallback={null}>
      <AuthForm mode="login" />
    </Suspense>
  )
}
