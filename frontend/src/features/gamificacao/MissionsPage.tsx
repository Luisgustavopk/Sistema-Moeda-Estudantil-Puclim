import { Select } from '@/shared/components/ui/Select'
import { useState } from 'react'
import { ArrowUpRight, CalendarDays, Coins, Flag, Users } from 'lucide-react'
import { Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAuth } from '@/features/auth/hooks/auth-context'
import { PageHeading } from '@/shared/components/ui/PageHeading'
import { Field } from '@/shared/components/ui/Field'
import { Button } from '@/shared/components/ui/Button'
import { Modal } from '@/shared/components/ui/Modal'
import {
  Panel,
  StatusBadge,
  type StatusTone,
} from '@/shared/components/ui/ActivitySurface'
import { QueryState, EmptyState } from '@/shared/components/ui/Feedback'
import { dateTime, number } from '@/shared/utils/format'
import { gameApi } from './api'
import { useGameAction } from './hooks'
import { ActivityForm } from './ActivityForm'
import type { Mission, Participation } from './types'

const textSchema = z.object({
  text: z.string().trim().min(1, 'Escreva uma mensagem.').max(2000),
})
const states: Record<string, { label: string; tone: StatusTone }> = {
  DISPONIVEL: { label: 'Disponível', tone: 'neutral' },
  EM_ANDAMENTO: { label: 'Em andamento', tone: 'info' },
  AGUARDANDO_APROVACAO: { label: 'Aguardando aprovação', tone: 'warning' },
  DEVOLVIDA: { label: 'Ajustes solicitados', tone: 'warning' },
  CONCLUIDA: { label: 'Concluída', tone: 'success' },
  ENCERRADA: { label: 'Encerrada', tone: 'neutral' },
  CANCELADA: { label: 'Cancelada', tone: 'neutral' },
  LOTADA: { label: 'Sem vagas', tone: 'neutral' },
  PRAZO_ENCERRADO: { label: 'Prazo encerrado', tone: 'neutral' },
}
function missionState(m: Mission, teacher: boolean) {
  if (!teacher && m.participants.length) return m.participants[0].status
  if (m.status !== 'DISPONIVEL') return m.status
  if (Date.parse(m.deadline) <= Date.now()) return 'PRAZO_ENCERRADO'
  return m.occupied >= m.capacity ? 'LOTADA' : 'DISPONIVEL'
}
function MissionStatus({ status }: { status: string }) {
  const state = states[status] || {
    label: status.replaceAll('_', ' '),
    tone: 'neutral' as const,
  }
  return <StatusBadge tone={state.tone}>{state.label}</StatusBadge>
}
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
    <article className="participation-detail activity-stack">
      <h3>
        {teacher ? (
          <Link className="text-link" to={`/perfis/${p.studentId}`}>
            {p.studentName}
          </Link>
        ) : (
          'Minha participação'
        )}
      </h3>
      <MissionStatus status={p.status} />
      {p.delivery && <p className="notification-body">Entrega: {p.delivery}</p>}
      {p.feedback && (
        <p className="notification-body">Avaliação: {p.feedback}</p>
      )}
      {enabled && (
        <form
          className="activity-stack"
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
  const [filter, setFilter] = useState('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
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
  const rows = query.data?.filter(
    (m) =>
      (!mine || m.participants.length > 0) &&
      (filter === 'all' || missionState(m, teacher) === filter),
  )
  const selected = query.data?.find((m) => m.id === selectedId)
  return (
    <div className="merit-page missions-page">
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
      <div className="mission-controls">
        {!teacher && (
          <div
            className="merit-filters"
            role="group"
            aria-label="Missões e participações"
          >
            <button
              className="merit-chip"
              aria-pressed={!mine}
              onClick={() => setMine(false)}
            >
              Todas as missões
            </button>
            <button
              className="merit-chip"
              aria-pressed={mine}
              onClick={() => setMine(true)}
            >
              Minhas participações
            </button>
          </div>
        )}
        <label className="mission-filter">
          Estado
          <Select
            aria-label="Estado"
            value={filter}
            onValueChange={(value) => setFilter(value)}
          >
            <option value="all">Todos os estados</option>
            {Object.entries(states)
              .filter(([key]) => teacher || !['CANCELADA'].includes(key))
              .map(([key, state]) => (
                <option value={key} key={key}>
                  {state.label}
                </option>
              ))}
          </Select>
        </label>
      </div>
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
      {rows && rows.length > 0 && (
        <section aria-label="Quadro de missões" className="mission-board">
          {rows.map((m) => (
            <button
              className={`card mission-tile mission-state-${missionState(m, teacher).toLowerCase()}`}
              key={m.id}
              onClick={() => setSelectedId(m.id)}
              aria-label={`Ver missão: ${m.title}`}
            >
              <span className="mission-tile-top">
                <Flag size={20} aria-hidden="true" />
                <MissionStatus status={missionState(m, teacher)} />
              </span>
              <h2>{m.title}</h2>
              <span className="mission-reward">
                <Coins size={20} aria-hidden="true" />
                <strong>{number(m.reward)}</strong>
                <span>moedas</span>
              </span>
              <span className="mission-tile-footer">
                <span>
                  <CalendarDays size={15} aria-hidden="true" />
                  {new Date(m.deadline).toLocaleDateString('pt-BR', {
                    timeZone: 'America/Sao_Paulo',
                    day: '2-digit',
                    month: 'short',
                  })}
                </span>
                <span>
                  Ver missão <ArrowUpRight size={16} aria-hidden="true" />
                </span>
              </span>
            </button>
          ))}
        </section>
      )}
      {selected && (
        <Modal
          title={selected.title}
          onClose={() => setSelectedId(null)}
          busy={accept.isPending || close.isPending}
        >
          <div className="mission-detail activity-stack">
            <div className="mission-detail-heading">
              <MissionStatus status={missionState(selected, teacher)} />
              <span className="mission-reward">
                <Coins size={20} aria-hidden="true" />
                <strong>{number(selected.reward)}</strong> moedas
              </span>
            </div>
            <p className="activity-copy">{selected.description}</p>
            <Panel className="mission-facts">
              <p>Professor: {selected.teacherName}</p>
              <p>
                <CalendarDays size={16} aria-hidden="true" /> Prazo:{' '}
                {dateTime(selected.deadline)}
              </p>
              <p>
                <Users size={16} aria-hidden="true" />{' '}
                {selected.capacity - selected.occupied} de {selected.capacity}{' '}
                vagas disponíveis
              </p>
              {teacher && <p>Reserva: {number(selected.reserved)} moedas</p>}
            </Panel>
            {teacher && selected.status === 'DISPONIVEL' && (
              <>
                <DeadlineForm mission={selected} />
                <Button
                  variant="secondary"
                  loading={close.isPending}
                  onClick={() => close.mutate(selected.id)}
                >
                  Encerrar missão
                </Button>
                <p className="small muted">
                  Entregas enviadas ou devolvidas continuam reservadas para
                  análise. Participações sem entrega serão canceladas.
                </p>
              </>
            )}
            {!teacher && selected.participants.length === 0 && (
              <Button
                loading={accept.isPending}
                disabled={missionState(selected, teacher) !== 'DISPONIVEL'}
                onClick={() => accept.mutate(selected.id)}
              >
                Aceitar missão
              </Button>
            )}
            {selected.participants.map((p) => (
              <ParticipationActions
                key={p.id}
                participation={p}
                teacher={teacher}
              />
            ))}
          </div>
        </Modal>
      )}
    </div>
  )
}
