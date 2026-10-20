import { useState } from 'react'
import { Link } from 'react-router'
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
import type { Mission, Participation } from './types'

const textSchema = z.object({
  text: z.string().trim().min(1, 'Escreva uma mensagem.').max(2000),
})
function ParticipationActions({
  participation: p,
  teacher,
}: {
  participation: Participation
  teacher: boolean
}) {
  const form = useForm<z.infer<typeof textSchema>>({
    resolver: zodResolver(textSchema),
    defaultValues: { text: '' },
  })
  const action = useGameAction(
    (input: { text: string; approve?: boolean }) =>
      teacher
        ? gameApi.review(p.id, !!input.approve, input.text)
        : gameApi.deliver(p.id, input.text),
    teacher ? 'Análise registrada.' : 'Entrega enviada para análise.',
  )
  const enabled = teacher
    ? p.status === 'AGUARDANDO_APROVACAO'
    : ['EM_ANDAMENTO', 'DEVOLVIDA'].includes(p.status)
  return (
    <article className="card">
      <h3>
        {teacher ? (
          <Link className="text-link" to={`/perfis/${p.studentId}`}>
            {p.studentName}
          </Link>
        ) : (
          'Minha participação'
        )}
      </h3>
      <p className="badge">{p.status.replaceAll('_', ' ')}</p>
      {p.delivery && <p className="notification-body">Entrega: {p.delivery}</p>}
      {p.feedback && (
        <p className="notification-body">Avaliação: {p.feedback}</p>
      )}
      {enabled && (
        <form
          onSubmit={form.handleSubmit((data) =>
            action.mutate({ ...data, approve: teacher }),
          )}
        >
          <Field
            id={`delivery-${p.id}`}
            label={teacher ? 'Parecer da análise' : 'Sua entrega'}
            error={form.formState.errors.text?.message}
          >
            <textarea id={`delivery-${p.id}`} {...form.register('text')} />
          </Field>
          <div className="toolbar">
            <Button type="submit" loading={action.isPending}>
              {teacher ? 'Aprovar entrega' : 'Enviar entrega'}
            </Button>
            {teacher && (
              <Button
                variant="secondary"
                loading={action.isPending}
                onClick={form.handleSubmit((data) =>
                  action.mutate({ ...data, approve: false }),
                )}
              >
                Devolver para ajustes
              </Button>
            )}
          </div>
        </form>
      )}
      {p.history.length > 0 && (
        <details>
          <summary>Histórico da participação</summary>
          {p.history.map((h, i) => (
            <p className="notification-body" key={i}>
              {dateTime(h.date)} · {h.action}: {h.text}
            </p>
          ))}
        </details>
      )}
    </article>
  )
}
const deadlineSchema = z.object({
  deadline: z
    .string()
    .min(1)
    .refine((v) => Number.isFinite(Date.parse(v)), 'Informe uma data válida.'),
})
function DeadlineForm({ mission }: { mission: Mission }) {
  const form = useForm<z.infer<typeof deadlineSchema>>({
    resolver: zodResolver(deadlineSchema),
  })
  const action = useGameAction(
    (deadline: string) =>
      gameApi.deadline(mission.id, new Date(deadline).toISOString()),
    'Prazo atualizado.',
  )
  return (
    <form
      className="toolbar"
      onSubmit={form.handleSubmit((v) => action.mutate(v.deadline))}
    >
      <Field
        id={`deadline-${mission.id}`}
        label="Novo prazo"
        error={form.formState.errors.deadline?.message}
      >
        <input
          id={`deadline-${mission.id}`}
          type="datetime-local"
          {...form.register('deadline')}
        />
      </Field>
      <Button type="submit" variant="secondary" loading={action.isPending}>
        Alterar prazo
      </Button>
    </form>
  )
}
export function MissionsPage() {
  const { user } = useAuth()
  const teacher = user?.role === 'PROFESSOR'
  const [creating, setCreating] = useState(false)
  const [mine, setMine] = useState(false)
  const query = useQuery({
    queryKey: ['game', 'missions', user?.id],
    queryFn: gameApi.missions,
    refetchInterval: 30000,
  })
  const accept = useGameAction(gameApi.acceptMission, 'Missão aceita.')
  const close = useGameAction(
    gameApi.closeMission,
    'Missão encerrada. Reservas sem obrigação foram liberadas.',
  )
  const rows = query.data?.filter((m) => !mine || m.participants.length > 0)
  return (
    <>
      <PageHeading
        title={teacher ? 'Minhas missões' : 'Missões'}
        description={
          teacher
            ? 'Crie atividades e acompanhe as entregas dos seus alunos.'
            : 'Aceite atividades, envie sua entrega e acompanhe a avaliação.'
        }
        action={
          teacher && (
            <Button onClick={() => setCreating(true)}>Criar missão</Button>
          )
        }
      />
      {creating && <ActivityForm done={() => setCreating(false)} />}
      {!teacher && (
        <div className="chips">
          <button
            className={`chip ${!mine ? 'active' : ''}`}
            onClick={() => setMine(false)}
          >
            Todas as missões
          </button>
          <button
            className={`chip ${mine ? 'active' : ''}`}
            onClick={() => setMine(true)}
          >
            Minhas participações
          </button>
        </div>
      )}
      <QueryState
        loading={query.isLoading}
        error={query.error}
        retry={query.refetch}
      />
      {rows?.length === 0 && (
        <EmptyState
          title="Nenhuma missão por aqui"
          description={
            teacher
              ? 'Publique sua primeira missão.'
              : 'Novas atividades aparecerão neste espaço.'
          }
        />
      )}
      {rows?.map((m) => (
        <section className="card" key={m.id}>
          <div className="section-heading">
            <h2>{m.title}</h2>
            <span className="badge">{m.status}</span>
          </div>
          <p className="notification-body">{m.description}</p>
          <p>
            Professor: {m.teacherName} · {number(m.reward)} moedas ·{' '}
            {m.capacity - m.occupied} vagas restantes
          </p>
          <p>
            Prazo: {dateTime(m.deadline)}{' '}
            {teacher && `· Reserva: ${number(m.reserved)} moedas`}
          </p>
          {teacher && m.status === 'DISPONIVEL' && (
            <>
              <DeadlineForm mission={m} />
              <Button
                variant="secondary"
                loading={close.isPending}
                onClick={() => close.mutate(m.id)}
              >
                Encerrar missão
              </Button>
              <p className="small muted">
                Entregas enviadas ou devolvidas continuam reservadas para
                análise. Participações sem entrega serão canceladas.
              </p>
            </>
          )}
          {!teacher && m.participants.length === 0 && (
            <Button
              loading={accept.isPending}
              disabled={m.status !== 'DISPONIVEL' || m.occupied >= m.capacity}
              onClick={() => accept.mutate(m.id)}
            >
              Aceitar missão
            </Button>
          )}
          {m.participants.map((p) => (
            <ParticipationActions
              key={p.id}
              participation={p}
              teacher={teacher}
            />
          ))}
        </section>
      ))}
    </>
  )
}
