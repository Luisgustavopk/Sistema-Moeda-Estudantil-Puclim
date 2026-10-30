import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router'
import { Brand, Wave } from '@/shared/components/ui/Brand'
import './landing-footer.css'

const copyrightYear = new Date().getFullYear()

const footerGroups = [
  {
    title: 'Navegação',
    links: [
      { label: 'Voltar ao início', href: '#inicio' },
      { label: 'Quero ser parceiro', href: '/cadastro/empresa' },
    ],
  },
  {
    title: 'Sobre',
    links: [
      { label: 'Comunidade', href: '#para-voce' },
      { label: 'Sistema Puclim', href: '#possibilidades' },
      { label: 'Como funciona', href: '#como-funciona' },
    ],
  },
  {
    title: 'Suporte',
    links: [
      { label: 'Dúvidas frequentes', href: '#duvidas' },
      { label: 'Acessar conta', href: '/login' },
    ],
  },
] as const

export function LandingFooter() {
  return (
    <footer className="lp-footer">
      <div className="lp-footer-atmosphere" data-story aria-hidden="true">
        <div className="lp-footer-orbit lp-footer-orbit-first">
          <div className="lp-footer-orbit-line" />
          <div className="lp-footer-orbit-rotor">
            <span className="lp-footer-orbit-bead" />
          </div>
          <div className="lp-footer-orbit-rotor lp-footer-orbit-counterpart">
            <span className="lp-footer-orbit-bead" />
          </div>
        </div>
      </div>

      <div className="lp-frame">
        <div className="lp-footer-threshold" aria-hidden="true" data-story>
          <span className="lp-footer-rule" />
          <span className="lp-footer-seal">
            <svg width="24" height="20" viewBox="0 0 40 32">
              <Wave />
            </svg>
          </span>
          <span className="lp-footer-rule" />
        </div>

        <div className="lp-footer-main">
          <div className="lp-footer-identity" data-reveal>
            <Link to="/" aria-label="puclim, início">
              <Brand />
            </Link>
            <p className="lp-footer-institution">
              Sistema de moeda estudantil <span>PUC Minas</span>
            </p>
            <p className="lp-footer-description">
              <span>Reconhecimento que conecta pessoas,</span>{' '}
              <span>constrói jornadas e faz o conhecimento circular.</span>
            </p>
          </div>

          <nav aria-label="Navegação do rodapé" className="lp-footer-nav">
            {footerGroups.map((group) => (
              <div
                className="lp-footer-nav-group"
                key={group.title}
                data-reveal
              >
                <h2>{group.title}</h2>
                <ul>
                  {group.links.map((item) => {
                    const content = (
                      <>
                        <span>{item.label}</span>
                        <ArrowUpRight size={14} aria-hidden="true" />
                      </>
                    )

                    return (
                      <li key={item.href}>
                        {item.href.startsWith('#') ? (
                          <a href={item.href} className="lp-footer-link">
                            {content}
                          </a>
                        ) : (
                          <Link to={item.href} className="lp-footer-link">
                            {content}
                          </Link>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </nav>

          <p className="lp-footer-statement" data-reveal>
            <span>O conhecimento conecta.</span>{' '}
            <span>
              O reconhecimento{' '}
              <span className="lp-footer-circular">faz circular.</span>
            </span>
          </p>
        </div>

        <div className="lp-footer-bottom" data-reveal>
          <p>© {copyrightYear} Puclim.</p>
          <p className="lp-footer-motto">
            <svg width="20" height="16" viewBox="0 0 40 32" aria-hidden="true">
              <Wave />
            </svg>
            Seu mérito em movimento.
          </p>
        </div>
      </div>
    </footer>
  )
}
