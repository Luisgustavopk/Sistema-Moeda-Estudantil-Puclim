import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAuth } from '@/features/auth/hooks/auth-context'
import { DATA_MODE } from '@/shared/lib/http'
import { Button } from '@/shared/components/ui/Button'
import { Field } from '@/shared/components/ui/Field'
import { QueryState } from '@/shared/components/ui/Feedback'
import { gameApi } from './api'
import { useGameAction } from './hooks'

const schema = z.object({
  beneficiaryId: z.string().min(1, 'Selecione a instituição beneficiária.'),
})
export function DonateCoupon({ code }: { code: string }) {
  const { user } = useAuth()
  const [opened, setOpened] = useState(false)
  const [review, setReview] = useState(false)
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { beneficiaryId: '' },
  })
  const query = useQuery({
    queryKey: ['game', 'beneficiaries', user?.id],
    queryFn: gameApi.beneficiaries,
    enabled: opened && DATA_MODE === 'api',
  })
  const action = useGameAction(
    (beneficiaryId: string) => gameApi.donate(code, beneficiaryId),
    'Vantagem doada. Obrigado por compartilhar sua conquista!',
  )
  if (DATA_MODE === 'demo') return null
  return (
    <div>
      {!opened ? (
        <Button variant="secondary" onClick={() => setOpened(true)}>
          Doar vantagem
        </Button>
      ) : (
        <form
          onSubmit={form.handleSubmit((data) =>
            review ? action.mutate(data.beneficiaryId) : setReview(true),
          )}
        >
          <QueryState
            loading={query.isLoading}
            error={query.error}
            retry={query.refetch}
          />
          <Field
            id={`beneficiary-${code}`}
            label="Instituição beneficiária"
            error={form.formState.errors.beneficiaryId?.message}
          >
            <select
              id={`beneficiary-${code}`}
              disabled={review}
              {...form.register('beneficiaryId')}
            >
              <option value="">Selecione</option>
              {query.data?.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </Field>
          {query.data?.length === 0 && (
            <p>Nenhuma instituição beneficiária está disponível.</p>
          )}
          {review && (
            <p>
              Confirmar doação para{' '}
              {
                query.data?.find(
                  (b) => b.id === form.getValues('beneficiaryId'),
                )?.name
              }
              ? O cupom será invalidado para seu uso. Não haverá novo desconto
              de moedas.
            </p>
          )}
          <div className="toolbar">
            <Button type="submit" loading={action.isPending}>
              {review ? 'Confirmar doação' : 'Revisar doação'}
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setOpened(false)
                setReview(false)
              }}
            >
              Cancelar
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}
