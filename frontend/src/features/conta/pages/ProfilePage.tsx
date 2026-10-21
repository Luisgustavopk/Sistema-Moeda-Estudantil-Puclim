import {
  Save,
  ShieldCheck,
  Trash2,
  GraduationCap,
  UserRound,
  LockKeyhole,
} from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router'
import { useAuth } from '@/features/auth/hooks/auth-context'
import { PasswordForm } from '@/features/auth/components/PasswordForm'
import { instituicoesApi } from '@/features/instituicoes/api/instituicoes.api'
import { profileSchema } from '../schemas/perfil.schema'
import { contaApi } from '../api/conta.api'
import { PageHeading } from '@/shared/components/ui/PageHeading'
import { Avatar } from '@/shared/components/ui/Avatar'
import { Button } from '@/shared/components/ui/Button'
import { Field } from '@/shared/components/ui/Field'
import { Modal } from '@/shared/components/ui/Modal'
import { ErrorNotice } from '@/shared/components/ui/Feedback'
import { useAction } from '@/shared/hooks/use-action'
import { useToast } from '@/shared/hooks/toast-context'
import type { ProfileUpdate } from '@/shared/types/domain'
import { SoundPreference } from '@/shared/components/ui/ConfirmationFeedback'

export function ProfilePage() {
  const { user } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const client = useQueryClient()
  const [deleting, setDeleting] = useState(false)
  const [confirmation, setConfirmation] = useState('')
  const institutions = useQuery({
    queryKey: ['institutions'],
    queryFn: instituicoesApi.list,
    enabled: user?.role !== 'EMPRESA',
  })
  const form = useForm<ProfileUpdate>({
    resolver: zodResolver(profileSchema(user?.role || 'ALUNO')),
    defaultValues: {
      name: user?.name || '',
      email: user?.email || '',
      address: user?.address || '',
      course: user?.course || '',
      phone: user?.phone || '',
      description: user?.description || '',
    },
  })
  const action = useAction(contaApi.update)
  const remove = useAction(() => contaApi.remove())
  const errors = form.formState.errors
  if (!user) return null
  const roleLabel =
    user.role === 'ALUNO'
      ? 'Aluno'
      : user.role === 'PROFESSOR'
        ? 'Professor'
        : 'Organização parceira'
  const institution = institutions.data?.find(
    (value) => value.id === user.institutionId,
  )?.name
  return (
    <div className="merit-page account-settings">
      <PageHeading
        eyebrow="Seu espaço, do seu jeito"
        title="Minha conta"
        description="Mantenha seus dados atualizados e cuide da sua conta."
        action={
          user.role === 'ALUNO' ? (
            <Link className="button button-secondary" to={`/perfis/${user.id}`}>
              Ver perfil público
            </Link>
          ) : undefined
        }
      />
      <div className="profile-grid">
        <aside className="card profile-summary">
          <div className="account-identity">
            <Avatar name={user.name} large />
            <h2>{user.name}</h2>
            <p>{roleLabel}</p>
          </div>
          <div className="account-course">
            <GraduationCap size={20} aria-hidden="true" />
            <span>
              {user.role === 'ALUNO'
                ? user.course
                : user.role === 'PROFESSOR'
                  ? user.department
                  : user.partnerKind === 'ENSINO'
                    ? 'Instituição de ensino'
                    : user.partnerKind === 'BENEFICIARIA'
                      ? 'Instituição beneficiária'
                      : 'Empresa parceira'}
            </span>
          </div>
          <dl>
            <dt>Login</dt>
            <dd>{user.login}</dd>
            <dt>E-mail</dt>
            <dd>{user.email}</dd>
            {institution && (
              <>
                <dt>Instituição</dt>
                <dd>{institution}</dd>
              </>
            )}
          </dl>
        </aside>
        <div className="account-settings-panels">
          <section className="card account-section">
            <div className="settings-section-heading">
              <UserRound size={22} aria-hidden="true" />
              <div>
                <h2>Seus dados</h2>
                <p>Informações de contato e vínculo acadêmico.</p>
              </div>
            </div>
            <form
              className="form-grid"
              noValidate
              onSubmit={form.handleSubmit(async (values) => {
                try {
                  await action.mutateAsync(values)
                  toast('Seus dados foram atualizados.')
                  form.reset(values)
                } catch {
                  /* O erro é exibido abaixo. */
                }
              })}
            >
              <Field
                id="profile-name"
                label={
                  user.role === 'EMPRESA'
                    ? 'Nome da organização'
                    : 'Nome completo'
                }
                className="full"
                error={errors.name?.message}
              >
                <input
                  id="profile-name"
                  autoComplete="name"
                  aria-invalid={!!errors.name}
                  {...form.register('name')}
                />
              </Field>
              <Field
                id="profile-email"
                label="E-mail"
                error={errors.email?.message}
              >
                <input
                  id="profile-email"
                  type="email"
                  autoComplete="email"
                  aria-invalid={!!errors.email}
                  {...form.register('email')}
                />
              </Field>
              <Field id="profile-login" label="Login">
                <input id="profile-login" value={user.login} readOnly />
              </Field>
              {user.role === 'ALUNO' && (
                <>
                  <Field id="profile-cpf" label="CPF">
                    <input id="profile-cpf" value={user.cpf || ''} readOnly />
                  </Field>
                  <Field id="profile-rg" label="RG">
                    <input id="profile-rg" value={user.rg || ''} readOnly />
                  </Field>
                  <Field
                    id="profile-address"
                    label="Endereço completo"
                    className="full"
                    error={errors.address?.message}
                  >
                    <input
                      id="profile-address"
                      autoComplete="street-address"
                      aria-invalid={!!errors.address}
                      {...form.register('address')}
                    />
                  </Field>
                  <Field
                    id="profile-course"
                    label="Curso"
                    error={errors.course?.message}
                  >
                    <input
                      id="profile-course"
                      aria-invalid={!!errors.course}
                      {...form.register('course')}
                    />
                  </Field>
                  <Field id="profile-institution" label="Instituição de ensino">
                    <input
                      id="profile-institution"
                      value={
                        institution ||
                        (institutions.error
                          ? 'Não foi possível consultar a instituição'
                          : 'Carregando...')
                      }
                      readOnly
                    />
                  </Field>
                  <p className="notice notice-info full">
                    CPF, RG e endereço são exibidos apenas no seu próprio
                    perfil.
                  </p>
                </>
              )}
              {user.role === 'PROFESSOR' && (
                <>
                  <Field id="profile-department" label="Departamento">
                    <input
                      id="profile-department"
                      value={user.department || ''}
                      readOnly
                    />
                  </Field>
                  <Field id="profile-institution" label="Instituição">
                    <input
                      id="profile-institution"
                      value={institution || 'Carregando...'}
                      readOnly
                    />
                  </Field>
                </>
              )}
              {user.role === 'EMPRESA' && (
                <>
                  <Field id="profile-cnpj" label="CNPJ">
                    <input id="profile-cnpj" value={user.cnpj || ''} readOnly />
                  </Field>
                  <Field
                    id="profile-phone"
                    label="Telefone com DDD"
                    error={errors.phone?.message}
                  >
                    <input
                      id="profile-phone"
                      type="tel"
                      aria-invalid={!!errors.phone}
                      {...form.register('phone')}
                    />
                  </Field>
                  <Field
                    id="profile-description"
                    label="Sobre a organização"
                    className="full"
                    error={errors.description?.message}
                  >
                    <textarea
                      id="profile-description"
                      {...form.register('description')}
                    />
                  </Field>
                </>
              )}
              <div className="full">
                <ErrorNotice error={action.error} />
                <div className="form-actions">
                  <Button type="submit" loading={action.isPending}>
                    <Save size={17} /> Salvar alterações
                  </Button>
                </div>
              </div>
            </form>
          </section>
          <section className="card account-section">
            <div className="settings-section-heading">
              <LockKeyhole size={22} aria-hidden="true" />
              <div>
                <h2>Segurança da conta</h2>
                <p>Atualize sua senha para proteger o acesso.</p>
              </div>
              <ShieldCheck size={20} aria-hidden="true" />
            </div>
            <PasswordForm />
          </section>
          {user.role !== 'PROFESSOR' && <SoundPreference />}
          {user.role !== 'PROFESSOR' && (
            <section className="card danger-zone account-section">
              <h2>Encerrar minha participação</h2>
              <p>
                Seu acesso será encerrado. O histórico e os cupons emitidos
                serão preservados; vantagens da organização serão desativadas.
                Instituições com vínculos ativos não podem ser excluídas.
              </p>
              <Button
                variant="secondary"
                onClick={() => {
                  setDeleting(true)
                  setConfirmation('')
                  remove.reset()
                }}
              >
                <Trash2 size={16} /> Excluir minha conta
              </Button>
            </section>
          )}
        </div>
      </div>
      {deleting && (
        <Modal
          title="Excluir sua conta?"
          onClose={() => setDeleting(false)}
          busy={remove.isPending}
        >
          <p className="muted">
            Você perderá o acesso ao Puclim. Esta ação não poderá ser desfeita
            pela interface.
          </p>
          <Field id="delete-confirmation" label="Digite EXCLUIR para confirmar">
            <input
              id="delete-confirmation"
              value={confirmation}
              autoComplete="off"
              onChange={(event) => setConfirmation(event.target.value)}
              style={{ marginTop: 15 }}
            />
          </Field>
          <ErrorNotice error={remove.error} />
          <div className="form-actions">
            <Button
              variant="secondary"
              disabled={remove.isPending}
              onClick={() => setDeleting(false)}
            >
              Manter minha conta
            </Button>
            <Button
              variant="danger"
              disabled={confirmation !== 'EXCLUIR'}
              loading={remove.isPending}
              onClick={async () => {
                try {
                  await remove.mutateAsync(undefined)
                  client.setQueryData(['session'], null)
                  client.removeQueries({
                    predicate: (query) => query.queryKey[0] !== 'session',
                  })
                  toast('Seu acesso foi encerrado.')
                  navigate('/login', { replace: true })
                } catch {
                  /* O erro é exibido no diálogo. */
                }
              }}
            >
              Excluir minha conta
            </Button>
          </div>
        </Modal>
      )}
    </div>
  )
}
