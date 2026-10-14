import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Search,
  Send,
  ShieldCheck,
} from 'lucide-react'
import { useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { z } from 'zod'
import { Link } from 'react-router'
import { transferSchema } from '../schemas/transferencia.schema'
import { moedasApi } from '../api/moedas.api'
import { alunosApi } from '@/features/alunos/api/alunos.api'
import { useAuth } from '@/features/auth/hooks/auth-context'
import { BalanceCard } from '../components/BalanceCard'
import { PageHeading } from '@/shared/components/ui/PageHeading'
import { Avatar } from '@/shared/components/ui/Avatar'
import { Button } from '@/shared/components/ui/Button'
import { Field } from '@/shared/components/ui/Field'
import {
  ErrorNotice,
  EmptyState,
  QueryState,
} from '@/shared/components/ui/Feedback'
import { useAction } from '@/shared/hooks/use-action'
import { number } from '@/shared/utils/format'
import { DATA_MODE } from '@/shared/lib/http'

type Values = z.infer<typeof transferSchema>
export function TransferPage() {
  const { user } = useAuth()
  const [step, setStep] = useState(1)
  const [search, setSearch] = useState('')
  const [completed, setCompleted] = useState(false)
  const lock = useRef(false)
  const request = useRef({ fingerprint: '', key: crypto.randomUUID() })
  const students = useQuery({
    queryKey: ['students', user?.id],
    queryFn: alunosApi.list,
  })
  const form = useForm<Values>({
    resolver: zodResolver(transferSchema),
    defaultValues: { studentId: '', amount: 50, reason: '' },
  })
  const values = useWatch({ control: form.control }) as Values
  const selected = students.data?.find(
    (student) => student.id === values.studentId,
  )
  const action = useAction((data: Values) => {
    const fingerprint = JSON.stringify(data)
    if (request.current.fingerprint !== fingerprint)
      request.current = { fingerprint, key: crypto.randomUUID() }
    return moedasApi.transfer(
      data.studentId,
      data.amount,
      data.reason,
      request.current.key,
    )
  })
  const filtered =
    students.data?.filter((student) =>
      `${student.name} ${student.course}`
        .toLocaleLowerCase('pt-BR')
        .includes(search.toLocaleLowerCase('pt-BR')),
    ) || []
  const onSubmit = async (data: Values) => {
    if (data.amount > (user?.balance || 0)) {
      form.setError('amount', {
        message: 'A quantidade excede seu saldo disponível.',
      })
      setStep(2)
      return
    }
    if (step === 2) {
      setStep(3)
      return
    }
    if (lock.current) return
    lock.current = true
    try {
      await action.mutateAsync(data)
      setCompleted(true)
    } catch {
      /* O erro é exibido abaixo. */
    } finally {
      lock.current = false
    }
  }
  return (
    <>
      <PageHeading
        eyebrow="Um gesto que faz a diferença"
        title="Reconheça uma boa atitude."
        description="Escolha um aluno e conte por que o esforço dele merece ser valorizado."
      />
      <div className="transfer-layout">
        <section className="card">
          {completed ? (
            <>
              <div className="check-hero">
                <span className="check-icon">
                  <CheckCircle2 size={35} />
                </span>
                <h2>Reconhecimento enviado!</h2>
                <p>
                  {selected?.name} recebeu {number(values.amount)} Pucoins.
                </p>
              </div>
              <div className="summary-box">
                <strong>Seu motivo de reconhecimento</strong>
                <p className="muted small">{values.reason}</p>
              </div>
              <p className="notice notice-info">
                {DATA_MODE === 'demo'
                  ? 'Movimentação registrada. O aviso por e-mail foi simulado no espaço do aluno.'
                  : 'Movimentação registrada. O aluno será notificado pelo sistema.'}
              </p>
              <div className="form-actions">
                <Link
                  className="button button-secondary"
                  to="/professor/extrato"
                >
                  Ver meu extrato
                </Link>
                <Button
                  onClick={() => {
                    setCompleted(false)
                    setStep(1)
                    form.reset()
                    request.current = {
                      fingerprint: '',
                      key: crypto.randomUUID(),
                    }
                    action.reset()
                  }}
                >
                  Novo reconhecimento
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="stepper">
                {['Escolha o aluno', 'Reconhecimento', 'Revise e envie'].map(
                  (label, index) => (
                    <div
                      key={label}
                      className={`step ${step >= index + 1 ? 'active' : ''}`}
                      aria-current={step === index + 1 ? 'step' : undefined}
                    >
                      <span>
                        {step > index + 1 ? <Check size={14} /> : index + 1}
                      </span>
                      {label}
                    </div>
                  ),
                )}
              </div>
              <form
                noValidate
                onSubmit={(event) => {
                  void form.handleSubmit(onSubmit)(event)
                }}
              >
                {step === 1 && (
                  <>
                    <div className="search-field" style={{ marginBottom: 20 }}>
                      <Search size={19} />
                      <input
                        aria-label="Buscar aluno"
                        placeholder="Busque pelo nome ou curso"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                      />
                    </div>
                    <QueryState
                      loading={students.isLoading}
                      error={students.error}
                      retry={students.refetch}
                    />
                    <div className="student-choice-list">
                      {filtered.map((student) => (
                        <button
                          type="button"
                          key={student.id}
                          aria-pressed={student.id === values.studentId}
                          className={`student-choice ${student.id === values.studentId ? 'selected' : ''}`}
                          onClick={() =>
                            form.setValue('studentId', student.id, {
                              shouldValidate: true,
                            })
                          }
                        >
                          <Avatar name={student.name} />
                          <div style={{ flex: 1 }}>
                            <strong>{student.name}</strong>
                            <p>
                              {student.course} · {student.institution}
                            </p>
                          </div>
                          {student.id === values.studentId && (
                            <CheckCircle2 size={20} />
                          )}
                        </button>
                      ))}
                    </div>
                    {!students.isLoading &&
                      !students.error &&
                      filtered.length === 0 && (
                        <EmptyState
                          title="Nenhum aluno encontrado"
                          description="Tente outro nome ou aguarde o cadastro dos alunos."
                        />
                      )}
                    {form.formState.errors.studentId && (
                      <p className="field-error" role="alert">
                        {form.formState.errors.studentId.message}
                      </p>
                    )}
                    <div className="form-actions">
                      <Button
                        disabled={students.isLoading || !!students.error}
                        onClick={async () => {
                          if (await form.trigger('studentId')) setStep(2)
                        }}
                      >
                        Continuar <ArrowRight size={17} />
                      </Button>
                    </div>
                  </>
                )}
                {step === 2 && (
                  <>
                    <div
                      className="row"
                      style={{ paddingTop: 0, marginBottom: 23 }}
                    >
                      <Avatar name={selected?.name || ''} />
                      <div className="row-text">
                        <strong>{selected?.name}</strong>
                        <p>{selected?.course}</p>
                      </div>
                      <Button variant="ghost" onClick={() => setStep(1)}>
                        Trocar aluno
                      </Button>
                    </div>
                    <div className="form-stack">
                      <Field
                        id="amount"
                        label="Quantidade de Pucoins"
                        error={form.formState.errors.amount?.message}
                        hint={`Você tem ${number(user?.balance || 0)} Pucoins disponíveis.`}
                      >
                        <input
                          id="amount"
                          type="number"
                          min="1"
                          step="1"
                          aria-invalid={!!form.formState.errors.amount}
                          {...form.register('amount', { valueAsNumber: true })}
                        />
                      </Field>
                      <Field
                        id="reason"
                        label="Por que este aluno merece o reconhecimento?"
                        error={form.formState.errors.reason?.message}
                        hint={`${values.reason.length}/500 caracteres`}
                      >
                        <textarea
                          id="reason"
                          placeholder="Conte sobre a participação, colaboração ou atitude que fez a diferença."
                          maxLength={500}
                          aria-invalid={!!form.formState.errors.reason}
                          {...form.register('reason')}
                        />
                      </Field>
                    </div>
                    <div className="form-actions">
                      <Button variant="secondary" onClick={() => setStep(1)}>
                        <ArrowLeft size={16} /> Voltar
                      </Button>
                      <Button type="submit">
                        Revisar envio <ArrowRight size={16} />
                      </Button>
                    </div>
                  </>
                )}
                {step === 3 && (
                  <>
                    <h2>Um último olhar antes de enviar.</h2>
                    <div className="summary-box">
                      <div className="summary-line">
                        <span>Aluno</span>
                        <strong>{selected?.name}</strong>
                      </div>
                      <div className="summary-line">
                        <span>Reconhecimento</span>
                        <strong>{number(values.amount)} Pucoins</strong>
                      </div>
                      <div className="summary-line">
                        <span>Seu saldo após o envio</span>
                        <strong>
                          {number((user?.balance || 0) - values.amount)} Pucoins
                        </strong>
                      </div>
                    </div>
                    <p className="small muted">Motivo do reconhecimento</p>
                    <p
                      style={{ margin: '8px 0 22px', overflowWrap: 'anywhere' }}
                    >
                      {values.reason}
                    </p>
                    <ErrorNotice error={action.error} />
                    <div className="form-actions">
                      <Button
                        variant="secondary"
                        disabled={action.isPending}
                        onClick={() => setStep(2)}
                      >
                        Editar reconhecimento
                      </Button>
                      <Button type="submit" loading={action.isPending}>
                        <Send size={17} /> Confirmar envio
                      </Button>
                    </div>
                  </>
                )}
              </form>
            </>
          )}
        </section>
        <aside className="transfer-aside">
          <BalanceCard balance={user?.balance || 0} teacher />
          <section className="card" style={{ marginTop: 22 }}>
            <ShieldCheck size={24} className="muted" />
            <h3 style={{ marginTop: 12 }}>Cada moeda conta.</h3>
            <p>
              O envio fica registrado no seu extrato e no do aluno, junto com a
              sua mensagem de reconhecimento.
            </p>
          </section>
        </aside>
      </div>
    </>
  )
}
