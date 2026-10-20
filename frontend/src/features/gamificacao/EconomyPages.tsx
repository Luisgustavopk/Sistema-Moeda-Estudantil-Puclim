import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAuth } from '@/features/auth/hooks/auth-context'
import { PageHeading } from '@/shared/components/ui/PageHeading'
import { Field } from '@/shared/components/ui/Field'
import { Button } from '@/shared/components/ui/Button'
import { QueryState, EmptyState } from '@/shared/components/ui/Feedback'
import { dateTime, number } from '@/shared/utils/format'
import { gameApi } from './api'
import { useGameAction } from './hooks'
import { ActivityForm } from './ActivityForm'
import type { Payment, Challenge } from './types'

function PaymentList({ payments }: { payments: Payment[] }) {
  return (
    <>
      {payments.length === 0 && <p>Nenhuma recompensa registrada.</p>}
      {payments.map((p) => (
        <article className="row" key={p.id}>
          <div className="row-text">
            <strong>
              {p.kind} · {p.studentName}
            </strong>
            <p>
              {dateTime(p.date)} · Semestre {p.semester}
            </p>
            <span
              className={`badge ${p.status === 'PAGO' ? 'badge-success' : ''}`}
            >
              {p.status === 'PAGO' ? 'Pago' : 'Aguardando saldo no Fundo'}
            </span>
          </div>
          <strong>{number(p.amount)} moedas</strong>
        </article>
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
  return (
    <>
      <PageHeading
        title="Minhas recompensas"
        description="Bônus, recompensas de constância e prêmios do semestre."
      />
      <QueryState
        loading={query.isLoading}
        error={query.error}
        retry={query.refetch}
      />
      {query.data && (
        <section className="card">
          <PaymentList payments={query.data} />
        </section>
      )}
    </>
  )
}
const allocationSchema = z.object({
  amount: z.number().int().min(1, 'Informe um valor positivo.').max(1000000000),
  origin: z.string().trim().min(1, 'Informe a origem autorizada.').max(500),
})
export function FundPage() {
  const { user } = useAuth()
  const [requested, setRequested] = useState('')
  const context = useQuery({
    queryKey: ['game', 'context', user?.id],
    queryFn: gameApi.context,
  })
  const semester = requested || context.data?.semester || ''
  const query = useQuery({
    queryKey: ['game', 'fund', user?.id, semester],
    queryFn: () => gameApi.fund(semester),
    enabled: /^[0-9]{4}-[12]$/.test(semester),
    refetchInterval: 30000,
  })
  const form = useForm<z.infer<typeof allocationSchema>>({
    resolver: zodResolver(allocationSchema),
  })
  const allocate = useGameAction(
    (input: z.infer<typeof allocationSchema>) =>
      gameApi.allocate(semester, input),
    'Dotação semestral registrada.',
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
    <>
      <PageHeading
        title="Fundo institucional"
        description="Defina a dotação e acompanhe o orçamento de recompensas."
      />
      <Field id="fund-semester" label="Semestre do Fundo">
        <input
          id="fund-semester"
          placeholder={context.data?.semester || 'AAAA-1'}
          value={requested}
          onChange={(e) => setRequested(e.target.value)}
          maxLength={6}
        />
      </Field>
      <QueryState
        loading={context.isLoading || query.isLoading}
        error={context.error || query.error}
        retry={() => {
          void context.refetch()
          void query.refetch()
        }}
      />
      {query.data && (
        <>
          <section className="card">
            <h2>Semestre {semester}</h2>
            <p>
              Dotação: {number(query.data.allocation)} · Disponível:{' '}
              {number(query.data.balance)} · Reservado:{' '}
              {number(query.data.reserved)}
            </p>
            <p>
              Consumo do orçamento:{' '}
              {number(query.data.allocation - query.data.balance)} moedas
            </p>
            {query.data.origin && <p>Origem: {query.data.origin}</p>}
          </section>
          {!query.data.allocation && semester === context.data?.semester && (
            <form
              className="card"
              onSubmit={form.handleSubmit((v) => allocate.mutate(v))}
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
                Registrar dotação
              </Button>
            </form>
          )}
          <div className="toolbar">
            <Button
              variant="secondary"
              loading={retry.isPending}
              onClick={() => retry.mutate()}
            >
              Reprocessar pagamentos pendentes
            </Button>
            <Button
              variant="secondary"
              disabled={semester >= (context.data?.semester || '')}
              loading={close.isPending}
              onClick={() => close.mutate()}
            >
              Processar premiação do semestre encerrado
            </Button>
          </div>
          <section className="card">
            <h2>Recompensas e pendências</h2>
            <PaymentList payments={query.data.payments} />
          </section>
          <section className="card">
            <h2>Movimentações do Fundo</h2>
            {query.data.movements.length === 0 && (
              <p>Nenhuma movimentação registrada.</p>
            )}
            {query.data.movements.map((m) => (
              <div className="row" key={m.sourceKey}>
                <div className="row-text">
                  <strong>{m.kind}</strong>
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
    </>
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
      {query.data?.map((d) => (
        <article className="card" key={d.id}>
          <h2>{d.advantageName}</h2>
          <p>
            {d.companyName} · {d.beneficiaryName}
          </p>
          <p>{dateTime(d.date)}</p>
        </article>
      ))}
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
      {query.data?.map((c) => (
        <article className="card" key={c.id}>
          <h2>{c.title}</h2>
          <p className="notification-body">{c.description}</p>
          <p>
            {number(c.reward)} moedas por participante · {c.capacity} vagas ·
            Orçamento: {number(c.budget)}
          </p>
          <p>Prazo: {dateTime(c.deadline)}</p>
          <span className="badge">{c.status.replaceAll('_', ' ')}</span>
          {['PROPOSTA', 'PENDENTE_FINANCIAMENTO'].includes(c.status) && (
            <div className="toolbar">
              <Button variant="secondary" onClick={() => setEditing(c)}>
                Editar proposta
              </Button>
              {c.status === 'PROPOSTA' && (
                <Button
                  loading={action.isPending}
                  onClick={() => action.mutate({ id: c.id, action: 'enviar' })}
                >
                  Encaminhar proposta
                </Button>
              )}
              <Button
                variant="ghost"
                loading={action.isPending}
                onClick={() => action.mutate({ id: c.id, action: 'cancelar' })}
              >
                Cancelar proposta
              </Button>
              <Button variant="secondary" loading={action.isPending} onClick={() => action.mutate({ id: c.id, action: 'encerrar' })}>
                Encerrar proposta
              </Button>
            </div>
          )}
        </article>
      ))}
    </>
  )
}
