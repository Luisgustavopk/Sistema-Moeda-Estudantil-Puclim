import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, CheckCircle2, Flame, XCircle } from 'lucide-react'
import { useAuth } from '@/features/auth/hooks/auth-context'
import { PageHeading } from '@/shared/components/ui/PageHeading'
import { Button } from '@/shared/components/ui/Button'
import { Modal } from '@/shared/components/ui/Modal'
import { QueryState } from '@/shared/components/ui/Feedback'
import { gameApi } from './api'
import { useGameAction } from './hooks'
import type { Quiz, QuizStatus } from './types'
import { UnsavedPrompt } from './components/UnsavedPrompt'
import { Panel } from '@/shared/components/ui/ActivitySurface'

import { QuizHistoryList } from './components/QuizHistoryList'
import { quizDate } from './quiz-date'
import { StreakFlame } from './components/StreakFlame'
import {
  primeConfirmation,
  celebrateSuccess,
} from '@/shared/lib/confirmation-sound'

function WeekCalendar({
  status,
  today,
}: {
  status: QuizStatus
  today: string
}) {
  const completed = new Set(
    [...status.history, ...(status.today ? [status.today] : [])]
      .filter((q) => q.completedAt)
      .map((q) => q.day),
  )
  const anchor = new Date(`${today}T12:00:00Z`)
  const dates = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(anchor)
    date.setUTCDate(date.getUTCDate() - 6 + i)
    return {
      day: date.toISOString().slice(0, 10),
      label: date.toLocaleDateString('pt-BR', {
        weekday: 'short',
        timeZone: 'UTC',
      }),
    }
  })
  return (
    <div className="quiz-week" aria-label="Conclusões dos últimos sete dias">
      {dates.map((date) => (
        <div
          key={date.day}
          className={completed.has(date.day) ? 'day-complete' : ''}
          aria-label={`${date.day}: ${completed.has(date.day) ? 'concluído' : 'sem conclusão registrada'}`}
        >
          <span>{date.label.replace('.', '')}</span>
          <span className="week-mark">
            {completed.has(date.day) ? (
              <Check size={18} />
            ) : (
              new Date(`${date.day}T12:00:00Z`).getUTCDate()
            )}
          </span>
        </div>
      ))}
    </div>
  )
}

function QuizSession({
  quiz,
  close,
  onResult,
}: {
  quiz: Quiz
  close: () => void
  onResult: (result: Quiz) => void
}) {
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<number[]>(
    quiz.items.map((q) => q.selectedIndex ?? -1),
  )
  const [leaving, setLeaving] = useState(false)
  const heading = useRef<HTMLHeadingElement>(null)
  const submit = useGameAction(
    (values: number[]) => gameApi.submitQuiz(quiz.id, values),
    'Quiz concluído! Seu progresso foi atualizado.',
    (completed) => {
      onResult(completed)
      celebrateSuccess('quiz', completed.id)
    },
  )
  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)')
    const surrounding = [
      ...document.querySelectorAll<HTMLElement>(
        '.sidebar, .topbar, .mobile-bottom-nav, .content-footer',
      ),
    ]
    const previous = surrounding.map((element) => element.inert)
    const update = () =>
      surrounding.forEach((element, index) => {
        element.inert = media.matches || previous[index]
      })
    update()
    media.addEventListener('change', update)
    return () => {
      media.removeEventListener('change', update)
      surrounding.forEach((element, index) => {
        element.inert = previous[index]
      })
    }
  }, [])
  useEffect(() => {
    heading.current?.focus()
  }, [index])
  const question = quiz.items[index]
  if (!question)
    return (
      <section className="card">
        <p>Nenhuma pergunta disponível nesta tentativa.</p>
        <Button onClick={close}>Voltar ao quiz</Button>
      </section>
    )
  return (
    <section className="quiz-session card" aria-label="Quiz em andamento">
      <UnsavedPrompt
        dirty={!submit.isSuccess && answers.some((a) => a >= 0)}
        message="As alternativas escolhidas ainda não foram enviadas. Você poderá retomar o quiz de hoje."
      />
      <div className="section-heading">
        <p aria-live="polite">
          Pergunta <strong>{index + 1}</strong> de {quiz.items.length}
        </p>
        <Button variant="ghost" onClick={() => setLeaving(true)}>
          Sair do quiz
        </Button>
      </div>
      <progress
        aria-label="Perguntas respondidas"
        max={quiz.items.length}
        value={answers.filter((a) => a >= 0).length}
      />
      <div className="quiz-workspace">
        <nav className="quiz-question-nav" aria-label="Perguntas do quiz">
          <span className="small muted">Sua tentativa</span>
          <div>
            {quiz.items.map((item, i) => (
              <button
                key={item.id}
                className="quiz-step"
                aria-current={i === index ? 'step' : undefined}
                aria-label={`Ir para pergunta ${i + 1}${answers[i] >= 0 ? ', respondida' : ', pendente'}`}
                data-answered={answers[i] >= 0}
                disabled={submit.isPending}
                onClick={() => setIndex(i)}
              >
                <span>{i + 1}</span>
                <span>Pergunta {i + 1}</span>
                {answers[i] >= 0 && <Check size={16} aria-hidden="true" />}
              </button>
            ))}
          </div>
          <p className="small muted">
            Você pode revisar suas escolhas antes de concluir.
          </p>
        </nav>
        <div className="quiz-question-body">
          <p className="small muted">{question.area}</p>
          <h2 ref={heading} tabIndex={-1}>
            {question.prompt}
          </h2>
          <fieldset
            className="quiz-options"
            onKeyDown={(event) => {
              const choice = Number(event.key) - 1
              if (
                /^[1-6]$/.test(event.key) &&
                choice < question.options.length
              ) {
                event.preventDefault()
                setAnswers((previous) =>
                  previous.map((value, i) => (i === index ? choice : value)),
                )
                document
                  .getElementById(`answer-${question.id}-${choice}`)
                  ?.focus()
              }
            }}
          >
            <legend className="sr-only">Escolha uma alternativa</legend>
            {question.options.map((option, i) => (
              <label
                key={i}
                className={`quiz-option ${answers[index] === i ? 'selected' : ''}`}
              >
                <input
                  id={`answer-${question.id}-${i}`}
                  type="radio"
                  name={`question-${question.id}`}
                  checked={answers[index] === i}
                  onChange={() =>
                    setAnswers((previous) =>
                      previous.map((value, n) => (n === index ? i : value)),
                    )
                  }
                />
                <span className="option-letter" aria-hidden="true">
                  {String.fromCharCode(65 + i)}
                </span>
                <span>{option}</span>
                {answers[index] === i && (
                  <CheckCircle2 size={20} aria-hidden="true" />
                )}
              </label>
            ))}
          </fieldset>
          <p className="small muted" aria-live="polite">
            {answers[index] >= 0
              ? 'Alternativa selecionada. O gabarito será liberado ao concluir.'
              : 'Escolha uma alternativa. Use as setas ou as teclas de 1 a 4.'}
          </p>
          <div className="form-actions">
            <Button
              variant="secondary"
              disabled={index === 0 || submit.isPending}
              onClick={() => setIndex(index - 1)}
            >
              Anterior
            </Button>
            {index < quiz.items.length - 1 ? (
              <Button
                disabled={answers[index] < 0}
                onClick={() => setIndex(index + 1)}
              >
                Próxima pergunta
              </Button>
            ) : (
              <Button
                disabled={answers.some((a) => a < 0)}
                loading={submit.isPending}
                onClick={() => {
                  primeConfirmation()
                  submit.mutate(answers)
                }}
              >
                Concluir quiz
              </Button>
            )}
          </div>
        </div>
      </div>
      {leaving && (
        <Modal title="Sair do quiz?" onClose={() => setLeaving(false)}>
          <p>
            As alternativas escolhidas ainda não foram enviadas. Você pode
            retomar o quiz de hoje e respondê-las novamente.
          </p>
          <div className="form-actions">
            <Button variant="secondary" onClick={() => setLeaving(false)}>
              Continuar quiz
            </Button>
            <Button onClick={close}>Sair do quiz</Button>
          </div>
        </Modal>
      )}
    </section>
  )
}

export function QuizResult({
  quiz,
  celebrate = false,
}: {
  quiz: Quiz
  celebrate?: boolean
}) {
  const { user } = useAuth()
  const payments = useQuery({
    queryKey: ['game', 'rewards', user?.id],
    queryFn: gameApi.rewards,
  })
  const linked =
    payments.data?.filter((p) => p.originOperationId === quiz.id) || []
  return (
    <section
      className={`card quiz-result ${celebrate ? 'merit-celebration' : ''}`}
    >
      {celebrate && quiz.streak > 0 && quiz.streak % 7 === 0 && (
        <p className="streak-milestone">
          <StreakFlame /> Um novo marco: {quiz.streak} dias de constância!
        </p>
      )}
      <div className="quiz-result-heading">
        <svg
          className="grade-ring"
          viewBox="0 0 120 120"
          role="img"
          aria-label={`Nota ${quiz.grade} de 10`}
        >
          <circle className="grade-track" cx="60" cy="60" r="50" />
          <circle
            className="grade-value"
            cx="60"
            cy="60"
            r="50"
            pathLength="100"
            strokeDasharray={`${Math.max(0, Math.min(100, quiz.grade * 10))} 100`}
          />
          <text x="60" y="58" textAnchor="middle">
            {quiz.grade.toLocaleString('pt-BR')}
          </text>
          <text className="grade-max" x="60" y="79" textAnchor="middle">
            de 10
          </text>
        </svg>
        <div>
          <h2>Seu desempenho</h2>
          <p>
            Nota {quiz.grade.toLocaleString('pt-BR')} / 10 · {quiz.correctCount}{' '}
            acertos · {quiz.errors} erros
          </p>
          <p className="streak-inline">
            <StreakFlame size={18} active={quiz.streak > 0} /> Streak de{' '}
            {quiz.streak} {quiz.streak === 1 ? 'dia' : 'dias'}
          </p>
        </div>
      </div>
      <h3>Revise e continue aprendendo</h3>
      {quiz.items.map((q, i) => {
        const correct =
          q.selectedIndex !== null &&
          q.correctIndex !== null &&
          q.selectedIndex === q.correctIndex
        return (
          <article
            className={`quiz-review ${correct ? 'correct' : 'incorrect'}`}
            key={q.id}
          >
            <p className="review-status">
              {correct ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
              {correct ? 'Resposta correta' : 'Vamos revisar'}
            </p>
            <h3>
              {i + 1}. {q.prompt}
            </h3>
            <p>
              Sua resposta:{' '}
              {q.selectedIndex === null
                ? 'Não informada'
                : q.options[q.selectedIndex]}
            </p>
            <p>
              Gabarito:{' '}
              {q.correctIndex === null
                ? 'Não disponível'
                : q.options[q.correctIndex]}
            </p>
            {q.selectedIndex !== q.correctIndex && q.correctIndex !== null && (
              <p className="small muted">
                Compare sua escolha com a alternativa correta e retome esse tema
                nos seus estudos.
              </p>
            )}
          </article>
        )
      })}
      <h3>Moedas e bônus</h3>
      <QueryState
        loading={payments.isLoading}
        error={payments.error}
        retry={payments.refetch}
      />
      {linked.map((payment) => (
        <p key={payment.id}>
          {payment.kind} · {payment.amount} moedas ·{' '}
          {payment.status === 'PAGO' ? 'Pago' : 'Aguardando pagamento'}
        </p>
      ))}
      {payments.data && !linked.length && (
        <p className="muted">
          Nenhum pagamento vinculado a este quiz foi informado.
        </p>
      )}
      <p className="small muted">
        Bônus sobre recebimentos posteriores aparecem como lançamentos separados
        no extrato.
      </p>
    </section>
  )
}

export function QuizPage() {
  const { user } = useAuth()
  const client = useQueryClient()
  const [paused, setPaused] = useState(false)
  const [result, setResult] = useState<Quiz | null>(null)
  const [historyResult, setHistoryResult] = useState<Quiz | null>(null)
  const resultSummary = useRef<HTMLDivElement>(null)
  const hadResult = useRef(false)
  useEffect(() => {
    if (result) hadResult.current = true
    else if (hadResult.current) {
      resultSummary.current?.focus()
      hadResult.current = false
    }
  }, [result])
  const query = useQuery({
    queryKey: ['game', 'quizzes', user?.id],
    queryFn: gameApi.quizzes,
    refetchInterval: 60000,
  })
  const context = useQuery({
    queryKey: ['game', 'context', user?.id],
    queryFn: gameApi.context,
  })
  const start = useGameAction(
    () => gameApi.startQuiz(),
    'Quiz disponível. Bom estudo!',
  )
  const status = query.data
  const history = status?.history.filter((q) => q.id !== status.today?.id) || []
  const active = status?.today && !status.today.completedAt && !paused
  return (
    <div className={`merit-page quiz-page ${active ? 'quiz-active' : ''}`}>
      <PageHeading
        title="Quiz diário"
        description="Um momento para aprender. Um passo na sua trajetória."
      />
      <QueryState
        loading={query.isLoading}
        error={query.error}
        retry={query.refetch}
      />
      {status && (
        <>
          {!active && (
            <div className="quiz-home-grid">
              <section className="card quiz-intro">
                <div className="section-heading">
                  <h2>
                    {status.today?.completedAt
                      ? 'Seu estudo de hoje está concluído'
                      : 'Seu próximo momento de descoberta'}
                  </h2>
                  <Flame size={24} className="muted" />
                </div>
                <p className="quiz-intro-lead">
                  Um novo desafio de conhecimento, todos os dias.
                </p>
                <div className="quiz-ritual">
                  <span>
                    <CheckCircle2 size={20} aria-hidden="true" />
                    Uma tentativa por dia
                  </span>
                  <span>
                    <CheckCircle2 size={20} aria-hidden="true" />
                    No seu tempo
                  </span>
                  <span>
                    <CheckCircle2 size={20} aria-hidden="true" />
                    Revisão ao concluir
                  </span>
                </div>
                <p className="small muted">
                  Um quiz por dia. As recompensas são confirmadas pelo sistema.
                  O valor será informado quando estiver disponível.
                </p>
                {status.today?.completedAt ? (
                  <p className="notice notice-info">
                    Quiz de hoje concluído. Próximo quiz disponível em{' '}
                    {new Intl.DateTimeFormat('pt-BR', {
                      dateStyle: 'short',
                      timeStyle: 'short',
                      timeZone: 'America/Sao_Paulo',
                    }).format(new Date(status.nextAvailable))}{' '}
                    (horário de Brasília).
                  </p>
                ) : status.today ? (
                  <Button onClick={() => setPaused(false)}>
                    Retomar quiz de hoje
                  </Button>
                ) : (
                  <Button
                    loading={start.isPending}
                    onClick={() => start.mutate(undefined)}
                  >
                    Iniciar quiz de hoje
                  </Button>
                )}
              </section>
              <Panel className="quiz-consistency">
                <div className="section-heading">
                  <h2>Sua constância</h2>
                </div>
                <p className="streak-number">
                  <StreakFlame size={48} active={status.streak > 0} />
                  <strong>{status.streak}</strong>
                  <span>dias de streak</span>
                </p>
                <p className="small muted">
                  Melhor sequência: {status.bestStreak} dias
                </p>
                {context.data && (
                  <WeekCalendar status={status} today={context.data.today} />
                )}
                <QueryState
                  loading={context.isLoading}
                  error={context.error}
                  retry={context.refetch}
                />
                <div>
                  <p>{status.daysToReward} dias para a próxima recompensa.</p>
                  <progress
                    aria-label="Ciclo de constância de sete dias"
                    max={7}
                    value={7 - status.daysToReward}
                  />
                </div>
              </Panel>
            </div>
          )}
          {active && status.today && (
            <QuizSession
              key={status.today.id}
              quiz={status.today}
              close={() => setPaused(true)}
              onResult={(completed) => {
                client.setQueryData<QuizStatus>(
                  ['game', 'quizzes', user?.id],
                  (current) =>
                    current ? { ...current, today: completed } : current,
                )
                setResult(completed)
              }}
            />
          )}
          {status.today?.completedAt && !result && (
            <div ref={resultSummary} tabIndex={-1}>
              <QuizResult quiz={status.today} />
            </div>
          )}
          {result && (
            <Modal
              size="wide"
              title="Quiz concluído"
              onClose={() => setResult(null)}
            >
              <QuizResult quiz={result} celebrate />
              <Button variant="secondary" onClick={() => setResult(null)}>
                Fechar resultado
              </Button>
            </Modal>
          )}
          {!active && (
            <Panel className="quiz-history">
              <div className="section-heading">
                <h2>Resultados recentes</h2>
                <Link className="text-link" to="/aluno/quiz/historico">
                  Ver histórico completo
                </Link>
              </div>
              {!history.length && <p>Seu primeiro resultado aparecerá aqui.</p>}
              <QuizHistoryList
                quizzes={[...history]
                  .sort((a, b) => b.day.localeCompare(a.day))
                  .slice(0, 3)}
                onSelect={setHistoryResult}
                grouped={false}
              />
            </Panel>
          )}
          {historyResult && (
            <Modal
              size="wide"
              title={`Resultado de ${quizDate(historyResult.day)}`}
              onClose={() => setHistoryResult(null)}
            >
              <QuizResult quiz={historyResult} />
            </Modal>
          )}
        </>
      )}
    </div>
  )
}
