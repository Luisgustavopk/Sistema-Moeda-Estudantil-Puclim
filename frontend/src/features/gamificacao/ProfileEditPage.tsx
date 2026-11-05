import { Select, FormSelect } from '@/shared/components/ui/Select'
import { useRef, useState } from 'react'
import { Link } from 'react-router'
import { useForm, useWatch, type FieldPathValue } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/hooks/auth-context'
import { PageHeading } from '@/shared/components/ui/PageHeading'
import { Field } from '@/shared/components/ui/Field'
import { Button } from '@/shared/components/ui/Button'
import { Modal } from '@/shared/components/ui/Modal'
import { ErrorNotice, QueryState } from '@/shared/components/ui/Feedback'
import { useToast } from '@/shared/hooks/toast-context'
import { errorMessage } from '@/shared/lib/errors'
import { DATA_MODE } from '@/shared/lib/http'
import { api } from '@/shared/lib/api'
import { gameApi } from './api'
import { demoProfile } from './demo-profile'
import {
  customizationAdapter,
  customizationSchema,
  type ProfileCustomization,
} from './profile-customization'
import { ProfileShowcase } from './components/ProfileShowcase'
import { RewardOptions } from './components/ProfileDecorations'
import { useProfileRewards } from './hooks'
import { useProfileCustomization } from './use-profile-customization'
import { UnsavedPrompt } from './components/UnsavedPrompt'
import type { Profile } from './types'

const sections = [
  'Geral',
  'Avatar',
  'Molduras',
  'Fundo do perfil',
  'Vitrines',
  'Privacidade',
]
export function ProfileEditPage() {
  const { user } = useAuth()
  const institutions = useQuery({
    queryKey: ['institutions'],
    queryFn: api.institutions,
  })
  const profile = useQuery({
    queryKey: ['game', 'profile', user?.id],
    queryFn: () => gameApi.profile(),
    enabled: DATA_MODE === 'api',
  })
  const settings = useProfileCustomization(user)
  const sample =
    user && DATA_MODE === 'demo'
      ? demoProfile(
          user.id,
          user.name,
          user.course || '',
          institutions.data?.find((i) => i.id === user.institutionId)?.name ||
            'Instituição de demonstração',
        )
      : null
  return (
    <div className="merit-page">
      <PageHeading
        title="Editar perfil"
        description="Seu cartão de visita acadêmico, do seu jeito."
        action={
          <Link className="text-link" to={`/perfis/${user?.id}`}>
            Ver perfil público
          </Link>
        }
      />
      {DATA_MODE === 'demo' && (
        <p className="notice notice-info">
          Demonstração explícita: a personalização é salva somente neste
          navegador; a privacidade serve apenas para pré-visualização.
        </p>
      )}
      <QueryState
        loading={DATA_MODE === 'api' && profile.isLoading}
        error={profile.error}
        retry={profile.refetch}
      />
      <QueryState
        loading={settings.isLoading}
        error={settings.error}
        retry={settings.refetch}
      />
      {settings.data && (profile.data || sample) && (
        <ProfileEditor
          key={user?.id}
          profile={(profile.data || sample)!}
          initial={settings.data}
        />
      )}
    </div>
  )
}

function ProfileEditor({
  profile,
  initial,
}: {
  profile: Profile
  initial: ProfileCustomization
}) {
  const [section, setSection] = useState('Geral')
  const rewards = useProfileRewards(profile)
  const [image, setImage] = useState<HTMLImageElement | null>(null)
  const [crop, setCrop] = useState({ x: 50, y: 50, zoom: 1 })
  const [uploadError, setUploadError] = useState('')
  const fileInput = useRef<HTMLInputElement>(null)
  const form = useForm<ProfileCustomization>({
    resolver: zodResolver(customizationSchema),
    defaultValues: initial,
    mode: 'onChange',
  })
  const values = useWatch({ control: form.control }) as ProfileCustomization
  const valid = customizationSchema.safeParse(values).success
  const client = useQueryClient()
  const toast = useToast()
  const save = useMutation({
    mutationFn: (input: ProfileCustomization) =>
      customizationAdapter.save(profile.id, input),
    onSuccess: (data) => {
      form.reset(data)
      client.setQueryData(['profile-customization', profile.id], data)
      void client.invalidateQueries({ queryKey: ['game', 'public-profile'] })
      void client.invalidateQueries({ queryKey: ['game', 'ranking'] })
      toast(
        DATA_MODE === 'demo'
          ? 'Perfil salvo neste navegador.'
          : 'Perfil salvo. Sua personalização foi atualizada.',
      )
    },
    onError: (error) =>
      toast(
        `${errorMessage(error)} Revise os dados e tente salvar novamente.`,
        'error',
      ),
  })
  const unlocked = profile.badges.filter((b) => b.unlockedAt)
  const selectedVisual = (kind: 'AVATAR' | 'FRAME' | 'BANNER', id: string) =>
    rewards.data?.find((r) => r.kind === kind && r.id === id)?.visual
  const visuals = {
    avatar:
      selectedVisual('AVATAR', values.avatar) ||
      initial.visuals?.avatar ||
      null,
    frame:
      selectedVisual('FRAME', values.frame) || initial.visuals?.frame || null,
    banner:
      selectedVisual('BANNER', values.banner) ||
      initial.visuals?.banner ||
      null,
  }
  const set = <K extends keyof ProfileCustomization>(
    key: K,
    value: ProfileCustomization[K],
  ) =>
    form.setValue(key, value as FieldPathValue<ProfileCustomization, K>, {
      shouldDirty: true,
      shouldValidate: true,
    })
  const dirty = form.formState.isDirty
  const selectedIds = values.featuredBadgeIds || []
  async function loadImage(file?: File) {
    setUploadError('')
    if (!file) return
    if (
      !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
      file.size > 2 * 1024 * 1024
    ) {
      setUploadError('Escolha PNG, JPEG ou WebP de até 2 MB.')
      return
    }
    try {
      const bitmap = await createImageBitmap(file)
      if (
        bitmap.width < 64 ||
        bitmap.height < 64 ||
        bitmap.width > 8192 ||
        bitmap.height > 8192
      ) {
        bitmap.close()
        throw new Error('Use uma imagem entre 64 e 8192 pixels por lado.')
      }
      bitmap.close()
      const data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result))
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
      const img = new Image()
      img.src = data
      await img.decode()
      setCrop({ x: 50, y: 50, zoom: 1 })
      setImage(img)
    } catch (error) {
      setUploadError(
        error instanceof Error
          ? error.message
          : 'Não foi possível abrir a imagem. Escolha outro arquivo.',
      )
    }
    if (fileInput.current) fileInput.current.value = ''
  }
  function applyCrop() {
    if (!image) return
    const side = Math.min(image.naturalWidth, image.naturalHeight) / crop.zoom
    const sx = ((image.naturalWidth - side) * crop.x) / 100
    const sy = ((image.naturalHeight - side) * crop.y) / 100
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 256
    canvas
      .getContext('2d')!
      .drawImage(image, sx, sy, side, side, 0, 0, 256, 256)
    set('avatar', canvas.toDataURL('image/png'))
    setImage(null)
  }
  return (
    <>
      <UnsavedPrompt dirty={dirty} />
      <form
        className="profile-editor-layout"
        onSubmit={form.handleSubmit((data) => save.mutate(data))}
      >
        <nav className="editor-sections" aria-label="Seções da edição">
          {sections.map((item) => (
            <button
              type="button"
              className="merit-chip"
              key={item}
              aria-pressed={section === item}
              onClick={() => setSection(item)}
            >
              {item}
            </button>
          ))}
        </nav>
        <section className="card editor-panel">
          <h2>{section}</h2>
          <p className="editor-section-description">
            {section === 'Geral'
              ? 'Seu nome e sua apresentação na comunidade.'
              : section === 'Avatar'
                ? 'Uma imagem para acompanhar suas conquistas.'
                : section === 'Molduras'
                  ? 'Níveis e conquistas dão novas formas ao seu avatar.'
                  : section === 'Vitrines'
                    ? 'Escolha os marcos que contam a sua história.'
                    : section === 'Privacidade'
                      ? 'Escolha quem pode ver seu perfil e suas informações.'
                      : 'Um fundo que combina com seu perfil.'}
          </p>
          {section === 'Geral' && (
            <>
              <Field
                id="display-name"
                label="Nome de exibição"
                error={form.formState.errors.displayName?.message}
              >
                <input
                  id="display-name"
                  maxLength={40}
                  {...form.register('displayName')}
                  aria-invalid={!!form.formState.errors.displayName}
                />
              </Field>
              <Field
                id="profile-bio"
                label="Resumo"
                error={form.formState.errors.bio?.message}
              >
                <textarea
                  id="profile-bio"
                  maxLength={240}
                  {...form.register('bio')}
                />
              </Field>
              <p className="small muted">
                {values.bio?.length || 0} / 240 caracteres
              </p>
              <label className="editor-check">
                <input type="checkbox" {...form.register('showRealName')} />
                Exibir nome real
              </label>
              <Field id="public-course" label="Curso">
                <input id="public-course" value={profile.course} readOnly />
              </Field>
              <Field id="public-institution" label="Instituição">
                <input
                  id="public-institution"
                  value={profile.institution}
                  readOnly
                />
              </Field>
            </>
          )}
          {section === 'Avatar' && (
            <>
              <a
                className="text-link editor-preview-link"
                href="#profile-preview"
              >
                Ver prévia ao vivo
              </a>
              <QueryState
                loading={rewards.isLoading}
                error={rewards.error}
                retry={rewards.refetch}
              />
              <RewardOptions
                kind="AVATAR"
                rewards={rewards.data || []}
                value={values.avatar}
                name={values.displayName || profile.name}
                avatar={values.avatar}
                onSelect={(id) => set('avatar', id)}
              />
              <Field
                id="avatar-upload"
                label="Enviar avatar (PNG, JPEG ou WebP, até 2 MB)"
                error={uploadError}
              >
                <input
                  ref={fileInput}
                  id="avatar-upload"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(event) => void loadImage(event.target.files?.[0])}
                />
              </Field>
            </>
          )}
          {section === 'Molduras' && (
            <>
              <p className="small muted">
                As molduras acompanham qualquer avatar, inclusive uma foto
                enviada.
              </p>
              <a
                className="text-link editor-preview-link"
                href="#profile-preview"
              >
                Ver prévia ao vivo
              </a>
              <QueryState
                loading={rewards.isLoading}
                error={rewards.error}
                retry={rewards.refetch}
              />
              <RewardOptions
                kind="FRAME"
                avatarVisual={visuals.avatar}
                rewards={rewards.data || []}
                value={values.frame}
                name={values.displayName || profile.name}
                avatar={values.avatar}
                onSelect={(id) =>
                  set('frame', id as ProfileCustomization['frame'])
                }
              />
              <Link className="text-link" to="/aluno/conquistas">
                Ver progresso das conquistas
              </Link>
            </>
          )}
          {section === 'Fundo do perfil' && (
            <>
              <p className="small muted">
                Novos cenários registram os marcos da sua trajetória.
              </p>
              <a
                className="text-link editor-preview-link"
                href="#profile-preview"
              >
                Ver prévia ao vivo
              </a>
              <QueryState
                loading={rewards.isLoading}
                error={rewards.error}
                retry={rewards.refetch}
              />
              <RewardOptions
                kind="BANNER"
                rewards={rewards.data || []}
                value={values.banner}
                name={values.displayName || profile.name}
                avatar={values.avatar}
                onSelect={(id) =>
                  set('banner', id as ProfileCustomization['banner'])
                }
              />
              <Link className="text-link" to="/aluno/conquistas">
                Ver progresso das conquistas
              </Link>
            </>
          )}
          {section === 'Vitrines' && (
            <>
              <p>
                Escolha até três conquistas desbloqueadas. A ordem de seleção
                define a vitrine.
              </p>
              {!unlocked.length && (
                <p>As conquistas desbloqueadas aparecerão aqui.</p>
              )}
              {unlocked.map((b) => (
                <label className="editor-check" key={b.id}>
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(b.id)}
                    disabled={
                      !selectedIds.includes(b.id) && selectedIds.length >= 3
                    }
                    onChange={(event) =>
                      set(
                        'featuredBadgeIds',
                        event.target.checked
                          ? [...selectedIds, b.id]
                          : selectedIds.filter((id) => id !== b.id),
                      )
                    }
                  />
                  {b.name}
                </label>
              ))}
              {selectedIds.map((id, index) => (
                <div className="vitrine-order" key={id}>
                  <span>
                    {index + 1}. {unlocked.find((b) => b.id === id)?.name}
                  </span>
                  <Button
                    variant="ghost"
                    disabled={index === 0}
                    onClick={() => {
                      const next = [...selectedIds]
                      ;[next[index - 1], next[index]] = [
                        next[index],
                        next[index - 1],
                      ]
                      set('featuredBadgeIds', next)
                    }}
                  >
                    Mover para cima
                  </Button>
                </div>
              ))}
              <Field id="favorite-badge" label="Conquista favorita">
                <Select
                  id="favorite-badge"
                  value={values.favoriteBadgeId || ''}
                  onValueChange={(value) =>
                    set('favoriteBadgeId', value || null)
                  }
                >
                  <option value="">Sem favorita</option>
                  {unlocked.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </Select>
              </Field>
            </>
          )}
          {section === 'Privacidade' && (
            <>
              <p className="notice notice-info">
                A visibilidade controla o acesso ao perfil. Sua classificação
                continua no ranking, com seu nome de exibição.
              </p>
              <Field id="profile-visibility" label="Quem pode ver o perfil">
                <FormSelect
                  id="profile-visibility"
                  control={form.control}
                  name="visibility"
                >
                  <option value="all">Alunos e professores autenticados</option>
                  <option value="institution">Só minha instituição</option>
                  <option value="private">Só eu</option>
                </FormSelect>
              </Field>
              <label className="editor-check">
                <input type="checkbox" {...form.register('showStats')} />
                Exibir estatísticas
              </label>
              <label className="editor-check">
                <input type="checkbox" {...form.register('showActivity')} />
                Exibir atividade recente
              </label>
              <label className="editor-check">
                <input type="checkbox" {...form.register('showRealName')} />
                Exibir nome real
              </label>
            </>
          )}
          <div className="editor-save">
            <ErrorNotice error={save.error} />
            {save.error && (
              <Button
                variant="secondary"
                onClick={() => {
                  set('avatar', 'initials')
                  save.reset()
                }}
              >
                Remover avatar enviado
              </Button>
            )}
            <p className="small muted" aria-live="polite">
              {dirty
                ? 'Há alterações não salvas.'
                : 'Nenhuma alteração pendente.'}
            </p>
            <div className="form-actions">
              <Button
                variant="secondary"
                disabled={!dirty || save.isPending}
                onClick={() => form.reset(initial)}
              >
                Descartar
              </Button>
              <Button
                type="submit"
                loading={save.isPending}
                disabled={!dirty || !customizationAdapter.canPersist || !valid}
              >
                Salvar perfil
              </Button>
            </div>
          </div>
        </section>
        <aside className="editor-preview" id="profile-preview" tabIndex={-1}>
          <h2>Pré-visualização ao vivo</h2>
          <ProfileShowcase
            profile={profile}
            settings={{ ...initial, ...values, visuals }}
            preview
          />
        </aside>
      </form>
      {image && (
        <Modal title="Recortar avatar" onClose={() => setImage(null)}>
          <div className="crop-preview">
            <img
              src={image.src}
              alt="Prévia do recorte do avatar"
              style={{
                width: `${(image.naturalWidth / (Math.min(image.naturalWidth, image.naturalHeight) / crop.zoom)) * 100}%`,
                height: `${(image.naturalHeight / (Math.min(image.naturalWidth, image.naturalHeight) / crop.zoom)) * 100}%`,
                maxWidth: 'none',
                left: `${-(image.naturalWidth / (Math.min(image.naturalWidth, image.naturalHeight) / crop.zoom) - 1) * crop.x}%`,
                top: `${-(image.naturalHeight / (Math.min(image.naturalWidth, image.naturalHeight) / crop.zoom) - 1) * crop.y}%`,
              }}
            />
          </div>
          {(['x', 'y', 'zoom'] as const).map((axis) => (
            <Field
              id={`crop-${axis}`}
              label={
                axis === 'x'
                  ? 'Posição horizontal'
                  : axis === 'y'
                    ? 'Posição vertical'
                    : 'Zoom'
              }
              key={axis}
            >
              <input
                id={`crop-${axis}`}
                type="range"
                min={axis === 'zoom' ? 1 : 0}
                max={axis === 'zoom' ? 3 : 100}
                step={axis === 'zoom' ? 0.1 : 1}
                value={crop[axis]}
                onChange={(e) =>
                  setCrop({ ...crop, [axis]: Number(e.target.value) })
                }
              />
            </Field>
          ))}
          <div className="form-actions">
            <Button variant="secondary" onClick={() => setImage(null)}>
              Cancelar
            </Button>
            <Button onClick={applyCrop}>Usar recorte</Button>
          </div>
        </Modal>
      )}
    </>
  )
}
