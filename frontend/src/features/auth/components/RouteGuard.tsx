import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuth } from '../hooks/auth-context'
import { Loading, ErrorNotice } from '@/shared/components/ui/Feedback'
import type { PartnerKind, Role } from '@/shared/types/domain'
import { homeFor } from '../utils/routing'
export function RouteGuard({
  roles,
  partnerKind,
}: {
  roles?: Role[]
  partnerKind?: PartnerKind
}) {
  const auth = useAuth()
  const location = useLocation()
  if (auth.loading) return <Loading label="Preparando seu espaço..." />
  if (auth.error && !auth.user)
    return (
      <div className="fatal-error">
        <ErrorNotice error={auth.error} />
        <button
          className="button button-secondary"
          onClick={() => {
            void auth.refresh()
          }}
        >
          Tentar novamente
        </button>
      </div>
    )
  if (!auth.user)
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (auth.user.mustChangePassword && location.pathname !== '/primeiro-acesso')
    return <Navigate to="/primeiro-acesso" replace />
  if (
    (roles && !roles.includes(auth.user.role)) ||
    (partnerKind && auth.user.partnerKind !== partnerKind)
  )
    return <Navigate to={homeFor(auth.user)} replace />
  return <Outlet />
}
export function GuestGuard() {
  const { user, loading } = useAuth()
  if (loading) return <Loading />
  return user ? (
    <Navigate
      to={user.mustChangePassword ? '/primeiro-acesso' : homeFor(user)}
      replace
    />
  ) : (
    <Outlet />
  )
}
export function HomeRedirect() {
  const { user } = useAuth()
  // The public page remains available while the session resolves or the API is offline.
  return user ? <Navigate to={homeFor(user)} replace /> : <Outlet />
}
