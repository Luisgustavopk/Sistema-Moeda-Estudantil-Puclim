import { Select } from '@/shared/components/ui/Select'
import { useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAuth } from '@/features/auth/hooks/auth-context'
import { PageHeading } from '@/shared/components/ui/PageHeading'
import { Field } from '@/shared/components/ui/Field'
import { Button } from '@/shared/components/ui/Button'
import {
  QueryState,
  EmptyState,
  ErrorNotice,
} from '@/shared/components/ui/Feedback'
import { Modal } from '@/shared/components/ui/Modal'
import { dateTime, number } from '@/shared/utils/format'
import { gameApi } from './api'
import { useGameAction } from './hooks'
import { ActivityForm } from './ActivityForm'
import type { Payment, Challenge } from './types'
import {
  Panel,
  ListItem,
  StatusBadge,
} from '@/shared/components/ui/ActivitySurface'

const paymentNames: Record<string, string> = {
  BONUS: 'Bônus de mérito',
  RECOMPENSA: 'Recompensa de constância',
  PREMIO: 'Premiação do semestre',
}
function PaymentList({
  payments,
  administrative = false,
}: {
  payments: Payment[]
  administrative?: boolean
}) {
  return (
    <>
      {payments.length === 0 && <p>Nenhuma recompensa registrada.</p>}
      {payments.map((p) => (
        <ListItem className="reward-row" key={p.id}>
          <div className="activity-item-content">
            <h3>
              {paymentNames[p.kind] || p.kind}
              {administrative && ` · ${p.studentName}`}
            </h3>
            <p className="activity-meta">
              <time dateTime={p.date}>{dateTime(p.date)}</time>
              <span>Semestre {p.semester}</span>
            </p>
            <StatusBadge tone={p.status === 'PAGO' ? 'success' : 'warning'}>
              {p.status === 'PAGO' ? 'Pago' : 'Aguardando saldo no Fundo'}
            </StatusBadge>
          </div>
          <div className="reward-amount">
            <strong>{number(p.amount)}</strong>
            <span>moedas</span>
          </div>
        </ListItem>
      ))}
    </>
  )
}
export function RewardsPage() {
  const { user } = useAuth()
  const query = useQuery({
    queryKey: ['game', 'rewards', user?.id],
    queryFn: gameApi.rewards,
    refetchInterval: 30000,
  })
  const [semester, setSemester] = useState('all')
  const [status, setStatus] = useState('all')
  const period =
    query.data?.filter((p) => semester === 'all' || p.semester === semester) ||
    []
  const rows = period.filter((p) => status === 'all' || p.status === status)
  const semesters = [...new Set(query.data?.map((p) => p.semester) || [])]
    .sort()
    .reverse()
  const paid = period
    .filter((p) => p.status === 'PAGO')
    .reduce((sum, p) => sum + p.amount, 0)
  const pending = period
    .filter((p) => p.status === 'PENDENTE')
    .reduce((sum, p) => sum + p.amount, 0)
  return (
    <div className="merit-page rewards-page">
      <PageHeading
        title="Minhas recompensas"
        description="Bônus, recompensas de constância e prêmios do semestre."
      />
      <div className="reward-controls">
        <label>
          Período
          <Select
            aria-label="Período"
            value={semester}
            onValueChange={(value) => setSemester(value)}
          >
            <option value="all">Todo o histórico</option>
            {semesters.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </label>
        <label>
          Situação
          <Select
            aria-label="Situação"
            value={status}
            onValueChange={(value) => setStatus(value)}
          >
            <option value="all">Todas</option>
            <option value="PAGO">Pagas</option>
            <option value="PENDENTE">Pendentes</option>
          </Select>
        </label>
      </div>
      <QueryState
        loading={query.isLoading}
        error={query.error}
        retry={query.refetch}
      />
      {query.data && (
        <>
          <Panel className="reward-summary" label="Resumo do período">
            <div>
              <span>Recebidas</span>
              <strong>
                {number(paid)} <small>moedas</small>
              </strong>
            </div>
            <div>
              <span>Pendentes</span>
              <strong>
                {number(pending)} <small>moedas</small>
              </strong>
            </div>
            <p className="small muted">
              {semester === 'all' ? 'Todo o histórico' : `Semestre ${semester}`}
              . Pagamentos pendentes aguardam saldo no Fundo institucional.
            </p>
          </Panel>
          <Panel>
            <div className="section-heading">
              <h2>Seus reconhecimentos</h2>
              <span className="small muted">{rows.length} registros</span>
            </div>
            <div className="activity-list">
              <PaymentList payments={rows} />
            </div>
          </Panel>
        </>
      )}
    </div>
  )
}
const allocationSchema = z.object({
  amount: z.number().int().min(1, 'Informe um valor positivo.').max(1000000000),
  origin: z.string().trim().min(1, 'Informe a origem autorizada.').max(500),
})
export function FundPage() {
  const { user } = useAuth()
  const [requested, setRequested] = useState<string | null>(null)
  const [review, setReview] = useState<{
    semester: string
    amount: number
    origin: string
  } | null>(null)
  const submitting = useRef(false)
  const context = useQuery({
    queryKey: ['game', 'context', user?.id],
    queryFn: gameApi.context,
  })
  const semester = requested ?? context.data?.semester ?? ''
  const validSemester = /^[0-9]{4}-[12]$/.test(semester)
  const query = useQuery({
    queryKey: ['game', 'fund', user?.id, semester],
    queryFn: () => gameApi.fund(semester),
    enabled: validSemester,
    refetchInterval: 30000,
  })
  const form = useForm<z.infer<typeof allocationSchema>>({
    resolver: zodResolver(allocationSchema),
  })
  const allocate = useGameAction(
    (input: { semester: string; amount: number; origin: string }) =>
      gameApi.allocate(input.semester, {
        amount: input.amount,
        origin: input.origin,
      }),
    'Dotação semestral registrada.',
    () => {
      setReview(null)
      form.reset()
    },
  )
  const retry = useGameAction(
    () => gameApi.retry(semester),
    'Recompensas pendentes reprocessadas.',
  )
  const close = useGameAction(
    () => gameApi.closeSemester(semester),
    'Premiação do semestre processada.',
  )
  return (
    <div className="merit-page fund-page">
      <PageHeading
        title="Fundo institucional"
        description="Defina a dotação e acompanhe o orçamento de recompensas."
      />
      <Field
        id="fund-semester"
        label="Semestre do Fundo"
        hint="Use AAAA-1 ou AAAA-2. O semestre atual é definido pelo servidor."
        error={
          requested !== null && !validSemester
            ? 'Informe um semestre no formato AAAA-1 ou AAAA-2.'
            : undefined
        }
      >
        <input
          id="fund-semester"
          placeholder={context.data?.semester || 'AAAA-1'}
          value={semester}
          aria-invalid={requested !== null && !validSemester}
          onChange={(e) => {
            setRequested(e.target.value)
            allocate.reset()
            retry.reset()
            close.reset()
          }}
          maxLength={6}
        />
      </Field>
      <QueryState
        loading={context.isLoading || (validSemester && query.isLoading)}
        error={context.error || (validSemester ? query.error : null)}
        retry={() => {
          void context.refetch()
          if (validSemester) void query.refetch()
        }}
      />
      {validSemester && query.data && (
        <>
          <section className="card fund-summary">
            <h2>Semestre {query.data.semester}</h2>
            {query.isFetching && (
              <p className="small muted" role="status">
                Atualizando orçamento…
              </p>
            )}
            <dl className="fund-values">
              <div>
                <dt>Dotação</dt>
                <dd>
                  {number(query.data.allocation)} <small>moedas</small>
                </dd>
              </div>
              <div>
                <dt>Disponível</dt>
                <dd>
                  {number(query.data.balance)} <small>moedas</small>
                </dd>
              </div>
              <div>
                <dt>Reservado</dt>
                <dd>
                  {number(query.data.reserved)} <small>moedas</small>
                </dd>
              </div>
            </dl>
            <p>
              Consumo do orçamento:{' '}
              {number(query.data.allocation - query.data.balance)} moedas
            </p>
            {query.data.origin && <p>Origem: {query.data.origin}</p>}
          </section>
          {!query.data.allocation && semester === context.data?.semester && (
            <form
              className="card form-stack"
              noValidate
              onSubmit={form.handleSubmit((v) => {
                const limit = context.data?.maxAllocation
                if (limit === undefined) return
                if (v.amount > limit) {
                  form.setError('amount', {
                    message: `O limite é ${number(limit)} moedas.`,
                  })
                  form.setFocus('amount')
                  return
                }
                allocate.reset()
                setReview({ ...v, semester })
              })}
            >
              <h2>Definir dotação semestral</h2>
              <p>
                Uma única dotação imutável por semestre. Limite:{' '}
                {number(context.data.maxAllocation)} moedas.
              </p>
              <Field
                id="fund-amount"
                label="Valor da dotação"
                error={form.formState.errors.amount?.message}
              >
                <input
                  id="fund-amount"
                  type="number"
                  min={1}
                  max={context.data.maxAllocation}
                  aria-invalid={!!form.formState.errors.amount}
                  {...form.register('amount', { valueAsNumber: true })}
                />
              </Field>
              <Field
                id="fund-origin"
                label="Origem e autorização do orçamento"
                error={form.formState.errors.origin?.message}
              >
                <textarea id="fund-origin" {...form.register('origin')} />
              </Field>
              <Button type="submit" loading={allocate.isPending}>
                Revisar dotação
              </Button>
              <ErrorNotice error={allocate.error} />
            </form>
          )}
          <div className="fund-operations">
            <div className="toolbar">
              <Button
                variant="secondary"
                loading={retry.isPending}
                disabled={close.isPending}
                onClick={() => retry.mutate()}
              >
                Reprocessar pagamentos pendentes
              </Button>
              <Button
                variant="secondary"
                disabled={
                  semester >= (context.data?.semester || '') || retry.isPending
                }
                loading={close.isPending}
                onClick={() => close.mutate()}
              >
                Processar premiação do semestre encerrado
              </Button>
            </div>
            <ErrorNotice error={retry.error || close.error} />
            {(retry.error || close.error) && (
              <p className="small muted">
                Os dados foram preservados. Tente a ação novamente.
              </p>
            )}
          </div>
          <section className="card">
            <h2>Recompensas e pendências</h2>
            <PaymentList payments={query.data.payments} administrative />
          </section>
          <section className="card">
            <h2>Movimentações do Fundo</h2>
            {query.data.movements.length === 0 && (
              <p>Nenhuma movimentação registrada.</p>
            )}
            {query.data.movements.map((m) => (
              <div className="row" key={m.sourceKey}>
                <div className="row-text">
                  <strong>
                    {m.kind === 'DOTACAO'
                      ? 'Dotação semestral'
                      : paymentNames[m.kind] || m.kind}
                  </strong>
                  <p>{dateTime(m.date)}</p>
                </div>
                <strong>
                  {m.amount > 0 ? '+' : ''}
                  {number(m.amount)}
                </strong>
              </div>
            ))}
          </section>
          <section className="card">
            <h2>Vencedores do semestre</h2>
            {query.data.winners.length === 0 && (
              <p>A premiação aparece após o encerramento do semestre.</p>
            )}
            {query.data.winners.map((w) => (
              <p key={w.position}>
                {w.position}º · {w.studentName} · {number(w.received)} moedas
                recebidas · Prêmio: {number(w.reward)}
              </p>
            ))}
          </section>
        </>
      )}
      {review && (
        <Modal
          title="Revisar dotação semestral"
          busy={allocate.isPending}
          onClose={() => setReview(null)}
        >
          <p>
            Confira os dados. Após o registro, a dotação deste semestre não
            poderá ser alterada.
          </p>
          <dl className="allocation-review">
            <dt>Semestre</dt>
            <dd>{review.semester}</dd>
            <dt>Valor</dt>
            <dd>{number(review.amount)} moedas</dd>
            <dt>Origem e autorização</dt>
            <dd>{review.origin}</dd>
          </dl>
          <ErrorNotice error={allocate.error} />
          <div className="form-actions">
            <Button
              variant="secondary"
              disabled={allocate.isPending}
              onClick={() => setReview(null)}
            >
              Voltar à edição
            </Button>
            <Button
              loading={allocate.isPending}
              onClick={() => {
                if (submitting.current) return
                submitting.current = true
                allocate.mutate(review, {
                  onSettled: () => {
                    submitting.current = false
                  },
                })
              }}
            >
              Registrar dotação
            </Button>
          </div>
        </Modal>
      )}
    </div>
  )
}
export function DonationsPage() {
  const { user } = useAuth()
  const query = useQuery({
    queryKey: ['game', 'donations', user?.id],
    queryFn: gameApi.donations,
    refetchInterval: 30000,
  })
  return (
    <>
      <PageHeading
        title="Doações recebidas"
        description="Vantagens destinadas à sua instituição pelos alunos."
      />
      <QueryState
        loading={query.isLoading}
        error={query.error}
        retry={query.refetch}
      />
      {query.data?.length === 0 && (
        <EmptyState
          title="Nenhuma doação recebida"
          description="As vantagens doadas aparecerão aqui."
        />
      )}
      <div className="record-list">
        {query.data?.map((d) => (
          <article className="card donation-record" key={d.id}>
            <h2>{d.advantageName}</h2>
            <p className="muted">
              {d.companyName} · {d.beneficiaryName}
            </p>
            <time dateTime={d.date} className="activity-meta">
              {dateTime(d.date)}
            </time>
          </article>
        ))}
      </div>
    </>
  )
}
export function ChallengesPage() {
  const { user } = useAuth()
  const [editing, setEditing] = useState<Challenge | 'new' | null>(null)
  const query = useQuery({
    queryKey: ['game', 'challenges', user?.id],
    queryFn: gameApi.challenges,
  })
  const action = useGameAction(
    (input: { id: string; action: 'enviar' | 'cancelar' | 'encerrar' }) =>
      gameApi.challengeAction(input.id, input.action),
    'Estado da proposta atualizado.',
  )
  return (
    <>
      <PageHeading
        title="Desafios patrocinados"
        description="Proponha atividades e acompanhe suas propostas."
        action={
          <Button onClick={() => setEditing('new')}>Nova proposta</Button>
        }
      />
      <p className="notice notice-info">
        Propostas podem ser cadastradas e encaminhadas. A publicação e os
        pagamentos aguardam a definição da origem autorizada do financiamento.
      </p>
      <QueryState
        loading={query.isLoading}
        error={query.error}
        retry={query.refetch}
      />
      <ErrorNotice error={action.error} />
      {editing && (
        <ActivityForm
          key={editing === 'new' ? 'new' : editing.id}
          sponsored
          challenge={editing === 'new' ? undefined : editing}
          done={() => setEditing(null)}
        />
      )}
      {query.data?.length === 0 && (
        <EmptyState
          title="Nenhuma proposta cadastrada"
          description="Crie seu primeiro desafio patrocinado."
        />
      )}
      <div className="record-list">
        {query.data?.map((c) => (
          <article className="card challenge-record" key={c.id}>
            <div className="section-heading">
              <h2>{c.title}</h2>
              <StatusBadge tone={c.status === 'PROPOSTA' ? 'neutral' : 'info'}>
                {(
                  {
                    PROPOSTA: 'Proposta',
                    PENDENTE_FINANCIAMENTO: 'Aguardando financiamento',
                    ENCERRADA: 'Encerrada',
                    CANCELADA: 'Cancelada',
                    ATIVA: 'Ativa',
                  } as Record<string, string>
                )[c.status] || c.status.replaceAll('_', ' ')}
              </StatusBadge>
            </div>
            <p className="notification-body">{c.description}</p>
            <dl className="record-facts">
              <div>
                <dt>Por participante</dt>
                <dd>{number(c.reward)} moedas</dd>
              </div>
              <div>
                <dt>Vagas</dt>
                <dd>{number(c.capacity)}</dd>
              </div>
              <div>
                <dt>Orçamento</dt>
                <dd>{number(c.budget)} moedas</dd>
              </div>
              <div>
                <dt>Prazo</dt>
                <dd>{dateTime(c.deadline)}</dd>
              </div>
            </dl>
            {['PROPOSTA', 'PENDENTE_FINANCIAMENTO'].includes(c.status) && (
              <div className="action-row record-actions">
                <Button variant="secondary" onClick={() => setEditing(c)}>
                  Editar proposta
                </Button>
                {c.status === 'PROPOSTA' && (
                  <Button
                    loading={action.isPending}
                    onClick={() =>
                      action.mutate({ id: c.id, action: 'enviar' })
                    }
                  >
                    Encaminhar proposta
                  </Button>
                )}
                <Button
                  variant="ghost"
                  loading={action.isPending}
                  onClick={() =>
                    action.mutate({ id: c.id, action: 'cancelar' })
                  }
                >
                  Cancelar proposta
                </Button>
                <Button
                  variant="secondary"
                  loading={action.isPending}
                  onClick={() =>
                    action.mutate({ id: c.id, action: 'encerrar' })
                  }
                >
                  Encerrar proposta
                </Button>
              </div>
            )}
          </article>
        ))}
      </div>
    </>
  )
}
