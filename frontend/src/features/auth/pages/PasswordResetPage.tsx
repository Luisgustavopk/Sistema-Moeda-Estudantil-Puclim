import { useEffect, useRef, useState } from 'react'
import { ArrowRight, Check, LockKeyhole } from 'lucide-react'
import { Link } from 'react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { z } from 'zod'
import { authApi } from '../api/auth.api'
import {
  PasswordRecoveryDemoNotice,
  PasswordRecoveryFrame,
} from '../components/PasswordRecoveryFrame'
import { passwordResetSchema } from '../schemas/auth.schema'
import {
  clearPasswordResetToken,
  readPasswordResetToken,
} from '../utils/password-reset-token'
import { loginStyles } from './login-page.styles'
import { Button } from '@/shared/components/ui/Button'
import { Field, PasswordInput } from '@/shared/components/ui/Field'
import { ErrorNotice } from '@/shared/components/ui/Feedback'
import { ApiError } from '@/shared/lib/errors'
import { DATA_MODE } from '@/shared/lib/http'

type Values = z.infer<typeof passwordResetSchema>

export function PasswordResetPage() {
  // Keep the captured value across StrictMode's effect cleanup/replay.
  const [token, setToken] = useState(readPasswordResetToken)
  const [invalid, setInvalid] = useState(false)
  const [done, setDone] = useState(false)
  const form = useForm<Values>({
    resolver: zodResolver(passwordResetSchema),
    defaultValues: { password: '', confirmation: '' },
    shouldFocusError: false,
  })
  const client = useQueryClient()
  const summary = useRef<HTMLDivElement>(null)
  const result = useRef<HTMLDivElement>(null)
  const reset = useMutation({
    mutationFn: ({ password }: Values) =>
      authApi.resetPassword(token!, password),
    onSuccess: async () => {
      clearPasswordResetToken()
      await client.cancelQueries()
      client.setQueryData(['session'], null)
      client.removeQueries({
        predicate: (query) => query.queryKey[0] !== 'session',
      })
      setDone(true)
      setToken(null)
      form.reset()
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 400) {
        clearPasswordResetToken()
        setToken(null)
        form.reset()
        setInvalid(true)
      }
    },
  })

  const resetFields = form.reset
  const resetRequest = reset.reset
  useEffect(() => {
    // An email link can change only the fragment when this page is already open.
    // Capture that link too, then erase it exactly as on the initial document load.
    const receiveLink = () => {
      if (!window.location.hash) return
      setToken(readPasswordResetToken())
      setInvalid(false)
      setDone(false)
      resetFields()
      resetRequest()
    }
    window.addEventListener('hashchange', receiveLink)
    window.addEventListener('popstate', receiveLink)
    return () => {
      window.removeEventListener('hashchange', receiveLink)
      window.removeEventListener('popstate', receiveLink)
    }
  }, [resetFields, resetRequest])

  useEffect(() => () => clearPasswordResetToken(), [])
  useEffect(() => {
    if (done || invalid) result.current?.focus()
  }, [done, invalid])

  const errors = form.formState.errors
  const submitCount = form.formState.submitCount
  useEffect(() => {
    if (submitCount && Object.keys(form.formState.errors).length)
      summary.current?.focus()
  }, [submitCount, form])
  return (
    <PasswordRecoveryFrame>
      <header className={loginStyles.heading}>
        <h1 id="recovery-title">
          {done
            ? 'Senha atualizada.'
            : !token
              ? 'Link indisponível.'
              : 'Defina sua nova senha.'}
        </h1>
        <p>
          {done
            ? 'Seu acesso está pronto. Entre com a nova senha.'
            : !token
              ? 'Solicite outro link para recuperar o acesso à sua conta.'
              : 'Escolha uma senha pessoal com pelo menos 8 caracteres.'}
        </p>
      </header>
      {DATA_MODE === 'demo' ? (
        <PasswordRecoveryDemoNotice />
      ) : done ? (
        <div ref={result} className="password-recovery-result" tabIndex={-1}>
          <p className="password-recovery-success" role="status">
            <Check size={20} aria-hidden="true" />
            Sua senha foi redefinida com sucesso.
          </p>
          <Link
            to="/login"
            replace
            className={`button button-primary ${loginStyles.submit}`}
          >
            Entrar com a nova senha <ArrowRight size={20} aria-hidden="true" />
          </Link>
        </div>
      ) : !token ? (
        <div ref={result} className="password-recovery-result" tabIndex={-1}>
          <p
            className="password-recovery-hint"
            role={invalid ? 'alert' : undefined}
          >
            {invalid
              ? 'Este link é inválido, expirou ou já foi utilizado. Solicite um novo link e use o e-mail mais recente.'
              : 'Abra o link completo recebido por e-mail. Se você recarregou esta página, abra novamente o e-mail ou solicite outro link.'}
          </p>
          <Link
            to="/recuperar-senha"
            className={`button button-primary ${loginStyles.submit}`}
          >
            Solicitar novo link <ArrowRight size={20} aria-hidden="true" />
          </Link>
        </div>
      ) : (
        <form
          className={`${loginStyles.form} form-stack`}
          aria-labelledby="recovery-title"
          noValidate
          onSubmit={form.handleSubmit((values) => {
            if (!reset.isPending) reset.mutate(values)
          })}
        >
          {Object.keys(errors).length > 0 && (
            <div
              ref={summary}
              className="password-recovery-errors"
              role="alert"
              tabIndex={-1}
              aria-labelledby="reset-errors-title"
            >
              <h2 id="reset-errors-title">Confira os campos abaixo</h2>
              <ul>
                {(['password', 'confirmation'] as const).map((key) =>
                  errors[key] ? (
                    <li key={key}>
                      <a
                        href={
                          key === 'password'
                            ? '#new-password'
                            : '#new-password-confirmation'
                        }
                        onClick={(event) => {
                          event.preventDefault()
                          form.setFocus(key)
                        }}
                      >
                        {errors[key]?.message}
                      </a>
                    </li>
                  ) : null,
                )}
              </ul>
            </div>
          )}
          <Field
            id="new-password"
            label="Nova senha"
            hint="Entre 8 e 128 caracteres. Você pode colar uma senha ou usar seu gerenciador."
            error={errors.password?.message}
          >
            <PasswordInput
              id="new-password"
              autoComplete="new-password"
              readOnly={reset.isPending}
              required
              {...form.register('password')}
            />
          </Field>
          <Field
            id="new-password-confirmation"
            label="Confirmar nova senha"
            error={errors.confirmation?.message}
          >
            <PasswordInput
              id="new-password-confirmation"
              autoComplete="new-password"
              readOnly={reset.isPending}
              required
              {...form.register('confirmation')}
            />
          </Field>
          <ErrorNotice error={reset.error} />
          <Button
            type="submit"
            className={loginStyles.submit}
            loading={reset.isPending}
          >
            {reset.isPending ? 'Salvando nova senha…' : 'Salvar nova senha'}
            {!reset.isPending && <LockKeyhole size={20} aria-hidden="true" />}
          </Button>
          <span className="sr-only" role="status" aria-atomic="true">
            {reset.isPending ? 'Aguarde. Salvando sua nova senha.' : ''}
          </span>
        </form>
      )}
    </PasswordRecoveryFrame>
  )
}
