import { useEffect, useRef, useState } from 'react'
import { Mail } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import type { z } from 'zod'
import { authApi } from '../api/auth.api'
import {
  PasswordRecoveryDemoNotice,
  PasswordRecoveryFrame,
} from '../components/PasswordRecoveryFrame'
import { passwordRecoverySchema } from '../schemas/auth.schema'
import { loginStyles } from './login-page.styles'
import { Button } from '@/shared/components/ui/Button'
import { Field } from '@/shared/components/ui/Field'
import { ErrorNotice } from '@/shared/components/ui/Feedback'
import { DATA_MODE } from '@/shared/lib/http'

type Values = z.infer<typeof passwordRecoverySchema>

export function PasswordRecoveryPage() {
  const form = useForm<Values>({
    resolver: zodResolver(passwordRecoverySchema),
    defaultValues: { email: '' },
  })
  const [sent, setSent] = useState(false)
  const [remaining, setRemaining] = useState(0)
  const [resendAt, setResendAt] = useState(0)
  const status = useRef<HTMLDivElement>(null)
  const request = useMutation({
    mutationFn: ({ email }: Values) => authApi.requestPasswordReset(email),
    onSuccess: ({ resendAfterSeconds }) => {
      setSent(true)
      setRemaining(resendAfterSeconds)
      setResendAt(Date.now() + resendAfterSeconds * 1000)
    },
  })

  useEffect(() => {
    if (!resendAt) return
    const update = () =>
      setRemaining(Math.max(0, Math.ceil((resendAt - Date.now()) / 1000)))
    const timer = window.setInterval(update, 1000)
    return () => window.clearInterval(timer)
  }, [resendAt])

  useEffect(() => {
    if (sent) status.current?.focus()
  }, [sent, resendAt])

  return (
    <PasswordRecoveryFrame>
      <header className={loginStyles.heading}>
        <h1 id="recovery-title">Recupere seu acesso.</h1>
        <p>Informe o e-mail do seu cadastro para solicitar uma nova senha.</p>
      </header>
      {DATA_MODE === 'demo' ? (
        <PasswordRecoveryDemoNotice />
      ) : (
        <>
          {sent && (
            <div
              ref={status}
              className="password-recovery-message"
              role="status"
              tabIndex={-1}
            >
              <strong>Confira seu e-mail</strong>
              <p>
                Se houver uma conta ativa com esse e-mail, você receberá um link
                para redefinir sua senha. O envio pode levar alguns instantes.
                Confira também a caixa de spam.
              </p>
            </div>
          )}
          <form
            className={`${loginStyles.form} form-stack`}
            aria-labelledby="recovery-title"
            noValidate
            onSubmit={form.handleSubmit((values) => {
              if (!request.isPending && !remaining) request.mutate(values)
            })}
          >
            <Field
              id="recovery-email"
              label="E-mail do cadastro"
              error={form.formState.errors.email?.message}
            >
              <input
                id="recovery-email"
                type="email"
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
                placeholder="voce@exemplo.com"
                readOnly={request.isPending}
                required
                {...form.register('email')}
              />
            </Field>
            <ErrorNotice error={request.error} />
            <div className="password-recovery-submit">
              <Button
                type="submit"
                className={loginStyles.submit}
                loading={request.isPending}
                disabled={remaining > 0}
                aria-describedby={remaining > 0 ? 'resend-hint' : undefined}
              >
                {request.isPending
                  ? 'Solicitando link…'
                  : sent
                    ? 'Reenviar link'
                    : 'Enviar link de recuperação'}
                {!request.isPending && <Mail size={20} aria-hidden="true" />}
              </Button>
              {remaining > 0 && (
                <p id="resend-hint" className="password-recovery-hint">
                  Você pode solicitar outro link em {remaining}s.
                </p>
              )}
            </div>
            <span className="sr-only" role="status" aria-atomic="true">
              {request.isPending
                ? 'Aguarde. Solicitando recuperação de senha.'
                : ''}
            </span>
          </form>
        </>
      )}
    </PasswordRecoveryFrame>
  )
}
