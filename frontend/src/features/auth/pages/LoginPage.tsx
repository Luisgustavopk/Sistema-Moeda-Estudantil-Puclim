import { PublicAuthFrame } from '../components/PublicAuthFrame'
import { ArrowRight, ChevronDown, LockKeyhole } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { z } from 'zod'
import { Link, useLocation, useNavigate } from 'react-router'
import { useMutation } from '@tanstack/react-query'
import { useAuth } from '../hooks/auth-context'
import { homeFor } from '../utils/routing'
import { loginSchema } from '../schemas/auth.schema'
import { Button } from '@/shared/components/ui/Button'
import { Field, PasswordInput } from '@/shared/components/ui/Field'
import { ErrorNotice } from '@/shared/components/ui/Feedback'
import { DATA_MODE } from '@/shared/lib/http'
import { InteractiveCoin } from '../components/InteractiveCoin'
import { loginStyles } from './login-page.styles'

export function LoginPage() {
  const auth = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
  })
  const login = useMutation({
    mutationFn: ({ login, password }: z.infer<typeof loginSchema>) =>
      auth.login(login, password),
    onSuccess: (user) => {
      const from = (location.state as { from?: string } | null)?.from
      const target =
        from &&
        (from.startsWith(`${homeFor(user)}/`) ||
          ['/perfil', '/notificacoes'].includes(from))
          ? from
          : homeFor(user)
      navigate(user.mustChangePassword ? '/primeiro-acesso' : target, {
        replace: true,
      })
    },
  })
  return (
    <PublicAuthFrame
      skipHref="#login"
      skipLabel="Ir para o formulário de login"
    >
      {(sound) => (
        <main className={loginStyles.content}>
          <div className={loginStyles.intro}>
            <InteractiveCoin sound={sound} />
          </div>
          <section className={loginStyles.panel} aria-labelledby="login-title">
            <header className={loginStyles.heading}>
              <h1 id="login-title">Entre na sua conta.</h1>
              <p>Acesse seu espaço e dê valor às suas conquistas.</p>
            </header>
            <form
              className={['form-stack', loginStyles.form].join(' ')}
              aria-labelledby="login-title"
              onSubmit={form.handleSubmit((values) => {
                if (!login.isPending) login.mutate(values)
              })}
              noValidate
            >
              <Field
                id="login"
                label="Login ou e-mail"
                hint="Use o login ou o e-mail do seu cadastro."
                error={form.formState.errors.login?.message}
              >
                <input
                  id="login"
                  placeholder="Seu login ou e-mail"
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  readOnly={login.isPending}
                  required
                  aria-invalid={!!form.formState.errors.login}
                  {...form.register('login')}
                />
              </Field>
              <Field
                id="password"
                label="Senha"
                error={form.formState.errors.password?.message}
              >
                <PasswordInput
                  id="password"
                  placeholder="Sua senha"
                  autoComplete="current-password"
                  readOnly={login.isPending}
                  required
                  aria-invalid={!!form.formState.errors.password}
                  {...form.register('password')}
                />
              </Field>
              <Link to="/recuperar-senha" className="login-forgot-password">
                Esqueci minha senha
              </Link>
              <ErrorNotice error={login.error} />
              <Button
                className={loginStyles.submit}
                type="submit"
                loading={login.isPending}
              >
                {login.isPending
                  ? 'Entrando na sua conta…'
                  : 'Entrar na minha conta'}
                {!login.isPending && (
                  <ArrowRight size={20} aria-hidden="true" />
                )}
              </Button>
              <span className="sr-only" role="status" aria-atomic="true">
                {login.isPending ? 'Aguarde. Acessando sua conta.' : ''}
              </span>
            </form>
            <div className={loginStyles.accessFooter}>
              <div className={loginStyles.registration}>
                <p>Ainda não faz parte?</p>
                <Link to="/cadastro/aluno">
                  Crie sua conta <ArrowRight size={16} aria-hidden="true" />
                </Link>
              </div>
              <p className={loginStyles.privacy}>
                <LockKeyhole size={16} aria-hidden="true" />
                <span>
                  Seu perfil é identificado pelo login. Seus dados pessoais
                  ficam no seu espaço.
                </span>
              </p>
            </div>
            {DATA_MODE === 'demo' && (
              <details
                className={['demo-accounts', loginStyles.demo].join(' ')}
              >
                <summary>
                  Credenciais de demonstração
                  <ChevronDown size={18} aria-hidden="true" />
                </summary>
                <table>
                  <caption className="sr-only">
                    Contas para testar cada perfil
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Perfil</th>
                      <th scope="col">Login</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Aluno</td>
                      <td>aluno@puclim.demo</td>
                    </tr>
                    <tr>
                      <td>Professor</td>
                      <td>professor@puclim.demo</td>
                    </tr>
                    <tr>
                      <td>Empresa</td>
                      <td>empresa@puclim.demo</td>
                    </tr>
                    <tr>
                      <td>Instituição</td>
                      <td>instituicao@puclim.demo</td>
                    </tr>
                  </tbody>
                </table>
                <p>
                  Senha inicial de todas as contas: <strong>Puclim@2026</strong>
                  . Dados fictícios salvos neste navegador. Nenhum e-mail real é
                  enviado.
                </p>
              </details>
            )}
          </section>
        </main>
      )}
    </PublicAuthFrame>
  )
}
