import { api } from '@/shared/lib/api'
import { ApiError } from '@/shared/lib/errors'
import { DATA_MODE, http } from '@/shared/lib/http'

function requirePasswordRecoveryApi() {
  if (DATA_MODE === 'demo')
    throw new ApiError(
      'A recuperação de senha está disponível no sistema conectado. A demonstração não envia e-mails nem altera senhas por link.',
    )
}

export const authApi = {
  session: api.session,
  login: api.login,
  logout: api.logout,
  changePassword: api.changePassword,
  requestPasswordReset: (email: string) => {
    requirePasswordRecoveryApi()
    return http<{ message: string; resendAfterSeconds: number }>(
      '/auth/recuperar-senha',
      {
        method: 'POST',
        body: JSON.stringify({ email }),
      },
    )
  },
  resetPassword: (token: string, password: string) => {
    requirePasswordRecoveryApi()
    return http<void>('/auth/redefinir-senha', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    })
  },
}
