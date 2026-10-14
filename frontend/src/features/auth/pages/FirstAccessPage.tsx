import { Navigate, useNavigate } from 'react-router'
import { useAuth } from '../hooks/auth-context'
import { homeFor } from '../utils/routing'
import { PasswordForm } from '../components/PasswordForm'
import { Button } from '@/shared/components/ui/Button'
import { useToast } from '@/shared/hooks/toast-context'
import { errorMessage } from '@/shared/lib/errors'
export function FirstAccessPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  if (user && !user.mustChangePassword)
    return <Navigate to={homeFor(user)} replace />
  return (
    <div className="auth-panel">
      <p className="eyebrow">Um espaço só seu</p>
      <h1>Boas-vindas, {user?.name.split(' ')[0]}.</h1>
      <p>
        Antes de começar, substitua sua senha temporária por uma senha pessoal.
      </p>
      <PasswordForm
        firstAccess
        onSuccess={() => {
          if (user) navigate(homeFor(user), { replace: true })
        }}
      />
      <div className="auth-bottom">
        <Button
          variant="ghost"
          onClick={() => {
            void logout().catch((error) => toast(errorMessage(error)))
          }}
        >
          Sair da conta
        </Button>
      </div>
    </div>
  )
}
