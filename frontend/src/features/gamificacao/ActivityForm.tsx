import { useForm } from 'react-hook-form'
import { useRef } from 'react'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Field } from '@/shared/components/ui/Field'
import { Button } from '@/shared/components/ui/Button'
import { useGameAction } from './hooks'
import { gameApi } from './api'
import type { Challenge } from './types'

const schema = z.object({
  title: z.string().trim().min(1, 'Informe o título.').max(100),
  description: z.string().trim().min(1, 'Descreva a atividade.').max(2000),
  reward: z.number().int().min(1).max(1000000),
  capacity: z.number().int().min(1).max(1000),
  deadline: z
    .string()
    .min(1, 'Informe o prazo.')
    .refine((v) => Number.isFinite(Date.parse(v)), 'Data inválida.'),
  budget: z.number().int().min(1).max(1000000000).optional(),
})
type Values = z.infer<typeof schema>
function localDateTime(value?: string) {
  if (!value) return ''
  const d = new Date(value)
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16)
}
export function ActivityForm({
  challenge,
  sponsored = false,
  done,
}: {
  challenge?: Challenge
  sponsored?: boolean
  done: () => void
}) {
  const key = useRef(crypto.randomUUID())
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: challenge
      ? { ...challenge, deadline: localDateTime(challenge.deadline) }
      : {
          title: '',
          description: '',
          reward: 1,
          capacity: 1,
          deadline: '',
          ...(sponsored ? { budget: 1 } : {}),
        },
  })
  const action = useGameAction(
    async (values: Values) => {
      const input = {
        ...values,
        deadline: new Date(values.deadline).toISOString(),
      }
      return sponsored
        ? gameApi.saveChallenge(
            { ...input, budget: values.budget! },
            challenge?.id,
          )
        : gameApi.createMission(input, key.current)
    },
    sponsored ? 'Proposta salva.' : 'Missão publicada com reserva financeira.',
  )
  return (
    <form
      className="card"
      onSubmit={form.handleSubmit((values) =>
        action.mutate(values, { onSuccess: done }),
      )}
    >
      <h2>{sponsored ? 'Proposta de desafio' : 'Criar missão'}</h2>
      <Field
        id="activity-title"
        label="Título"
        error={form.formState.errors.title?.message}
      >
        <input id="activity-title" {...form.register('title')} />
      </Field>
      <Field
        id="activity-description"
        label="Descrição"
        error={form.formState.errors.description?.message}
      >
        <textarea id="activity-description" {...form.register('description')} />
      </Field>
      <div className="form-grid">
        <Field
          id="activity-reward"
          label="Recompensa em moedas"
          error={form.formState.errors.reward?.message}
        >
          <input
            id="activity-reward"
            type="number"
            {...form.register('reward', { valueAsNumber: true })}
          />
        </Field>
        <Field
          id="activity-capacity"
          label="Quantidade de vagas"
          error={form.formState.errors.capacity?.message}
        >
          <input
            id="activity-capacity"
            type="number"
            {...form.register('capacity', { valueAsNumber: true })}
          />
        </Field>
      </div>
      <Field
        id="activity-deadline"
        label="Prazo de encerramento"
        error={form.formState.errors.deadline?.message}
      >
        <input
          id="activity-deadline"
          type="datetime-local"
          {...form.register('deadline')}
        />
      </Field>
      {sponsored && (
        <Field
          id="activity-budget"
          label="Orçamento proposto"
          error={form.formState.errors.budget?.message}
        >
          <input
            id="activity-budget"
            type="number"
            {...form.register('budget', { valueAsNumber: true })}
          />
        </Field>
      )}
      {!sponsored && (
        <p className="notice notice-info">
          Ao publicar, o valor de recompensa × vagas será retirado do saldo
          disponível e reservado para esta missão.
        </p>
      )}
      <div className="toolbar">
        <Button type="submit" loading={action.isPending}>
          {sponsored ? 'Salvar proposta' : 'Publicar missão'}
        </Button>
        <Button variant="secondary" onClick={done}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
