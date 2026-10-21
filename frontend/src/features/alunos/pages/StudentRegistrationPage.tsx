import { FormSelect } from '@/shared/components/ui/Select'
import { ArrowRight } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { z } from 'zod'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router'
import { studentSchema } from '../schemas/aluno.schema'
import { alunosApi } from '../api/alunos.api'
import { instituicoesApi } from '@/features/instituicoes/api/instituicoes.api'
import { RegistrationHeader } from '@/features/auth/components/RegistrationHeader'
import { useAuth } from '@/features/auth/hooks/auth-context'
import { useAction } from '@/shared/hooks/use-action'
import { useToast } from '@/shared/hooks/toast-context'
import { Button } from '@/shared/components/ui/Button'
import { Field, PasswordInput } from '@/shared/components/ui/Field'
import { ErrorNotice, QueryState } from '@/shared/components/ui/Feedback'

type Values = z.infer<typeof studentSchema>
export function StudentRegistrationPage() {
  const auth = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const institutions = useQuery({
    queryKey: ['institutions'],
    queryFn: instituicoesApi.list,
  })
  const form = useForm<Values>({
    resolver: zodResolver(studentSchema),
    defaultValues: { institutionId: '' },
  })
  const action = useAction(
    async ({ confirmation: _confirmation, ...values }: Values) => {
      await alunosApi.register(values)
      return auth.login(values.login, values.password)
    },
  )
  const errors = form.formState.errors
  return (
    <div className="auth-panel register-panel">
      <RegistrationHeader />
      <form
        className="form-grid"
        noValidate
        onSubmit={form.handleSubmit(async (values) => {
          try {
            await action.mutateAsync(values)
            toast('Sua conta foi criada. Boas-vindas ao Puclim!')
            navigate('/aluno', { replace: true })
          } catch {
            /* O erro é exibido abaixo. */
          }
        })}
      >
        <Field
          id="name"
          label="Nome completo"
          className="full"
          error={errors.name?.message}
        >
          <input
            id="name"
            autoComplete="name"
            placeholder="Como você se chama?"
            {...form.register('name')}
            aria-invalid={!!errors.name}
          />
        </Field>
        <Field id="email" label="E-mail" error={errors.email?.message}>
          <input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="voce@exemplo.com"
            {...form.register('email')}
            aria-invalid={!!errors.email}
          />
        </Field>
        <Field id="login" label="Login" error={errors.login?.message}>
          <input
            id="login"
            autoComplete="username"
            placeholder="Seu nome de usuário"
            {...form.register('login')}
            aria-invalid={!!errors.login}
          />
        </Field>
        <Field id="cpf" label="CPF" error={errors.cpf?.message}>
          <input
            id="cpf"
            inputMode="numeric"
            placeholder="000.000.000-00"
            maxLength={14}
            {...form.register('cpf')}
            aria-invalid={!!errors.cpf}
          />
        </Field>
        <Field id="rg" label="RG — opcional" error={errors.rg?.message}>
          <input
            id="rg"
            placeholder="Seu documento de identidade"
            {...form.register('rg')}
            aria-invalid={!!errors.rg}
          />
        </Field>
        <Field
          id="address"
          label="Endereço completo"
          className="full"
          error={errors.address?.message}
        >
          <input
            id="address"
            autoComplete="street-address"
            placeholder="Rua, número, bairro, cidade e estado"
            {...form.register('address')}
            aria-invalid={!!errors.address}
          />
        </Field>
        <Field
          id="institutionId"
          label="Instituição de ensino"
          error={errors.institutionId?.message}
        >
          <FormSelect
            id="institutionId"
            control={form.control}
            name="institutionId"
            aria-invalid={!!errors.institutionId}
            disabled={institutions.isLoading || !!institutions.error}
          >
            <option value="">Selecione sua instituição</option>
            {institutions.data?.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </FormSelect>
        </Field>
        <Field id="course" label="Curso" error={errors.course?.message}>
          <input
            id="course"
            placeholder="Ex.: Engenharia de Software"
            {...form.register('course')}
            aria-invalid={!!errors.course}
          />
        </Field>
        <Field
          id="password"
          label="Senha"
          hint="Pelo menos 8 caracteres."
          error={errors.password?.message}
        >
          <PasswordInput
            id="password"
            autoComplete="new-password"
            {...form.register('password')}
            aria-invalid={!!errors.password}
          />
        </Field>
        <Field
          id="confirmation"
          label="Confirmar senha"
          error={errors.confirmation?.message}
        >
          <PasswordInput
            id="confirmation"
            autoComplete="new-password"
            {...form.register('confirmation')}
            aria-invalid={!!errors.confirmation}
          />
        </Field>
        <div className="full">
          <QueryState
            loading={false}
            error={institutions.error}
            retry={institutions.refetch}
          />
          {institutions.data?.length === 0 && (
            <p className="notice notice-info">
              Ainda não há instituições cadastradas. Uma instituição precisa
              aderir antes do cadastro de alunos.
            </p>
          )}
          <ErrorNotice error={action.error} />
        </div>
        <Button
          type="submit"
          className="full"
          loading={action.isPending}
          disabled={institutions.isLoading || !institutions.data?.length}
        >
          Criar minha conta <ArrowRight size={18} />
        </Button>
      </form>
    </div>
  )
}
