import { useRef, useState } from 'react'
import { ArrowUpRight, Check, ChevronRight, Expand } from 'lucide-react'
import { Link } from 'react-router'
import { landingStyles as s } from './landing.styles'
import { LiveProduct } from './LiveProduct'

const views = [
  {
    name: 'Meu espaço',
    image: 'student',
    description:
      'Saldo, atividade recente e conquistas no espaço do estudante.',
    width: 1076,
    height: 607,
  },
  {
    name: 'Catálogo',
    image: 'catalog',
    description: 'Vantagens, categorias e custos em moedas no catálogo.',
    width: 1076,
    height: 840,
  },
  {
    name: 'Meus cupons',
    image: 'coupons',
    description:
      'Os cupons gerados depois de um resgate, com seu status e código.',
    width: 1076,
    height: 326,
  },
  {
    name: 'Reconhecimento',
    image: 'recognize',
    description:
      'O fluxo do professor para escolher um aluno e reconhecer sua contribuição.',
    width: 1076,
    height: 511,
  },
]

export function ProductShowcase({ paused }: { paused: boolean }) {
  const [active, setActive] = useState(0)
  const tabs = useRef<(HTMLButtonElement | null)[]>([])
  return (
    <section
      id="possibilidades"
      className="lp-product-section lp-section"
      aria-labelledby="possibilidades-titulo"
    >
      <div className={s.frame}>
        <div className="lp-product-intro" data-reveal>
          <h2 id="possibilidades-titulo" className={s.heading}>
            Conquistar é só
            <br />o começo.
          </h2>
          <p>
            O reconhecimento ganha um lugar no seu dia. Acompanhe o saldo,
            descubra vantagens e leve seu cupom para o próximo encontro.
          </p>
        </div>
        <div className="lp-product-exhibit">
          <div className="lp-product-selection">
            <div
              className="lp-product-tabs"
              role="tablist"
              aria-label="Explore as telas reais do Puclim"
              data-reveal
            >
              {views.map((view, index) => (
                <button
                  key={view.name}
                  ref={(node) => {
                    tabs.current[index] = node
                  }}
                  type="button"
                  role="tab"
                  id={`tela-${index}`}
                  aria-controls="tela-produto"
                  aria-selected={active === index}
                  tabIndex={active === index ? 0 : -1}
                  onClick={() => setActive(index)}
                  onKeyDown={(event) => {
                    let next = index
                    if (event.key === 'ArrowRight')
                      next = (index + 1) % views.length
                    else if (event.key === 'ArrowLeft')
                      next = (index + views.length - 1) % views.length
                    else if (event.key === 'Home') next = 0
                    else if (event.key === 'End') next = views.length - 1
                    else return
                    event.preventDefault()
                    setActive(next)
                    tabs.current[next]?.focus()
                  }}
                >
                  {view.name}
                  <ChevronRight size={18} aria-hidden="true" />
                </button>
              ))}
            </div>
            <p className="lp-product-view-description">
              {views[active].description}
            </p>
            <a
              className="lp-product-expand"
              href={`/images/landing/${views[active].image}.webp`}
              target="_blank"
              rel="noreferrer"
            >
              Ver captura completa <Expand size={16} aria-hidden="true" />
            </a>
          </div>
          <div
            id="tela-produto"
            role="tabpanel"
            aria-labelledby={`tela-${active}`}
            tabIndex={0}
            className="lp-product-live-stage"
            data-reveal
            data-ui
            data-motion-paused={paused || undefined}
          >
            <LiveProduct
              view={active}
              select={(next) => {
                setActive(next)
                tabs.current[next]?.focus({ preventScroll: true })
              }}
            />
          </div>
          <details className="lp-product-capture">
            <summary>
              <ChevronRight size={16} aria-hidden="true" />
              Veja também a interface completa do produto
            </summary>
            <figure className="lp-product-window" data-ui data-reveal>
              <div className="lp-product-window-top">
                <span>puclim / {views[active].name}</span>
                <span>Demonstração</span>
              </div>
              <div className="lp-product-images">
                {views.map((view, index) => (
                  <img
                    key={view.name}
                    src={`/images/landing/${view.image}.webp`}
                    alt={active === index ? view.description : ''}
                    aria-hidden={active !== index}
                    data-active={active === index}
                    width={view.width}
                    height={view.height}
                    loading="lazy"
                  />
                ))}
              </div>
              <figcaption>
                {views[active].description} Captura da aplicação com dados de
                demonstração.
              </figcaption>
            </figure>
          </details>
        </div>
        <div className="lp-product-outcomes" data-reveal>
          <p>
            <Check size={20} aria-hidden="true" /> Reconhecimento com motivo.
          </p>
          <p>
            <Check size={20} aria-hidden="true" /> Saldo e histórico à mão.
          </p>
          <p>
            <Check size={20} aria-hidden="true" /> Vantagens para resgatar.
          </p>
        </div>
        <Link to="/cadastro/aluno" className={s.textLink}>
          Encontre suas próximas possibilidades
          <ArrowUpRight size={18} aria-hidden="true" />
        </Link>
      </div>
    </section>
  )
}
