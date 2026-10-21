import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAuth } from '@/features/auth/hooks/auth-context'
import { Button } from '@/shared/components/ui/Button'
import { Field } from '@/shared/components/ui/Field'
import { ErrorNotice } from '@/shared/components/ui/Feedback'
import { Modal } from '@/shared/components/ui/Modal'
import { useAction } from '@/shared/hooks/use-action'
import {
  instituicoesApi,
  type TeacherRegistration,
} from '../api/instituicoes.api'
import { teacherImportSchema } from '../schemas/professor.schema'

export function TeacherRegistrationModal({ onClose }: { onClose: () => void }) {
  const { user } = useAuth()
  const form = useForm<TeacherRegistration>({
    resolver: zodResolver(teacherImportSchema),
  })
  const action = useAction(instituicoesApi.registerTeacher)
  const errors = form.formState.errors
  const access = action.data
  return (
    <Modal
      title={access ? 'Professor cadastrado' : 'Cadastrar professor'}
      onClose={onClose}
      busy={action.isPending}
    >
      {access ? (
        <>
          <p className="notice notice-success" role="status">
            {access.name} foi cadastrado e vinculado à sua instituição.
          </p>
          <p style={{ margin: '16px 0' }}>
            Entregue o login e a senha temporária ao professor por um canal
            seguro. A troca de senha será exigida no primeiro acesso. Guarde a
            senha antes de fechar ou cadastrar outro professor; ela não será
            exibida novamente.
          </p>
          <dl>
            <dt>Login</dt>
            <dd>
              <strong>{access.login}</strong>
            </dd>
            <dt style={{ marginTop: 12 }}>Senha temporária</dt>
            <dd>
              <code style={{ overflowWrap: 'anywhere' }}>
                {access.temporaryPassword || 'Instruções de acesso registradas'}
              </code>
            </dd>
          </dl>
          <div className="form-actions">
            <Button
              variant="secondary"
              onClick={() => {
                form.reset()
                action.reset()
              }}
            >
              Cadastrar outro professor
            </Button>
            <Button onClick={onClose}>Concluir</Button>
          </div>
        </>
      ) : (
        <form
          className="form-grid"
          noValidate
          onSubmit={form.handleSubmit((input) => action.mutate(input))}
        >
          <p className="full muted">
            O professor ficará vinculado a {user?.name}. Uma senha temporária
            será gerada ao concluir o cadastro.
          </p>
          <Field
            id="teacher-name"
            label="Nome completo"
            className="full"
            error={errors.name?.message}
          >
            <input
              id="teacher-name"
              maxLength={100}
              autoComplete="name"
              {...form.register('name')}
              disabled={action.isPending}
            />
          </Field>
          <Field id="teacher-cpf" label="CPF" error={errors.cpf?.message}>
            <input
              id="teacher-cpf"
              inputMode="numeric"
              maxLength={14}
              placeholder="000.000.000-00"
              {...form.register('cpf')}
              disabled={action.isPending}
            />
          </Field>
          <Field
            id="teacher-department"
            label="Departamento"
            error={errors.department?.message}
          >
            <input
              id="teacher-department"
              maxLength={100}
              {...form.register('department')}
              disabled={action.isPending}
            />
          </Field>
          <Field
            id="teacher-email"
            label="E-mail"
            error={errors.email?.message}
          >
            <input
              id="teacher-email"
              type="email"
              maxLength={254}
              autoComplete="email"
              {...form.register('email')}
              disabled={action.isPending}
            />
          </Field>
          <Field id="teacher-login" label="Login" error={errors.login?.message}>
            <input
              id="teacher-login"
              maxLength={40}
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              {...form.register('login')}
              disabled={action.isPending}
            />
          </Field>
          <div className="full">
            <ErrorNotice error={action.error} />
          </div>
          <div className="form-actions full">
            <Button
              variant="secondary"
              onClick={onClose}
              disabled={action.isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" loading={action.isPending}>
              Cadastrar professor
            </Button>
          </div>
        </form>
      )}
    </Modal>
  )
}
