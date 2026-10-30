import { useRef, useState } from 'react'
import {
  ArrowRight,
  Check,
  CheckCheck,
  ChevronRight,
  Pause,
  Play,
  Send,
  Ticket,
} from 'lucide-react'
import { Brand, Wave } from '@/shared/components/ui/Brand'
import { useJourneyPlayback } from './use-landing-motion'
import { landingStyles as s } from './landing.styles'
import { useMeritExample } from './use-merit-example'
import { MeritSignal } from './MeritSignal'

const steps = [
  {
    label: 'Reconhecer',
    title: 'Toda boa atitude tem um motivo.',
    description:
      'O professor escolhe um estudante, informa a quantidade e conta por que aquela contribuição merece reconhecimento.',
  },
  {
    label: 'Conquistar',
    title: 'O gesto chega até você.',
    description:
      'As moedas recebidas entram no saldo. A mensagem do professor acompanha o reconhecimento no seu histórico.',
  },
  {
    label: 'Aproveitar',
    title: 'O mérito encontra possibilidades.',
    description:
      'Você escolhe uma vantagem, confirma o resgate com seu saldo e recebe um cupom para apresentar ao parceiro.',
  },
]

export function JourneyDemo({ paused }: { paused: boolean }) {
  const [amountInput, setAmountInput] = useState('60')
  const [reason, setReason] = useState(
    'Pela contribuição na atividade em aula.',
  )
  const { example, recognize, redeem } = useMeritExample()
  const { amount, reason: submittedReason, redeemed } = example
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const {
    visual,
    progress,
    stage,
    running,
    reduced,
    playing,
    toggle,
    stop,
    select,
  } = useJourneyPlayback(paused)
  const tabs = useRef<(HTMLButtonElement | null)[]>([])

  function simulate(event: React.FormEvent) {
    event.preventDefault()
    const value = Number(amountInput)
    if (!Number.isSafeInteger(value) || value <= 0) {
      setError('Informe uma quantidade inteira maior que zero.')
      return
    }
    if (!reason.trim()) {
      setError('Conte o motivo do reconhecimento.')
      return
    }
    setError('')
    recognize(value, reason.trim())
    setStatus(
      `Reconhecimento simulado: ${value} moedas. Nenhuma transação foi realizada.`,
    )
    select(1)
    tabs.current[1]?.focus({ preventScroll: true })
  }

  return (
    <section
      id="como-funciona"
      className="lp-journey lp-section"
      aria-labelledby="como-titulo"
    >
      <div className={s.frame}>
        <div className="lp-journey-intro" data-reveal>
          <h2 id="como-titulo" className={s.heading}>
            Um gesto muda
            <br />o próximo passo.
          </h2>
          <p>
            Reconhecer. Conquistar. Aproveitar.
            <br />
            Experimente o caminho do mérito no Puclim.
          </p>
        </div>
        <div
          className="lp-demo"
          data-running={running}
          data-stage={stage}
          onFocusCapture={(event) => {
            if (playing && event.target.matches(':focus-visible')) stop()
          }}
        >
          <div
            className="lp-journey-tabs"
            role="tablist"
            aria-label="Etapas da demonstração"
            data-reveal
          >
            {steps.map((step, index) => (
              <button
                key={step.label}
                ref={(node) => {
                  tabs.current[index] = node
                }}
                type="button"
                role="tab"
                aria-label={step.label}
                id={`etapa-${index}`}
                aria-selected={stage === index}
                aria-controls="etapa-conteudo"
                tabIndex={stage === index ? 0 : -1}
                onClick={() => select(index)}
                onKeyDown={(event) => {
                  let next = index
                  if (event.key === 'ArrowRight' || event.key === 'ArrowDown')
                    next = (index + 1) % 3
                  else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp')
                    next = (index + 2) % 3
                  else if (event.key === 'Home') next = 0
                  else if (event.key === 'End') next = 2
                  else return
                  event.preventDefault()
                  select(next)
                  tabs.current[next]?.focus()
                }}
              >
                <span className="lp-step-number" aria-hidden="true">
                  {index + 1}
                </span>
                <span>
                  {step.label}
                  <small>
                    {
                      [
                        'Professor reconhece',
                        'Estudante recebe',
                        'Você escolhe uma vantagem',
                      ][index]
                    }
                  </small>
                </span>
                <ChevronRight size={18} aria-hidden="true" />
              </button>
            ))}
          </div>
          <div
            ref={progress}
            className="lp-journey-progress"
            aria-hidden="true"
          >
            <i>
              <MeritSignal />
            </i>
          </div>
          <div className="lp-demo-layout">
            <div ref={visual} className="lp-demo-canvas" data-ui data-reveal>
              <div className="lp-demo-canvas-top">
                <Brand />
                <span>Demonstração interativa</span>
              </div>
              <div className="lp-scene-stack">
                <div
                  className="lp-scene lp-scene-participation"
                  hidden={stage !== 0}
                  data-active={stage === 0}
                >
                  <form
                    className="lp-recognition-form"
                    onSubmit={simulate}
                    noValidate
                    onFocus={() => {
                      if (playing) select(0)
                    }}
                  >
                    <div className="lp-demo-form-heading">
                      <Send size={24} aria-hidden="true" />
                      <strong>Enviar reconhecimento</strong>
                    </div>
                    <label>
                      Estudante
                      <input value="Estudante de demonstração" readOnly />
                    </label>
                    <label htmlFor="demo-amount">Quantidade de moedas</label>
                    <input
                      id="demo-amount"
                      type="number"
                      min="1"
                      step="1"
                      required
                      value={amountInput}
                      onChange={(event) => setAmountInput(event.target.value)}
                      aria-invalid={error.startsWith('Informe') || undefined}
                      aria-describedby={error ? 'demo-error' : undefined}
                    />
                    <label htmlFor="demo-reason">
                      Motivo do reconhecimento
                    </label>
                    <textarea
                      id="demo-reason"
                      value={reason}
                      onChange={(event) => setReason(event.target.value)}
                      required
                      maxLength={500}
                      aria-invalid={error.startsWith('Conte') || undefined}
                      aria-describedby={error ? 'demo-error' : undefined}
                    />
                    {error && (
                      <p id="demo-error" className="lp-demo-error" role="alert">
                        {error}
                      </p>
                    )}
                    <button type="submit" className={s.action}>
                      Simular reconhecimento
                      <ArrowRight size={18} aria-hidden="true" />
                    </button>
                  </form>
                </div>
                <div
                  className="lp-scene lp-scene-recognition"
                  hidden={stage !== 1}
                  data-active={stage === 1}
                >
                  <div className="lp-recognition-slip">
                    <CheckCheck size={32} aria-hidden="true" />
                    <p>Reconhecimento recebido</p>
                    <strong>
                      +{amount}
                      <span> Pucoins</span>
                    </strong>
                    <blockquote>{submittedReason}</blockquote>
                  </div>
                  <div className="lp-wallet">
                    <span>Saldo neste exemplo</span>
                    <strong>
                      <span className="lp-balance-number">{amount}</span>{' '}
                      <span>moedas</span>
                    </strong>
                    <span className="lp-wallet-confirm">
                      <Check size={16} aria-hidden="true" /> Motivo registrado
                      no histórico
                    </span>
                  </div>
                </div>
                <div
                  className="lp-scene lp-scene-redemption"
                  hidden={stage !== 2}
                  data-active={stage === 2}
                >
                  <div className="lp-demo-ticket">
                    <div className="lp-ticket-wave">
                      <svg viewBox="0 0 40 32" aria-hidden="true">
                        <Wave />
                      </svg>
                    </div>
                    <div>
                      <Ticket size={28} aria-hidden="true" />
                      <p>Café & boas ideias</p>
                      <span>
                        60 moedas · Exemplo do catálogo de demonstração
                      </span>
                      {redeemed ? (
                        <strong>
                          <Check size={20} aria-hidden="true" /> Cupom de
                          demonstração
                        </strong>
                      ) : (
                        <button
                          type="button"
                          className={s.action}
                          disabled={amount < 60}
                          onClick={() => {
                            select(2)
                            redeem()
                            setStatus(
                              'Resgate simulado. O cupom de demonstração não tem validade.',
                            )
                          }}
                        >
                          Simular resgate
                          <ArrowRight size={18} aria-hidden="true" />
                        </button>
                      )}
                      <span>
                        {redeemed
                          ? `Sem validade. Saldo do exemplo: ${amount - 60} moedas.`
                          : amount < 60
                            ? `Faltam ${60 - amount} moedas neste exemplo.`
                            : 'Na sua conta, o cupom é conferido pelo parceiro.'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="lp-demo-explanation" data-reveal>
              <div
                id="etapa-conteudo"
                role="tabpanel"
                aria-labelledby={`etapa-${stage}`}
                tabIndex={0}
              >
                <h3>{steps[stage].title}</h3>
                <p>{steps[stage].description}</p>
              </div>
              <div className="lp-demo-path" aria-hidden="true">
                <span data-current={stage === 0}>Uma ação.</span>
                <ArrowRight size={20} />
                <span data-current={stage === 1}>Um reconhecimento.</span>
                <ArrowRight size={20} />
                <span data-current={stage === 2}>Novos caminhos.</span>
              </div>
              <div className="lp-demo-controls">
                {!reduced && (
                  <button
                    type="button"
                    className="lp-playback"
                    onClick={toggle}
                    aria-pressed={!playing}
                    disabled={paused}
                    aria-label={
                      playing
                        ? 'Pausar demonstração'
                        : 'Reproduzir demonstração'
                    }
                  >
                    {playing ? <Pause size={16} /> : <Play size={16} />}
                    {paused
                      ? 'Animações pausadas'
                      : playing
                        ? 'Pausar'
                        : 'Reproduzir'}
                  </button>
                )}
                <p>Exemplo ilustrativo. Nenhuma moeda é movimentada.</p>
              </div>
              <p role="status" className="lp-demo-status">
                {status}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
