import { Link } from 'react-router'
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  CheckCheck,
  Ticket,
} from 'lucide-react'
import { MeritSignal } from './MeritSignal'
import { OrbitField } from './OrbitField'
import { landingStyles as s } from './landing.styles'

export function MeritHero() {
  return (
    <section
      className="lp-merit-hero lp-orbital-hero"
      aria-labelledby="landing-title"
    >
      <div className="lp-hero-light" aria-hidden="true" data-story />
      <OrbitField className="lp-hero-orbits" />
      <div className={`${s.frame} lp-hero-frame`}>
        <div className="lp-title-composition" data-story>
          <h1 id="landing-title" aria-label="Seu mérito. Em movimento.">
            <span className="lp-hero-appear">Seu mérito.</span>
            <span className="lp-hero-appear">Em movimento.</span>
          </h1>
          <div className="lp-title-symbol">
            <MeritSignal className="lp-hero-appear" />
          </div>
        </div>
        <div className="lp-hero-bottom lp-hero-appear">
          <p>
            Moedas estudantis que fazem o reconhecimento circular. Da sua
            dedicação às próximas possibilidades.
          </p>
          <div className="lp-hero-cta">
            <Link to="/cadastro/aluno" className={s.action}>
              Criar minha conta <ArrowUpRight size={20} aria-hidden="true" />
            </Link>
            <a href="#como-funciona">
              Veja acontecer <ArrowDown size={18} aria-hidden="true" />
            </a>
          </div>
          <p className="lp-hero-reassurance">
            Moedas virtuais. Reconhecimento de verdade.
          </p>
          <Link to="/login" className="lp-return-link">
            Já tem conta? Entre no seu espaço{' '}
            <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </div>
        <div className="lp-hero-recognition lp-hero-appear">
          <CheckCheck size={22} aria-hidden="true" />
          <div>
            <strong>
              Seu empenho
              <br />
              foi reconhecido.
            </strong>
            <small>Exemplo ilustrativo</small>
          </div>
        </div>
        <div className="lp-hero-reward lp-hero-appear">
          <Ticket size={26} aria-hidden="true" />
          <span>
            Seu esforço abre
            <br />
            <strong>novas possibilidades.</strong>
          </span>
        </div>
        <div className="lp-hero-footnote">
          <span>Sistema de moeda estudantil · PUC Minas</span>
          <nav aria-label="Explore a comunidade">
            <a href="#para-voce">
              Encontre seu lugar <ArrowDown size={16} aria-hidden="true" />
            </a>
          </nav>
        </div>
      </div>
    </section>
  )
}
