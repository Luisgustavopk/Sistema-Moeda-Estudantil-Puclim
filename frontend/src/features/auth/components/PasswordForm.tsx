import { LockKeyhole } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { z } from 'zod'
import { passwordSchema } from '../schemas/auth.schema'
import { authApi } from '../api/auth.api'
import { useAction } from '@/shared/hooks/use-action'
import { useToast } from '@/shared/hooks/toast-context'
import { Field, PasswordInput } from '@/shared/components/ui/Field'
import { Button } from '@/shared/components/ui/Button'
import { ErrorNotice } from '@/shared/components/ui/Feedback'
export function PasswordForm({
  firstAccess = false,
  onSuccess,
}: {
  firstAccess?: boolean
  onSuccess?: () => void
}) {
  const toast = useToast()
  const form = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
  })
  const action = useAction(
    ({ currentPassword, password }: z.infer<typeof passwordSchema>) =>
      authApi.changePassword(currentPassword, password),
  )
  const errors = form.formState.errors
  return (
    <form
      className="form-stack"
      noValidate
      onSubmit={form.handleSubmit(async (values) => {
        try {
          await action.mutateAsync(values)
          form.reset()
          toast('Sua senha foi atualizada.')
          onSuccess?.()
        } catch {
          /* O erro é exibido abaixo. */
        }
      })}
    >
      <Field
        id="currentPassword"
        label={firstAccess ? 'Senha temporária recebida' : 'Senha atual'}
        error={errors.currentPassword?.message}
      >
        <PasswordInput
          id="currentPassword"
          autoComplete="current-password"
          aria-invalid={!!errors.currentPassword}
          {...form.register('currentPassword')}
        />
      </Field>
      <div className="form-grid">
        <Field
          id="newPassword"
          label="Nova senha"
          error={errors.password?.message}
          hint="Pelo menos 8 caracteres."
        >
          <PasswordInput
            id="newPassword"
            autoComplete="new-password"
            aria-invalid={!!errors.password}
            {...form.register('password')}
          />
        </Field>
        <Field
          id="newConfirmation"
          label="Confirmar nova senha"
          error={errors.confirmation?.message}
        >
          <PasswordInput
            id="newConfirmation"
            autoComplete="new-password"
            aria-invalid={!!errors.confirmation}
            {...form.register('confirmation')}
          />
        </Field>
      </div>
      <ErrorNotice error={action.error} />
      <div className="form-actions">
        <Button type="submit" loading={action.isPending}>
          <LockKeyhole size={17} />{' '}
          {firstAccess ? 'Definir senha e continuar' : 'Atualizar senha'}
        </Button>
      </div>
    </form>
  )
}
