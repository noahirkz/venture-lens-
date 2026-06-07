import { Suspense } from 'react'
import { AuthForm } from '../_auth/AuthForm'

export const metadata = { title: 'Sign up' }

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <AuthForm mode="signup" />
    </Suspense>
  )
}
