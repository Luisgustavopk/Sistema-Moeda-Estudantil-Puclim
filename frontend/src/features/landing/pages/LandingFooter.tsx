import { ArrowRight, ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router'
import { Brand } from '@/shared/components/ui/Brand'
import './landing-footer.css'

export function LandingFooter() {
  return (
    <footer className="lp-footer">
      <div className="lp-frame">
        <div className="lp-footer-index" data-reveal>
          <p className="lp-footer-institution">
            Sistema de moeda estudantil
            <span>PUC Minas</span>
          </p>
          <nav aria-label="Navegação do rodapé" className="lp-footer-nav">
            <Link to="/cadastro/empresa" className="lp-footer-link">
              Quero ser parceiro
              <ArrowUpRight size={20} aria-hidden="true" />
            </Link>
            <a href="#inicio" className="lp-footer-link lp-footer-to-top">
              Voltar ao início
              <ArrowUpRight size={20} aria-hidden="true" />
            </a>
          </nav>
        </div>

        <div className="lp-footer-signature">
          <div className="lp-footer-circulation" data-story aria-hidden="true">
            <div className="lp-footer-orbit-plane">
              <div className="lp-footer-orbit-line" />
              <div className="lp-footer-orbit-tracer">
                <span />
              </div>
            </div>
          </div>

          <div className="lp-footer-wordmark" data-reveal>
            <Link to="/" aria-label="puclim, início">
              <Brand />
            </Link>
          </div>

          <p className="lp-footer-statement" data-reveal>
            <span>O conhecimento conecta.</span>{' '}
            <span>
              O reconhecimento faz{' '}
              <span className="lp-footer-circular">
                circular.
                <ArrowRight size={24} aria-hidden="true" />
              </span>
            </span>
          </p>
        </div>
      </div>
    </footer>
  )
}
