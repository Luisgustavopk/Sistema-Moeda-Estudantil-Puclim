import { ArrowLeft } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { PublicAuthFrame } from './PublicAuthFrame'
import { loginStyles } from '../pages/login-page.styles'

export function PasswordRecoveryFrame({ children }: { children: ReactNode }) {
  return (
    <PublicAuthFrame
      className="password-recovery-experience"
      skipHref="#recovery-panel"
      skipLabel="Ir para a recuperação de senha"
    >
      {() => (
        <main className="password-recovery-main">
          <section
            id="recovery-panel"
            className={`${loginStyles.panel} password-recovery-panel`}
            aria-labelledby="recovery-title"
            tabIndex={-1}
          >
            <Link to="/login" className="password-recovery-back">
              <ArrowLeft size={17} aria-hidden="true" />
              Voltar para entrar
            </Link>
            {children}
          </section>
        </main>
      )}
    </PublicAuthFrame>
  )
}

export function PasswordRecoveryDemoNotice() {
  return (
    <div className="password-recovery-message" role="status">
      <strong>Disponível no sistema conectado</strong>
      <p>
        A demonstração não envia e-mails nem altera senhas por link. Para testar
        os perfis, use as credenciais de demonstração na página de entrada.
      </p>
    </div>
  )
}
