import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAuth } from '@/features/auth/hooks/auth-context'
import { PageHeading } from '@/shared/components/ui/PageHeading'
import { Field } from '@/shared/components/ui/Field'
import { Button } from '@/shared/components/ui/Button'
import { QueryState, EmptyState } from '@/shared/components/ui/Feedback'
import { dateTime } from '@/shared/utils/format'
import { gameApi } from './api'
import { useGameAction } from './hooks'
import type { Question, Quiz } from './types'

const questionSchema = z
  .object({
    prompt: z.string().trim().min(1, 'Informe o enunciado.').max(2000),
    area: z.string().trim().min(1, 'Informe a disciplina.').max(100),
    optionsText: z
      .string()
      .trim()
      .refine(
        (v) =>
          v.split('\n').length >= 2 &&
          v.split('\n').length <= 6 &&
          v.split('\n').every((s) => s.trim().length > 0 && s.length <= 500),
        'Informe de 2 a 6 alternativas, uma por linha.',
      ),
    correctIndex: z.number().int().min(0).max(5),
    active: z.boolean(),
  })
  .refine((v) => v.correctIndex < v.optionsText.trim().split('\n').length, {
    message: 'Selecione uma alternativa existente.',
    path: ['correctIndex'],
  })
type QuestionFormData = z.infer<typeof questionSchema>
function QuestionForm({
  question,
  done,
}: {
  question?: Question
  done: () => void
}) {
  const form = useForm<QuestionFormData>({
    resolver: zodResolver(questionSchema),
    defaultValues: question
      ? { ...question, optionsText: question.options.join('\n') }
      : {
          prompt: '',
          area: '',
          optionsText: '',
          correctIndex: 0,
          active: true,
        },
  })
  const save = useGameAction(
    (data: QuestionFormData) =>
      gameApi.saveQuestion(
        {
          prompt: data.prompt,
          area: data.area,
          options: data.optionsText
            .trim()
            .split('\n')
            .map((s) => s.trim()),
          correctIndex: data.correctIndex,
          active: data.active,
        },
        question?.id,
      ),
    'Pergunta salva.',
  )
  return (
    <form
      className="card"
      onSubmit={form.handleSubmit((data) =>
        save.mutate(data, { onSuccess: done }),
      )}
    >
      <h2>{question ? 'Editar pergunta' : 'Nova pergunta'}</h2>
      <Field
        id="question-prompt"
        label="Enunciado"
        error={form.formState.errors.prompt?.message}
      >
        <textarea id="question-prompt" {...form.register('prompt')} />
      </Field>
      <Field
        id="question-area"
        label="Disciplina ou área"
        error={form.formState.errors.area?.message}
      >
        <input id="question-area" {...form.register('area')} />
      </Field>
      <Field
        id="question-options"
        label="Alternativas, uma por linha"
        error={form.formState.errors.optionsText?.message}
      >
        <textarea
          id="question-options"
          rows={6}
          {...form.register('optionsText')}
        />
      </Field>
      <Field
        id="question-correct"
        label="Alternativa correta"
        error={form.formState.errors.correctIndex?.message}
      >
        <select
          id="question-correct"
          {...form.register('correctIndex', { valueAsNumber: true })}
        >
          {[0, 1, 2, 3, 4, 5].map((n) => (
            <option key={n} value={n}>
              {n + 1}ª alternativa
            </option>
          ))}
        </select>
      </Field>
      <label>
        <input type="checkbox" {...form.register('active')} /> Pergunta ativa
      </label>
      <div className="toolbar">
        <Button type="submit" loading={save.isPending}>
          Salvar pergunta
        </Button>
        <Button variant="secondary" onClick={done}>
          Cancelar edição
        </Button>
      </div>
    </form>
  )
}
export function QuestionsPage() {
  const { user } = useAuth()
  const [editing, setEditing] = useState<Question | 'new' | null>(null)
  const query = useQuery({
    queryKey: ['game', 'questions', user?.id],
    queryFn: gameApi.questions,
  })
  const remove = useGameAction(
    gameApi.deleteQuestion,
    'Pergunta desativada. Quizzes anteriores foram preservados.',
  )
  return (
    <>
      <PageHeading
        title="Banco de perguntas"
        description="Gerencie as perguntas da sua disciplina."
        action={
          <Button onClick={() => setEditing('new')}>Nova pergunta</Button>
        }
      />
      <QueryState
        loading={query.isLoading}
        error={query.error}
        retry={query.refetch}
      />
      {editing && (
        <QuestionForm
          key={editing === 'new' ? 'new' : editing.id}
          question={editing === 'new' ? undefined : editing}
          done={() => setEditing(null)}
        />
      )}
      {query.data?.length === 0 && (
        <EmptyState
          title="Nenhuma pergunta cadastrada"
          description="Cadastre perguntas para disponibilizar o quiz diário aos seus alunos."
        />
      )}
      {query.data?.map((q) => (
        <article className="card" key={q.id}>
          <h2>{q.prompt}</h2>
          <p>
            {q.area} · {q.active ? 'Ativa' : 'Inativa'}
          </p>
          <ol>
            {q.options.map((option, i) => (
              <li key={i}>
                {option} {i === q.correctIndex && <strong>· Correta</strong>}
              </li>
            ))}
          </ol>
          <div className="toolbar">
            <Button variant="secondary" onClick={() => setEditing(q)}>
              Editar pergunta
            </Button>
            <Button
              variant="ghost"
              disabled={!q.active}
              loading={remove.isPending}
              onClick={() => remove.mutate(q.id)}
            >
              Desativar pergunta
            </Button>
          </div>
        </article>
      ))}
    </>
  )
}
const answerSchema = z.object({
  answers: z.array(
    z.number().int().min(0, 'Responda todas as perguntas.').max(5),
  ),
})
function QuizForm({ quiz }: { quiz: Quiz }) {
  const form = useForm<z.infer<typeof answerSchema>>({
    resolver: zodResolver(answerSchema),
    defaultValues: { answers: quiz.items.map(() => -1) },
  })
  const submit = useGameAction(
    (answers: number[]) => gameApi.submitQuiz(quiz.id, answers),
    'Quiz concluído! Seu progresso foi atualizado.',
  )
  const answers = useWatch({ control: form.control, name: 'answers' })
  return (
    <form
      onSubmit={form.handleSubmit((values) => submit.mutate(values.answers))}
    >
      {quiz.items.map((q, i) => (
        <fieldset className="card" key={q.id}>
          <legend>
            {i + 1}. {q.prompt}
          </legend>
          <p>{q.area}</p>
          {q.options.map((option, j) => (
            <label className="row" key={j}>
              <input
                type="radio"
                value={j}
                checked={answers[i] === j}
                onChange={() =>
                  form.setValue(`answers.${i}`, j, { shouldValidate: true })
                }
                name={`question-${q.id}`}
              />
              {option}
            </label>
          ))}
          {form.formState.errors.answers?.[i] && (
            <p role="alert" className="field-error">
              Selecione uma resposta.
            </p>
          )}
        </fieldset>
      ))}
      <Button type="submit" loading={submit.isPending}>
        Concluir quiz
      </Button>
    </form>
  )
}
function QuizResult({ quiz }: { quiz: Quiz }) {
  return (
    <section className="card">
      <h2>Resultado de {quiz.day}</h2>
      <p>
        Nota {quiz.grade.toLocaleString('pt-BR')} / 10 · {quiz.correctCount}{' '}
        acertos · {quiz.errors} erros · Streak de {quiz.streak} dias
      </p>
      {quiz.items.map((q) => (
        <article className="row" key={q.id}>
          <div>
            <h3>{q.prompt}</h3>
            <p>
              Sua resposta:{' '}
              {q.selectedIndex === null ? '—' : q.options[q.selectedIndex]}
            </p>
            <p>
              Gabarito:{' '}
              {q.correctIndex === null ? '—' : q.options[q.correctIndex]}
            </p>
          </div>
        </article>
      ))}
    </section>
  )
}
export function QuizPage() {
  const { user } = useAuth()
  const query = useQuery({
    queryKey: ['game', 'quizzes', user?.id],
    queryFn: gameApi.quizzes,
    refetchInterval: 60000,
  })
  const start = useGameAction(
    () => gameApi.startQuiz(),
    'Quiz disponível. Bom estudo!',
  )
  return (
    <>
      <PageHeading
        title="Quiz diário"
        description="Conclua o quiz para manter sua sequência de dias."
      />
      <QueryState
        loading={query.isLoading}
        error={query.error}
        retry={query.refetch}
      />
      {query.data && (
        <>
          <section className="card">
            <h2>{query.data.streak} dias de streak</h2>
            <p>
              Melhor sequência: {query.data.bestStreak} dias ·{' '}
              {query.data.daysToReward} dias para a próxima recompensa.
            </p>
            {query.data.today?.completedAt && (
              <p>
                Quiz de hoje concluído. Próximo quiz disponível em{' '}
                {dateTime(query.data.nextAvailable)}.
              </p>
            )}
          </section>
          {!query.data.today && (
            <Button loading={start.isPending} onClick={() => start.mutate()}>
              Iniciar quiz de hoje
            </Button>
          )}
          {query.data.today && !query.data.today.completedAt && (
            <QuizForm key={query.data.today.id} quiz={query.data.today} />
          )}
          {query.data.today?.completedAt && (
            <QuizResult quiz={query.data.today} />
          )}
          <section className="card">
            <h2>Histórico de quizzes</h2>
            {query.data.history.length === 0 && (
              <p>Seu primeiro resultado aparecerá aqui.</p>
            )}
            {query.data.history.map((q) => (
              <details key={q.id}>
                <summary>
                  {q.day} · Nota {q.grade} · {q.correctCount} acertos
                </summary>
                <QuizResult quiz={q} />
              </details>
            ))}
          </section>
        </>
      )}
    </>
  )
}
