import { Select } from '@/shared/components/ui/Select'
import { useState } from 'react'
import { Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/hooks/auth-context'
import { PageHeading } from '@/shared/components/ui/PageHeading'
import { Panel } from '@/shared/components/ui/ActivitySurface'
import { QueryState } from '@/shared/components/ui/Feedback'
import { Modal } from '@/shared/components/ui/Modal'
import { Pagination } from '@/shared/components/ui/Pagination'
import { usePagination } from '@/shared/hooks/use-pagination'
import { gameApi } from './api'
import type { Quiz } from './types'
import { QuizResult } from './QuizStudentPage'
import { QuizHistoryList } from './components/QuizHistoryList'
import { quizDate } from './quiz-date'

export function QuizHistoryPage() {
  const { user } = useAuth()
  const query = useQuery({
    queryKey: ['game', 'quizzes', user?.id],
    queryFn: gameApi.quizzes,
  })
  const [month, setMonth] = useState('all')
  const [selected, setSelected] = useState<Quiz | null>(null)
  // The API may include today's completed attempt both as `today` and in `history`.
  const all = [
    ...new Map(
      [
        ...(query.data?.history || []),
        ...(query.data?.today?.completedAt ? [query.data.today] : []),
      ]
        .filter((q) => q.completedAt)
        .map((q) => [q.id, q]),
    ).values(),
  ].sort((a, b) => b.day.localeCompare(a.day))
  const months = [...new Set(all.map((q) => q.day.slice(0, 7)))]
  const filtered = all.filter((q) => month === 'all' || q.day.startsWith(month))
  const pagination = usePagination(filtered, 12)
  const questions = filtered.reduce((total, q) => total + q.items.length, 0)
  const correct = filtered.reduce((total, q) => total + q.correctCount, 0)
  const perfect = filtered.filter(
    (q) => q.items.length > 0 && q.correctCount === q.items.length,
  ).length
  return (
    <div className="merit-page quiz-history-page">
      <PageHeading
        title="Histórico de quizzes"
        description="Revisite seus resultados e acompanhe o que aprendeu."
        action={
          <Link className="button button-secondary" to="/aluno/quiz">
            Voltar ao quiz diário
          </Link>
        }
      />
      <QueryState
        loading={query.isLoading}
        error={query.error}
        retry={query.refetch}
      />
      {query.data && (
        <>
          <label className="history-month-filter">
            Período
            <Select
              aria-label="Período do histórico"
              value={month}
              onValueChange={(value) => {
                setMonth(value)
                pagination.setPage(1)
              }}
            >
              <option value="all">Todo o histórico</option>
              {months.map((m) => (
                <option value={m} key={m}>
                  {quizDate(`${m}-01`, { month: 'long', year: 'numeric' })}
                </option>
              ))}
            </Select>
          </label>
          <Panel className="quiz-history-stats" label="Estatísticas do período">
            <div>
              <span>Quizzes concluídos</span>
              <strong>{filtered.length}</strong>
            </div>
            <div>
              <span>Aproveitamento</span>
              <strong>
                {questions
                  ? `${Math.round((correct / questions) * 100)}%`
                  : '—'}
              </strong>
              <small>
                {correct} de {questions} respostas corretas
              </small>
            </div>
            <div>
              <span>Resultados perfeitos</span>
              <strong>{perfect}</strong>
            </div>
          </Panel>
          <Panel className="quiz-history">
            <h2>Resultados por dia</h2>
            {!filtered.length && (
              <p className="activity-empty">
                Nenhum quiz concluído neste período.
              </p>
            )}
            <QuizHistoryList
              quizzes={pagination.items}
              onSelect={setSelected}
            />
            <Pagination
              page={pagination.page}
              total={filtered.length}
              size={12}
              onChange={pagination.setPage}
              label="Páginas do histórico de quizzes"
            />
          </Panel>
        </>
      )}
      {selected && (
        <Modal
          size="wide"
          title={`Resultado de ${quizDate(selected.day)}`}
          onClose={() => setSelected(null)}
        >
          <QuizResult quiz={selected} />
        </Modal>
      )}
    </div>
  )
}
