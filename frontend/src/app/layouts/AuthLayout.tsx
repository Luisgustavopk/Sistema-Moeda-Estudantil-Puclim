import { Outlet, useMatch } from 'react-router'
import { PublicAuthFrame } from '@/features/auth/components/PublicAuthFrame'
import '@/features/auth/pages/registration.css'
export function AuthLayout() {
  const isLogin = useMatch('/login')
  if (isLogin) return <Outlet />

  return (
    <PublicAuthFrame className="registration-experience">
      {() => (
        <main id="auth-form" className="registration-main">
          <Outlet />
        </main>
      )}
    </PublicAuthFrame>
  )
}
