import { Pencil, Plus, Power, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router'
import { useAuth } from '@/features/auth/hooks/auth-context'
import { vantagensApi } from '../api/vantagens.api'
import { AdvantagePhoto } from '../components/AdvantageCard'
import { PageHeading } from '@/shared/components/ui/PageHeading'
import { Modal } from '@/shared/components/ui/Modal'
import { Button } from '@/shared/components/ui/Button'
import { Coin } from '@/shared/components/ui/Brand'
import {
  QueryState,
  EmptyState,
  ErrorNotice,
} from '@/shared/components/ui/Feedback'
import { useAction } from '@/shared/hooks/use-action'
import { useToast } from '@/shared/hooks/toast-context'
import type { Advantage } from '@/shared/types/domain'
import { number } from '@/shared/utils/format'
export function ManageAdvantagesPage() {
  const { user } = useAuth()
  const toast = useToast()
  const [confirmation, setConfirmation] = useState<{
    advantage: Advantage
    kind: 'delete' | 'toggle'
  } | null>(null)
  const query = useQuery({
    queryKey: ['own-advantages', user?.id],
    queryFn: () => vantagensApi.list(true),
  })
  const action = useAction(async (value: NonNullable<typeof confirmation>) => {
    if (value.kind === 'delete') return vantagensApi.remove(value.advantage.id)
    await vantagensApi.save(
      { ...value.advantage, active: !value.advantage.active },
      value.advantage.id,
    )
  })
  const close = () => {
    setConfirmation(null)
    action.reset()
  }
  return (
    <>
      <PageHeading
        eyebrow="Uma parceria cheia de possibilidades"
        title="Minhas vantagens"
        description="Cuide das experiências que sua empresa oferece aos alunos."
        action={
          <Link to="/empresa/vantagens/nova" className="button button-primary">
            <Plus size={18} /> Nova vantagem
          </Link>
        }
      />
      <QueryState
        loading={query.isLoading}
        error={query.error}
        retry={query.refetch}
      />
      {query.data &&
        (query.data.length ? (
          <div className="offers-grid">
            {query.data.map((advantage) => (
              <article key={advantage.id} className="card offer-card">
                <div className="offer-image">
                  <AdvantagePhoto src={advantage.photo} alt={advantage.name} />
                  <span
                    className={`badge ${advantage.active ? 'badge-success' : ''}`}
                  >
                    {advantage.active ? 'Ativa' : 'Desativada'}
                  </span>
                </div>
                <div className="offer-body">
                  <span className="company-name">{advantage.category}</span>
                  <h3>{advantage.name}</h3>
                  <p>{advantage.description}</p>
                  <span className="price">
                    <Coin size={21} />
                    {number(advantage.cost)} <small>Pucoins</small>
                  </span>
                  <div
                    className="form-actions"
                    style={{
                      marginTop: 18,
                      paddingTop: 14,
                      justifyContent: 'space-between',
                    }}
                  >
                    <Link
                      to={`/empresa/vantagens/${advantage.id}/editar`}
                      className="button button-secondary"
                      style={{ padding: '8px 12px', minHeight: 36 }}
                    >
                      <Pencil size={14} /> Editar
                    </Link>
                    <button
                      className="icon-button"
                      aria-label={`${advantage.active ? 'Desativar' : 'Ativar'} ${advantage.name}`}
                      onClick={() =>
                        setConfirmation({ advantage, kind: 'toggle' })
                      }
                    >
                      <Power size={17} />
                    </button>
                    <button
                      className="icon-button"
                      aria-label={`Excluir ${advantage.name}`}
                      onClick={() =>
                        setConfirmation({ advantage, kind: 'delete' })
                      }
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <section className="card">
            <EmptyState
              title="Sua primeira vantagem começa aqui"
              description="Ofereça uma experiência, produto ou desconto que faça a diferença no dia dos alunos."
              action={
                <Link
                  className="button button-primary"
                  to="/empresa/vantagens/nova"
                >
                  <Plus size={17} /> Cadastrar vantagem
                </Link>
              }
            />
          </section>
        ))}
      {confirmation && (
        <Modal
          title={
            confirmation.kind === 'delete'
              ? 'Excluir esta vantagem?'
              : `${confirmation.advantage.active ? 'Desativar' : 'Ativar'} esta vantagem?`
          }
          onClose={close}
          busy={action.isPending}
        >
          <p className="muted">{confirmation.advantage.name}</p>
          <p className="small muted" style={{ marginTop: 14 }}>
            {confirmation.kind === 'delete' || confirmation.advantage.active
              ? 'Ela deixará de aparecer no catálogo. Cupons já emitidos serão preservados. Se houver resgates, a vantagem será desativada para manter o histórico.'
              : 'Ela voltará a aparecer no catálogo e poderá ser resgatada pelos alunos.'}
          </p>
          <ErrorNotice error={action.error} />
          <div className="form-actions">
            <Button
              variant="secondary"
              disabled={action.isPending}
              onClick={close}
            >
              Cancelar
            </Button>
            <Button
              variant={confirmation.kind === 'delete' ? 'danger' : 'primary'}
              loading={action.isPending}
              onClick={async () => {
                try {
                  await action.mutateAsync(confirmation)
                  toast('Vantagem atualizada com sucesso.')
                  close()
                } catch {
                  /* O erro é exibido no diálogo. */
                }
              }}
            >
              Confirmar
            </Button>
          </div>
        </Modal>
      )}
    </>
  )
}
