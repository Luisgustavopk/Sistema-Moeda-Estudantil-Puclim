import { useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/hooks/auth-context'
import { useGameAction } from '@/features/gamificacao/hooks'
import { Button } from '@/shared/components/ui/Button'
import { Field } from '@/shared/components/ui/Field'
import { Select } from '@/shared/components/ui/Select'
import { EmptyState, QueryState } from '@/shared/components/ui/Feedback'
import { PageHeading } from '@/shared/components/ui/PageHeading'
import { DATA_MODE } from '@/shared/lib/http'
import { dateTime, number } from '@/shared/utils/format'
import {
  peerTransfersApi,
  type PeerGroup,
  type PeerOverview,
  type PeerRequest,
  type PeerTransferInput,
} from '../api/peer-transfers.api'
import './peer-transfers.css'

function CriteriaForm({ group }: { group: PeerGroup }) {
  const [criteria, setCriteria] = useState(group.criteria || '')
  const save = useGameAction(peerTransfersApi.policy, 'Critérios publicados.')
  return (
    <form
      className="card peer-stack"
      onSubmit={(event) => {
        event.preventDefault()
        save.mutate(criteria.trim())
      }}
    >
      <h2>Critérios do professor</h2>
      <Field
        id="peer-criteria"
        label="Critérios para aprovar transferências"
        hint="Cada solicitação guarda os critérios publicados no momento do envio."
      >
        <textarea
          id="peer-criteria"
          rows={4}
          required
          maxLength={2000}
          value={criteria}
          onChange={(event) => setCriteria(event.target.value)}
        />
      </Field>
      <Button
        type="submit"
        loading={save.isPending}
        disabled={!criteria.trim() || criteria.trim() === group.criteria}
      >
        Publicar critérios
      </Button>
    </form>
  )
}

function TeacherLinks({ data }: { data: PeerOverview }) {
  const group = data.groups[0]
  const [studentId, setStudentId] = useState('')
  const link = useGameAction(peerTransfersApi.link, 'Vínculo atualizado.', () =>
    setStudentId(''),
  )
  const linkedIds = new Set(group.students.map((student) => student.id))
  const available = data.availableStudents.filter(
    (student) => !linkedIds.has(student.id),
  )
  return (
    <section className="card peer-stack">
      <h2>Alunos vinculados</h2>
      <p className="muted">
        Vincule os alunos da sua instituição. Cada aluno pode estar vinculado a
        mais de um professor.
      </p>
      <form
        className="peer-link-form"
        onSubmit={(event) => {
          event.preventDefault()
          link.mutate({ studentId, active: true })
        }}
      >
        <Field id="peer-link" label="Aluno da instituição">
          <Select id="peer-link" value={studentId} onValueChange={setStudentId}>
            <option value="">Selecione um aluno</option>
            {available.map((student) => (
              <option key={student.id} value={student.id}>
                {student.name} · {student.course}
              </option>
            ))}
          </Select>
        </Field>
        <Button type="submit" loading={link.isPending} disabled={!studentId}>
          Vincular aluno
        </Button>
      </form>
      {!group.students.length && (
        <p className="muted">Nenhum aluno vinculado ainda.</p>
      )}
      <ul className="peer-members">
        {group.students.map((student) => {
          const pending = data.requests.some(
            (request) =>
              request.status === 'PENDENTE' &&
              [request.senderId, request.recipientId].includes(student.id),
          )
          return (
            <li key={student.id}>
              <div>
                <strong>{student.name}</strong>
                <p className="small muted">
                  {student.course}
                  {!student.active && ' · Conta desativada'}
                  {pending && ' · Há solicitações pendentes'}
                </p>
              </div>
              <Button
                variant="ghost"
                disabled={pending || link.isPending}
                aria-label={`Remover vínculo de ${student.name}`}
                onClick={() =>
                  link.mutate({ studentId: student.id, active: false })
                }
              >
                Remover vínculo
              </Button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function StudentRequestForm({ groups }: { groups: PeerGroup[] }) {
  const { user } = useAuth()
  const [teacherId, setTeacherId] = useState(
    groups.length === 1 ? groups[0].teacherId : '',
  )
  const [recipientId, setRecipientId] = useState('')
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [acceptedCriteria, setAcceptedCriteria] = useState<string | null>(null)
  const lastRequest = useRef<{ fingerprint: string; key: string } | null>(null)
  const request = useGameAction(
    peerTransfersApi.request,
    'Solicitação enviada ao professor.',
    () => {
      setRecipientId('')
      setAmount('')
      setReason('')
      setAcceptedCriteria(null)
      lastRequest.current = null
    },
  )
  const group = groups.find((item) => item.teacherId === teacherId)
  const recipients =
    group?.students.filter((student) => student.id !== user?.id) || []
  const valid =
    !!group?.criteria &&
    recipients.some((student) => student.id === recipientId) &&
    Number.isSafeInteger(Number(amount)) &&
    Number(amount) > 0 &&
    Number(amount) <= (user?.balance || 0) &&
    !!reason.trim() &&
    acceptedCriteria === group.criteria
  return (
    <form
      className="card peer-stack"
      onSubmit={(event) => {
        event.preventDefault()
        if (!valid) return
        const input: PeerTransferInput = {
          teacherId,
          recipientId,
          amount: Number(amount),
          reason: reason.trim(),
          criteria: group!.criteria!,
        }
        const fingerprint = JSON.stringify(input)
        if (lastRequest.current?.fingerprint !== fingerprint)
          lastRequest.current = { fingerprint, key: crypto.randomUUID() }
        request.mutate({ input, key: lastRequest.current.key })
      }}
    >
      <h2>Solicitar transferência</h2>
      <p>
        Saldo atual: <strong>{number(user?.balance || 0)} moedas</strong>. O
        saldo só muda após a aprovação. As moedas não ficam reservadas enquanto
        você aguarda.
      </p>
      <div className="form-grid">
        <Field id="peer-teacher" label="Professor responsável">
          <Select
            id="peer-teacher"
            value={teacherId}
            onValueChange={(value) => {
              setTeacherId(value)
              setRecipientId('')
              setAcceptedCriteria(null)
            }}
          >
            <option value="">Selecione um professor</option>
            {groups.map((item) => (
              <option key={item.teacherId} value={item.teacherId}>
                {item.teacherName}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          id="peer-recipient"
          label="Aluno que receberá"
          hint="Somente alunos vinculados ao mesmo professor."
        >
          <Select
            id="peer-recipient"
            value={recipientId}
            onValueChange={setRecipientId}
            disabled={!group}
          >
            <option value="">Selecione um aluno</option>
            {recipients.map((student) => (
              <option key={student.id} value={student.id}>
                {student.name} · {student.course}
              </option>
            ))}
          </Select>
        </Field>
        <Field id="peer-amount" label="Quantidade de moedas">
          <input
            id="peer-amount"
            type="number"
            required
            min={1}
            step={1}
            max={user?.balance || 0}
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
        </Field>
      </div>
      {group && (
        <div className="peer-criteria">
          <h3>Critérios de {group.teacherName}</h3>
          <p>
            {group.criteria ||
              'O professor ainda precisa publicar os critérios.'}
          </p>
        </div>
      )}
      <Field id="peer-reason" label="Motivo da transferência">
        <textarea
          id="peer-reason"
          required
          rows={3}
          maxLength={1000}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
      </Field>
      <label className="peer-consent">
        <input
          type="checkbox"
          checked={!!group?.criteria && acceptedCriteria === group.criteria}
          disabled={!group?.criteria}
          onChange={(event) =>
            setAcceptedCriteria(event.target.checked ? group!.criteria : null)
          }
        />
        Li os critérios e quero enviar a solicitação para análise.
      </label>
      <Button type="submit" disabled={!valid} loading={request.isPending}>
        Solicitar transferência
      </Button>
    </form>
  )
}

const statusLabels = {
  PENDENTE: 'Aguardando aprovação',
  APROVADA: 'Aprovada',
  REJEITADA: 'Rejeitada',
}
function RequestCard({
  request,
  teacher,
}: {
  request: PeerRequest
  teacher: boolean
}) {
  const [feedback, setFeedback] = useState('')
  const review = useGameAction(peerTransfersApi.review, 'Análise registrada.')
  return (
    <article className="card peer-stack">
      <div className="peer-request-heading">
        <h3>
          {request.senderName} → {request.recipientName}
        </h3>
        <span
          className={`peer-status peer-status-${request.status.toLowerCase()}`}
        >
          {statusLabels[request.status]}
        </span>
      </div>
      <p>
        <strong>{number(request.amount)} moedas</strong> · Professor:{' '}
        {request.teacherName}
      </p>
      <p className="small muted">
        Solicitada em {dateTime(request.createdAt)}
        {request.reviewedAt &&
          ` · Analisada em ${dateTime(request.reviewedAt)}`}
      </p>
      <p className="peer-copy">
        <strong>Motivo:</strong> {request.reason}
      </p>
      <details>
        <summary>Critérios desta solicitação</summary>
        <p className="peer-copy">{request.criteria}</p>
      </details>
      {request.feedback && (
        <p className="peer-copy">
          <strong>Parecer do professor:</strong> {request.feedback}
        </p>
      )}
      {teacher && request.status === 'PENDENTE' && (
        <form
          className="peer-stack"
          onSubmit={(event) => {
            event.preventDefault()
            review.mutate({
              id: request.id,
              approve: true,
              feedback: feedback.trim(),
            })
          }}
        >
          <Field
            id={`peer-feedback-${request.id}`}
            label="Parecer da análise"
            hint="Justifique a aprovação ou a rejeição com base nos critérios."
          >
            <textarea
              id={`peer-feedback-${request.id}`}
              required
              rows={2}
              maxLength={1000}
              value={feedback}
              onChange={(event) => setFeedback(event.target.value)}
            />
          </Field>
          <div className="peer-actions">
            <Button
              type="submit"
              loading={review.isPending}
              disabled={!feedback.trim()}
            >
              Aprovar transferência
            </Button>
            <Button
              variant="danger"
              loading={review.isPending}
              disabled={!feedback.trim()}
              onClick={() =>
                review.mutate({
                  id: request.id,
                  approve: false,
                  feedback: feedback.trim(),
                })
              }
            >
              Rejeitar transferência
            </Button>
          </div>
        </form>
      )}
    </article>
  )
}

export function PeerTransfersPage() {
  const { user } = useAuth()
  const teacher = user?.role === 'PROFESSOR'
  const [filter, setFilter] = useState('all')
  const query = useQuery({
    queryKey: ['peer-transfers', user?.id],
    queryFn: peerTransfersApi.overview,
    enabled: DATA_MODE === 'api',
    refetchInterval: 30000,
  })
  const data = query.data
  const requests = data?.requests.filter(
    (request) => filter === 'all' || request.status === filter,
  )
  return (
    <div className="peer-page peer-stack">
      <PageHeading
        title="Transferências entre alunos"
        description={
          teacher
            ? 'Defina critérios, gerencie os vínculos e analise as solicitações dos seus alunos.'
            : 'Envie moedas a outro aluno com a análise de um professor em comum.'
        }
      />
      {DATA_MODE === 'demo' ? (
        <EmptyState
          title="Disponível com a API conectada"
          description="Entre no ambiente integrado para gerenciar vínculos e transferências reais."
        />
      ) : (
        <>
          <QueryState
            loading={query.isLoading}
            error={query.error}
            retry={query.refetch}
          />
          {data && (
            <>
              {teacher ? (
                <div className="peer-settings">
                  <CriteriaForm
                    key={data.groups[0].teacherId}
                    group={data.groups[0]}
                  />
                  <TeacherLinks data={data} />
                </div>
              ) : data.groups.length ? (
                <StudentRequestForm groups={data.groups} />
              ) : (
                <EmptyState
                  title="Você ainda não está vinculado a um professor"
                  description="Peça a um professor da sua instituição que vincule seu cadastro. Os dois alunos precisam ter um professor em comum."
                />
              )}
              <div className="peer-request-heading">
                <h2>
                  {teacher
                    ? 'Solicitações para análise'
                    : 'Minhas solicitações e recebimentos'}
                </h2>
                <Select
                  aria-label="Filtrar solicitações"
                  value={filter}
                  onValueChange={setFilter}
                >
                  <option value="all">Todos os estados</option>
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              </div>
              {requests?.length === 0 && (
                <EmptyState
                  title="Nenhuma solicitação neste estado"
                  description="As transferências aparecerão aqui para acompanhamento."
                />
              )}
              {requests?.map((request) => (
                <RequestCard
                  key={request.id}
                  request={request}
                  teacher={teacher}
                />
              ))}
            </>
          )}
        </>
      )}
    </div>
  )
}
