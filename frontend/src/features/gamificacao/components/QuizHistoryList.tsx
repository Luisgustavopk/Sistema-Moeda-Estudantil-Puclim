import { Flame } from 'lucide-react'
import { ListItem, StatusBadge } from '@/shared/components/ui/ActivitySurface'
import { Button } from '@/shared/components/ui/Button'
import type { Quiz } from '../types'

import { quizDate } from '../quiz-date'

export function QuizHistoryList({
  quizzes,
  onSelect,
  grouped = true,
}: {
  quizzes: Quiz[]
  onSelect: (quiz: Quiz) => void
  grouped?: boolean
}) {
  const groups = new Map<string, Quiz[]>()
  for (const q of quizzes) {
    const key = grouped ? q.day.slice(0, 7) : 'recent'
    groups.set(key, [...(groups.get(key) || []), q])
  }
  return (
    <>
      {[...groups].map(([month, rows]) => (
        <section className="quiz-history-month" key={month}>
          {grouped && (
            <h3>
              {quizDate(`${month}-01`, { month: 'long', year: 'numeric' })}
            </h3>
          )}
          <div className="activity-list">
            {rows.map((q) => (
              <ListItem className="quiz-history-day" key={q.id}>
                <time className="quiz-history-date" dateTime={q.day}>
                  <strong>{quizDate(q.day, { day: '2-digit' })}</strong>
                  <span>{quizDate(q.day, { month: 'short' })}</span>
                </time>
                <div className="quiz-history-score">
                  <strong>
                    {q.correctCount}/{q.items.length} acertos
                  </strong>
                  <span className="small muted">
                    Nota {q.grade.toLocaleString('pt-BR')} de 10
                  </span>
                  <span className="quiz-score-marks" aria-hidden="true">
                    {q.items.map((item) => (
                      <i
                        key={item.id}
                        className={
                          item.selectedIndex === item.correctIndex
                            ? 'is-correct'
                            : ''
                        }
                      />
                    ))}
                  </span>
                </div>
                <StatusBadge tone="info">
                  <Flame size={14} aria-hidden="true" />
                  {q.streak} {q.streak === 1 ? 'dia' : 'dias'}
                </StatusBadge>
                <Button
                  variant="secondary"
                  onClick={() => onSelect(q)}
                  aria-label={`Ver resultado de ${quizDate(q.day)}`}
                >
                  Ver resultado
                </Button>
              </ListItem>
            ))}
          </div>
        </section>
      ))}
    </>
  )
}
