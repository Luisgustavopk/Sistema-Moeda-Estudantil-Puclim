import { useState } from 'react'
import {
  ArrowDownLeft,
  ArrowRight,
  Check,
  CheckCheck,
  Gift,
  RotateCcw,
  Send,
  Ticket,
  Wallet,
} from 'lucide-react'
import { useMeritExample } from './use-merit-example'
import { MeritSignal } from './MeritSignal'
import { landingStyles as s } from './landing.styles'

export function LiveProduct({
  view,
  select,
}: {
  view: number
  select: (view: number) => void
}) {
  const { example, recognize, redeem, reset } = useMeritExample()
  const [amount, setAmount] = useState('60')
  const [reason, setReason] = useState(
    'Pela contribuição na atividade em aula.',
  )
  const [error, setError] = useState('')
  const balance = example.amount - (example.redeemed ? 60 : 0)
  return (
    <div className="lp-live-product" data-view={view}>
      <div className="lp-live-view lp-live-wallet" hidden={view !== 0}>
        <div className="lp-live-balance">
          <span>
            <Wallet size={20} aria-hidden="true" /> Seu espaço de conquistas
          </span>
          <p>
            Seu esforço.
            <br />
            <strong>Seu próximo passo.</strong>
          </p>
          <div className="lp-live-amount">
            <strong>{balance}</strong>
            <span>
              Pucoins
              <br />
              neste exemplo
            </span>
          </div>
          <MeritSignal />
        </div>
        <div className="lp-live-activity">
          <h3>O reconhecimento tem história.</h3>
          <div className="lp-live-receipt">
            <ArrowDownLeft size={24} aria-hidden="true" />
            <div>
              <span>Reconhecimento recebido</span>
              <blockquote>{example.reason}</blockquote>
            </div>
            <strong>+{example.amount}</strong>
          </div>
          {example.redeemed && (
            <div className="lp-live-redeemed">
              <Ticket size={20} aria-hidden="true" />
              <span>Café & boas ideias</span>
              <strong>−60</strong>
            </div>
          )}
          <div className="lp-live-shortcuts">
            <button type="button" onClick={() => select(1)}>
              Explorar vantagens <ArrowRight size={18} aria-hidden="true" />
            </button>
            <button type="button" onClick={() => select(2)}>
              Ver meus cupons <Ticket size={18} aria-hidden="true" />
            </button>
          </div>
          <p className="lp-live-disclaimer">
            Demonstração conectada à jornada acima. Nenhuma moeda real é
            movimentada.
          </p>
        </div>
      </div>
      <div className="lp-live-view lp-live-catalog" hidden={view !== 1}>
        <div className="lp-live-benefit-image">
          <img
            src="/images/coffee.jpg"
            alt="Café e acompanhamento da vantagem de demonstração"
            width="640"
            height="640"
            loading="lazy"
          />
          <span>
            <Gift size={18} aria-hidden="true" /> Do reconhecimento ao encontro
          </span>
        </div>
        <div className="lp-live-benefit">
          <span>Catálogo de demonstração · Cantina Central</span>
          <h3>
            Café &<br />
            boas ideias.
          </h3>
          <p>
            Um café fresquinho acompanhado de dois pães de queijo. A combinação
            perfeita para recarregar as ideias.
          </p>
          <div className="lp-live-cost">
            <strong>60</strong>
            <span>Pucoins</span>
            <small>Seu saldo no exemplo: {balance}</small>
          </div>
          <button
            type="button"
            className={s.action}
            disabled={example.redeemed || balance < 60}
            onClick={() => {
              redeem()
              select(2)
            }}
          >
            {example.redeemed
              ? 'Vantagem já resgatada no exemplo'
              : balance < 60
                ? `Faltam ${60 - balance} moedas no exemplo`
                : 'Simular troca por esta vantagem'}
            <ArrowRight size={18} aria-hidden="true" />
          </button>
          <p className="lp-live-disclaimer">
            Exemplo ilustrativo do catálogo. Sem transação ou cupom válido.
          </p>
        </div>
      </div>
      <div className="lp-live-view lp-live-coupons" hidden={view !== 2}>
        <div className="lp-live-coupon-art" data-redeemed={example.redeemed}>
          <div className="lp-live-coupon">
            <Ticket size={36} aria-hidden="true" />
            <span>
              {example.redeemed
                ? 'Conquista resgatada'
                : 'Sua próxima possibilidade'}
            </span>
            <h3>
              Café &<br />
              boas ideias.
            </h3>
            <div className="lp-live-coupon-code">
              {example.redeemed ? 'PUCLIM · DEMO' : '60 PUCOINS'}
            </div>
            <small>Exemplo ilustrativo · Sem validade</small>
          </div>
        </div>
        <div className="lp-live-coupon-copy">
          <h3>
            {example.redeemed
              ? 'O mérito ganhou um novo destino.'
              : 'Conquistas para levar com você.'}
          </h3>
          <p>
            {example.redeemed
              ? `A troca foi simulada. Seu saldo no exemplo passou de ${example.amount} para ${balance} moedas.`
              : 'Na sua conta, uma vantagem resgatada gera um cupom. Você apresenta o código ao parceiro para aproveitar.'}
          </p>
          <ul>
            <li>
              <Check size={18} aria-hidden="true" /> Escolha uma vantagem.
            </li>
            <li>
              <Check size={18} aria-hidden="true" /> Confirme com seu saldo.
            </li>
            <li>
              <Check size={18} aria-hidden="true" /> Apresente o cupom ao
              parceiro.
            </li>
          </ul>
          <button
            type="button"
            className={s.action}
            onClick={() => (example.redeemed ? reset() : select(1))}
          >
            {example.redeemed
              ? 'Recomeçar a demonstração'
              : 'Experimentar uma troca'}
            <ArrowRight size={18} aria-hidden="true" />
          </button>
        </div>
      </div>
      <div className="lp-live-view lp-live-recognize" hidden={view !== 3}>
        <div className="lp-live-recognize-copy">
          <Send size={32} aria-hidden="true" />
          <h3>
            Um gesto pode
            <br />
            ir mais longe.
          </h3>
          <p>
            Escolha a quantidade, escreva o motivo e veja esse reconhecimento
            aparecer no espaço do estudante.
          </p>
          <div className="lp-live-recognize-chain">
            <span>Professor</span>
            <ArrowRight size={20} aria-hidden="true" />
            <CheckCheck size={24} aria-hidden="true" />
            <ArrowRight size={20} aria-hidden="true" />
            <span>Estudante</span>
          </div>
          <p className="lp-live-disclaimer">
            Simulação local, sem enviar dados ou movimentar moedas de uma conta.
          </p>
        </div>
        <form
          className="lp-recognition-form"
          noValidate
          onSubmit={(event) => {
            event.preventDefault()
            const value = Number(amount)
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
            select(0)
          }}
        >
          <div className="lp-demo-form-heading">
            <Send size={20} aria-hidden="true" />
            <strong>Reconheça uma contribuição</strong>
          </div>
          <label htmlFor="product-amount">Moedas neste reconhecimento</label>
          <input
            id="product-amount"
            type="number"
            min="1"
            step="1"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            aria-invalid={error.startsWith('Informe') || undefined}
            aria-describedby={error ? 'product-error' : undefined}
          />
          <label htmlFor="product-reason">
            Por que esse gesto merece reconhecimento?
          </label>
          <textarea
            id="product-reason"
            maxLength={500}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            aria-invalid={error.startsWith('Conte') || undefined}
            aria-describedby={error ? 'product-error' : undefined}
          />
          {error && (
            <p id="product-error" className="lp-demo-error" role="alert">
              {error}
            </p>
          )}
          <button className={s.action} type="submit">
            Simular e ver no meu espaço{' '}
            <ArrowRight size={18} aria-hidden="true" />
          </button>
        </form>
      </div>
      <div className="lp-live-footer">
        <span>
          <CheckCheck size={16} aria-hidden="true" /> Exemplo interativo · dados
          de demonstração
        </span>
        <button
          type="button"
          onClick={reset}
          aria-label="Restaurar dados da demonstração"
        >
          <RotateCcw size={16} aria-hidden="true" /> Restaurar exemplo
        </button>
      </div>
    </div>
  )
}
