import { FormSelect } from '@/shared/components/ui/Select'
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
import { gameApi } from './api'
import { useGameAction } from './hooks'
import type { Question } from './types'

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
        <FormSelect
          id="question-correct"
          control={form.control}
          name="correctIndex"
        >
          {[0, 1, 2, 3, 4, 5].map((n) => (
            <option key={n} value={n}>
              {n + 1}ª alternativa
            </option>
          ))}
        </FormSelect>
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
