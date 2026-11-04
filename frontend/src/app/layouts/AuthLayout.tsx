import { Outlet, useMatch } from 'react-router'
import { PublicAuthFrame } from '@/features/auth/components/PublicAuthFrame'
import { RegistrationHeader } from '@/features/auth/components/RegistrationHeader'
import '@/features/auth/pages/registration.css'
export function AuthLayout() {
  const isLogin = useMatch('/login')
  const isRegistration = useMatch('/cadastro/:kind')
  if (isLogin) return <Outlet />

  return (
    <PublicAuthFrame className="registration-experience">
      {() => (
        <main id="auth-form" className="registration-main">
          {isRegistration ? (
            <div className="auth-panel register-panel">
              <RegistrationHeader />
              <Outlet />
            </div>
          ) : (
            <Outlet />
          )}
        </main>
      )}
    </PublicAuthFrame>
  )
}
