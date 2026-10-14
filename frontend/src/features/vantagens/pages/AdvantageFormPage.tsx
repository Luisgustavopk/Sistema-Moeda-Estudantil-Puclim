import { ArrowLeft, ImagePlus, Save } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { z } from 'zod'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router'
import { vantagensApi } from '../api/vantagens.api'
import { advantageSchema } from '../schemas/vantagem.schema'
import { useAuth } from '@/features/auth/hooks/auth-context'
import { useAction } from '@/shared/hooks/use-action'
import { useToast } from '@/shared/hooks/toast-context'
import { PageHeading } from '@/shared/components/ui/PageHeading'
import { Button } from '@/shared/components/ui/Button'
import { Field } from '@/shared/components/ui/Field'
import {
  ErrorNotice,
  QueryState,
  EmptyState,
} from '@/shared/components/ui/Feedback'
import { AdvantagePhoto } from '../components/AdvantageCard'
type Values = z.infer<typeof advantageSchema>
export function AdvantageFormPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState('')
  const [fileError, setFileError] = useState('')
  const query = useQuery({
    queryKey: ['own-advantages', user?.id],
    queryFn: () => vantagensApi.list(true),
    enabled: !!id,
  })
  const advantage = query.data?.find((item) => item.id === id)
  const previewPhoto = preview || advantage?.photo || ''
  const form = useForm<Values>({
    resolver: zodResolver(advantageSchema),
    defaultValues: {
      name: '',
      description: '',
      photo: '',
      cost: 100,
      category: 'Alimentação',
      active: true,
    },
  })
  const { reset } = form
  useEffect(() => {
    if (advantage) reset(advantage)
  }, [advantage, reset])
  useEffect(
    () => () => {
      if (preview.startsWith('blob:')) URL.revokeObjectURL(preview)
    },
    [preview],
  )
  const action = useAction(async (values: Values) => {
    const photo = file ? await vantagensApi.uploadPhoto(file) : values.photo
    return vantagensApi.save({ ...values, photo }, id)
  })
  const errors = form.formState.errors
  if (id && (query.isLoading || query.error))
    return (
      <QueryState
        loading={query.isLoading}
        error={query.error}
        retry={query.refetch}
      />
    )
  if (id && !advantage)
    return (
      <EmptyState
        title="Vantagem não encontrada"
        description="Ela pode ter sido excluída ou pertencer a outra empresa."
        action={
          <Link to="/empresa/vantagens" className="button button-secondary">
            Voltar às vantagens
          </Link>
        }
      />
    )
  return (
    <>
      <PageHeading
        eyebrow="Seu próximo gesto de parceria"
        title={
          id ? 'Editar vantagem' : 'Uma nova vantagem, novas possibilidades.'
        }
        description="Conte o que você oferece e como os alunos podem aproveitar."
        action={
          <Link to="/empresa/vantagens" className="text-link">
            <ArrowLeft size={16} /> Voltar às vantagens
          </Link>
        }
      />
      <section className="card" style={{ maxWidth: 850 }}>
        <form
          className="form-grid"
          noValidate
          onSubmit={form.handleSubmit(async (values) => {
            try {
              await action.mutateAsync(values)
              toast(
                id
                  ? 'Vantagem atualizada.'
                  : 'Sua vantagem está pronta para ser descoberta!',
              )
              navigate('/empresa/vantagens')
            } catch {
              /* O erro é exibido abaixo. */
            }
          })}
        >
          <Field
            id="name"
            label="Nome da vantagem"
            className="full"
            error={errors.name?.message}
          >
            <input
              id="name"
              placeholder="Ex.: Café & boas ideias"
              {...form.register('name')}
              aria-invalid={!!errors.name}
            />
          </Field>
          <Field
            id="description"
            label="Descrição e instruções de uso"
            className="full"
            error={errors.description?.message}
          >
            <textarea
              id="description"
              placeholder="Descreva o produto, desconto ou experiência e explique como utilizar."
              {...form.register('description')}
              aria-invalid={!!errors.description}
            />
          </Field>
          <Field
            id="category"
            label="Categoria"
            error={errors.category?.message}
          >
            <select id="category" {...form.register('category')}>
              {['Alimentação', 'Material', 'Eventos', 'Descontos'].map(
                (value) => (
                  <option key={value}>{value}</option>
                ),
              )}
            </select>
          </Field>
          <Field
            id="cost"
            label="Custo em Pucoins"
            error={errors.cost?.message}
          >
            <input
              id="cost"
              type="number"
              min="1"
              step="1"
              {...form.register('cost', { valueAsNumber: true })}
              aria-invalid={!!errors.cost}
            />
          </Field>
          <Field
            id="photo"
            label="Foto da vantagem"
            className="full"
            error={fileError || errors.photo?.message}
            hint="JPG ou PNG · até 2 MB."
          >
            <div className="upload-area">
              {previewPhoto ? (
                <AdvantagePhoto
                  src={previewPhoto}
                  alt="Prévia da foto selecionada"
                />
              ) : (
                <>
                  <ImagePlus size={32} className="muted" />
                  <p className="small muted">
                    Uma boa foto ajuda a contar essa história.
                  </p>
                </>
              )}
              <input
                id="photo"
                type="file"
                accept="image/jpeg,image/png"
                onChange={(event) => {
                  const selected = event.target.files?.[0]
                  if (!selected) return
                  if (
                    !['image/jpeg', 'image/png'].includes(selected.type) ||
                    selected.size > 2 * 1024 * 1024
                  ) {
                    setFileError('Selecione uma imagem JPG ou PNG de até 2 MB.')
                    event.target.value = ''
                    return
                  }
                  setFileError('')
                  setFile(selected)
                  const url = URL.createObjectURL(selected)
                  setPreview(url)
                  form.setValue('photo', url, { shouldValidate: true })
                }}
              />
            </div>
          </Field>
          <label
            className="small full"
            style={{ display: 'flex', gap: 10, alignItems: 'center' }}
          >
            <input
              type="checkbox"
              {...form.register('active')}
              style={{ width: 18, minHeight: 18 }}
            />{' '}
            Disponibilizar esta vantagem no catálogo
          </label>
          {id && (
            <p className="notice notice-info full">
              Alterações de nome e custo valem para os próximos resgates. Cupons
              já emitidos mantêm os dados originais.
            </p>
          )}
          <div className="full">
            <ErrorNotice error={action.error} />
            <div className="form-actions">
              <Link to="/empresa/vantagens" className="button button-secondary">
                Cancelar
              </Link>
              <Button
                type="submit"
                loading={action.isPending}
                disabled={!!fileError}
              >
                <Save size={17} />{' '}
                {id ? 'Salvar alterações' : 'Cadastrar vantagem'}
              </Button>
            </div>
          </div>
        </form>
      </section>
    </>
  )
}
