import { FormSelect } from '@/shared/components/ui/Select'
import { ArrowRight } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { z } from 'zod'
import { useNavigate } from 'react-router'
import { partnerSchema } from '../schemas/empresa.schema'
import { empresasApi } from '../api/empresas.api'
import { RegistrationHeader } from '@/features/auth/components/RegistrationHeader'
import { useAuth } from '@/features/auth/hooks/auth-context'
import { useAction } from '@/shared/hooks/use-action'
import { useToast } from '@/shared/hooks/toast-context'
import { Button } from '@/shared/components/ui/Button'
import { Field, PasswordInput } from '@/shared/components/ui/Field'
import { ErrorNotice } from '@/shared/components/ui/Feedback'
type Values = z.infer<typeof partnerSchema>
export function PartnerRegistrationPage() {
  const auth = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const form = useForm<Values>({
    resolver: zodResolver(partnerSchema),
    defaultValues: { partnerKind: 'EMPRESA', description: '' },
  })
  const action = useAction(
    async ({ confirmation: _confirmation, ...values }: Values) => {
      await empresasApi.register(values)
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
            toast('Parceria cadastrada. Boas-vindas ao Puclim!')
            navigate('/empresa', { replace: true })
          } catch {
            /* O erro é exibido abaixo. */
          }
        })}
      >
        <Field
          id="partnerKind"
          label="Tipo de organização"
          className="full"
          error={errors.partnerKind?.message}
        >
          <FormSelect
            id="partnerKind"
            control={form.control}
            name="partnerKind"
          >
            <option value="EMPRESA">Empresa · oferece vantagens</option>
            <option value="ENSINO">
              Instituição de ensino · vincula alunos e professores
            </option>
            <option value="BENEFICIARIA">
              Instituição beneficiária · participa das futuras doações
            </option>
          </FormSelect>
        </Field>
        <Field
          id="name"
          label="Nome da organização"
          className="full"
          error={errors.name?.message}
        >
          <input
            id="name"
            autoComplete="organization"
            placeholder="Como sua organização se chama?"
            {...form.register('name')}
            aria-invalid={!!errors.name}
          />
        </Field>
        <Field id="cnpj" label="CNPJ" error={errors.cnpj?.message}>
          <input
            id="cnpj"
            inputMode="numeric"
            placeholder="00.000.000/0000-00"
            maxLength={18}
            {...form.register('cnpj')}
            aria-invalid={!!errors.cnpj}
          />
        </Field>
        <Field
          id="phone"
          label="Telefone com DDD"
          error={errors.phone?.message}
        >
          <input
            id="phone"
            type="tel"
            autoComplete="tel"
            placeholder="(31) 99999-9999"
            {...form.register('phone')}
            aria-invalid={!!errors.phone}
          />
        </Field>
        <Field
          id="email"
          label="E-mail de contato"
          error={errors.email?.message}
        >
          <input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="contato@organizacao.com"
            {...form.register('email')}
            aria-invalid={!!errors.email}
          />
        </Field>
        <Field id="login" label="Login" error={errors.login?.message}>
          <input
            id="login"
            autoComplete="username"
            placeholder="Nome de usuário da organização"
            {...form.register('login')}
            aria-invalid={!!errors.login}
          />
        </Field>
        <Field
          id="description"
          label="Sobre a organização (opcional)"
          className="full"
          error={errors.description?.message}
        >
          <textarea
            id="description"
            placeholder="Conte um pouco sobre sua organização."
            {...form.register('description')}
            aria-invalid={!!errors.description}
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
          <ErrorNotice error={action.error} />
        </div>
        <Button type="submit" className="full" loading={action.isPending}>
          Cadastrar minha organização <ArrowRight size={18} />
        </Button>
      </form>
    </div>
  )
}
