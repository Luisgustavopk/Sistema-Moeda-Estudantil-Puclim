import { ArrowRight, LockKeyhole } from 'lucide-react'
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
    <div className="auth-panel">
      <p className="eyebrow">Bom ter você por aqui</p>
      <h1>Seu próximo passo começa aqui.</h1>
      <p>Entre na sua conta e dê valor às suas conquistas.</p>
      <form
        className="form-stack"
        onSubmit={form.handleSubmit((values) => login.mutate(values))}
        noValidate
      >
        <Field
          id="login"
          label="Login ou e-mail"
          error={form.formState.errors.login?.message}
        >
          <input
            id="login"
            placeholder="Seu login ou e-mail"
            autoComplete="username"
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
            aria-invalid={!!form.formState.errors.password}
            {...form.register('password')}
          />
        </Field>
        <ErrorNotice error={login.error} />
        <Button type="submit" loading={login.isPending}>
          Entrar na minha conta <ArrowRight size={18} />
        </Button>
      </form>
      <p className="auth-bottom">
        Ainda não faz parte? <Link to="/cadastro/aluno">Crie sua conta</Link>
      </p>
      <div className="notice notice-info" style={{ marginTop: 25 }}>
        <LockKeyhole size={17} />
        <span>
          Seu perfil é identificado pelo login. Seus dados pessoais ficam no seu
          espaço.
        </span>
      </div>
      {DATA_MODE === 'demo' && (
        <details className="demo-accounts">
          <summary>Credenciais de demonstração</summary>
          <table>
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
            Senha inicial de todas as contas: <strong>Puclim@2026</strong>.
            Dados fictícios salvos neste navegador. Nenhum e-mail real é
            enviado.
          </p>
        </details>
      )}
    </div>
  )
}
