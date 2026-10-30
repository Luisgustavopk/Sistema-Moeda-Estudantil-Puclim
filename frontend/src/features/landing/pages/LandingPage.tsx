import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { Link } from 'react-router'
import {
  ArrowRight,
  ArrowUpRight,
  ChevronRight,
  Check,
  Pause,
  Play,
  Plus,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { Brand, Wave } from '@/shared/components/ui/Brand'
import { ThemeToggle } from '@/shared/components/ui/ThemeToggle'
import { cn } from '@/shared/lib/utils'
import {
  setSoundEnabled,
  soundEnabled,
  subscribeSound,
} from '@/shared/lib/confirmation-sound'
import { audiences, navigation, questions } from './landing-content'
import { useLandingMotion } from './use-landing-motion'
import { JourneyDemo } from './JourneyDemo'
import { MeritHero } from './MeritHero'
import { ProductShowcase } from './ProductShowcase'
import { ProfileNetwork } from './ProfileNetwork'
import { MeritExampleProvider } from './MeritExampleProvider'
import { FinaleArtwork } from './FinaleArtwork'
import { LandingFooter } from './LandingFooter'
import { landingStyles as s } from './landing.styles'
import './landing.css'
import './landing-experience.css'

export function LandingPage() {
  return (
    <MeritExampleProvider>
      <LandingExperience />
    </MeritExampleProvider>
  )
}

function LandingExperience() {
  const sound = useSyncExternalStore(subscribeSound, soundEnabled)
  const [paused, setPaused] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [audience, setAudience] = useState(0)
  const root = useLandingMotion()
  const menuButton = useRef<HTMLButtonElement>(null)
  const menu = useRef<HTMLDialogElement>(null)
  const tabs = useRef<(HTMLButtonElement | null)[]>([])
  const selected = audiences[audience]

  useEffect(() => {
    const previous = document.title
    document.title = 'puclim · Seu mérito em movimento'
    return () => {
      document.title = previous
    }
  }, [])

  useEffect(() => {
    const dialog = menu.current
    if (!dialog) return
    if (menuOpen && !dialog.open) dialog.showModal()
    if (!menuOpen && dialog.open) dialog.close()
    if (!menuOpen) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [menuOpen])

  function closeMenu() {
    // Close before an anchor's default action so native focus restoration cannot
    // scroll the visitor back to the header after the destination is reached.
    menu.current?.close()
    setMenuOpen(false)
  }

  function selectByKey(event: React.KeyboardEvent, index: number) {
    let next = index
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown')
      next = (index + 1) % audiences.length
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp')
      next = (index + audiences.length - 1) % audiences.length
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = audiences.length - 1
    else return
    event.preventDefault()
    setAudience(next)
    tabs.current[next]?.focus()
  }

  return (
    <div
      ref={root}
      className="puclim-landing"
      data-motion-paused={paused || undefined}
    >
      <a href="#conteudo" className="lp-skip">
        Ir para o conteúdo
      </a>
      <header id="inicio" className={cn(s.frame, 'lp-header lp-hero-appear')}>
        <Link to="/" aria-label="puclim, início" className="lp-brand">
          <Brand />
        </Link>
        <nav aria-label="Navegação principal" className="lp-desktop-nav">
          {navigation.map((item) => (
            <a key={item.href} href={item.href}>
              {item.label}
            </a>
          ))}
        </nav>
        <div className="lp-header-actions">
          <div className="lp-preferences">
            <button
              type="button"
              className="lp-motion-toggle"
              aria-label={paused ? 'Retomar animações' : 'Pausar animações'}
              aria-pressed={paused}
              onClick={() => setPaused(!paused)}
            >
              {paused ? <Play size={18} /> : <Pause size={18} />}
            </button>
            <button
              type="button"
              aria-label={
                sound ? 'Silenciar efeitos sonoros' : 'Ativar efeitos sonoros'
              }
              aria-pressed={sound}
              onClick={() => setSoundEnabled(!sound)}
            >
              {sound ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>
            <ThemeToggle />
          </div>
          <Link to="/login" className="lp-header-login">
            Entrar <ArrowUpRight size={18} aria-hidden="true" />
          </Link>
          <button
            ref={menuButton}
            type="button"
            className="lp-menu-toggle"
            aria-label="Abrir menu"
            aria-expanded={menuOpen}
            aria-controls="landing-menu"
            onClick={() => setMenuOpen(true)}
          >
            <span />
            <span />
          </button>
        </div>
      </header>

      <dialog
        ref={menu}
        id="landing-menu"
        className="lp-mobile-menu"
        aria-label="Menu de navegação"
        onCancel={() => setMenuOpen(false)}
        onClose={() => setMenuOpen(false)}
        onKeyDown={(event) => {
          if (event.key !== 'Tab') return
          const controls = event.currentTarget.querySelectorAll<HTMLElement>(
            'button:not(:disabled), a[href]',
          )
          const first = controls[0]
          const last = controls[controls.length - 1]
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault()
            last?.focus()
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault()
            first?.focus()
          }
        }}
      >
        <div className="lp-mobile-top">
          <Brand />
          <button
            type="button"
            className="lp-menu-toggle lp-menu-close"
            aria-label="Fechar menu"
            onClick={closeMenu}
          >
            <span />
            <span />
          </button>
        </div>
        <nav aria-label="Navegação no celular">
          {[...navigation, { href: '#duvidas', label: 'Dúvidas' }].map(
            (item) => (
              <a key={item.href} href={item.href} onClick={closeMenu}>
                {item.label}
                <ArrowUpRight size={24} aria-hidden="true" />
              </a>
            ),
          )}
          <Link to="/login" onClick={closeMenu}>
            Entrar na minha conta <ArrowUpRight size={24} aria-hidden="true" />
          </Link>
        </nav>
        <Link to="/cadastro/aluno" className={s.action} onClick={closeMenu}>
          Criar minha conta <ArrowRight size={20} aria-hidden="true" />
        </Link>
        <p>Reconhecimento que circula.</p>
      </dialog>

      <main id="conteudo" tabIndex={-1}>
        <MeritHero />

        <JourneyDemo paused={paused} />

        <ProductShowcase paused={paused} />

        <section
          className="lp-manifesto lp-section"
          aria-labelledby="manifesto-titulo"
        >
          <div className={s.frame}>
            <h2 id="manifesto-titulo" className="lp-word-statement">
              <span data-word>Aprender </span>
              <span data-word>fica.</span>
              <br />
              <span data-word>Conquistas </span>
              <span data-word>circulam.</span>
            </h2>
            <p className="lp-manifesto-note">
              Seu esforço tem valor. E pode continuar circulando.
            </p>
            <svg
              className="lp-manifesto-wave"
              data-story
              viewBox="0 0 40 32"
              aria-hidden="true"
            >
              <Wave />
            </svg>
          </div>
        </section>

        <section
          id="para-voce"
          className={cn(s.frame, 'lp-section lp-audiences')}
          aria-labelledby="pessoas-titulo"
        >
          <div className="lp-section-intro">
            <h2 id="pessoas-titulo" className={s.heading} data-reveal>
              Uma comunidade.
              <br />
              Seu lugar nela.
            </h2>
            <p className={s.body} data-reveal>
              Quem aprende, quem ensina e quem cria oportunidades. Cada pessoa
              faz essa troca acontecer.
            </p>
          </div>
          <div className="lp-audience-layout" data-reveal>
            <div
              role="tablist"
              aria-label="Encontre o puclim para seu perfil"
              className="lp-audience-tabs"
            >
              <ProfileNetwork active={audience} />
              {audiences.map((item, index) => (
                <button
                  key={item.name}
                  ref={(node) => {
                    tabs.current[index] = node
                  }}
                  id={`perfil-${index}`}
                  type="button"
                  role="tab"
                  aria-selected={audience === index}
                  aria-controls="perfil-conteudo"
                  tabIndex={audience === index ? 0 : -1}
                  onClick={() => setAudience(index)}
                  onKeyDown={(event) => selectByKey(event, index)}
                >
                  {item.name}
                  <ChevronRight size={20} aria-hidden="true" />
                </button>
              ))}
            </div>
            <div
              id="perfil-conteudo"
              role="tabpanel"
              aria-labelledby={`perfil-${audience}`}
              tabIndex={0}
              className="lp-audience-content"
            >
              <h3>{selected.heading}</h3>
              <p>{selected.description}</p>
              <ul>
                {selected.benefits.map((benefit) => (
                  <li key={benefit}>
                    <Check size={20} aria-hidden="true" />
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
              <Link to={selected.href} className={s.action}>
                {selected.action}
                <ArrowRight size={20} aria-hidden="true" />
              </Link>
              <p className="lp-audience-note">{selected.note}</p>
            </div>
          </div>
        </section>

        <section
          id="duvidas"
          className="lp-faq lp-section"
          aria-labelledby="duvidas-titulo"
        >
          <div className={cn(s.frame, 'lp-faq-layout')}>
            <div data-reveal>
              <h2 id="duvidas-titulo" className={s.heading}>
                Vamos tirar
                <br />
                suas dúvidas.
              </h2>
              <p className={s.body}>
                O essencial sobre moedas, cadastros e suas próximas conquistas.
              </p>
            </div>
            <div className="lp-question-list" data-reveal>
              {questions.map((item) => (
                <details key={item.question} name="puclim-questions">
                  <summary>
                    {item.question}
                    <Plus size={20} aria-hidden="true" />
                  </summary>
                  <p>{item.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section
          className="lp-final-cta lp-section"
          aria-labelledby="comece-titulo"
        >
          <div className={cn(s.frame, 'lp-final-layout')}>
            <div data-reveal>
              <h2 id="comece-titulo">
                Seu próximo passo
                <br />
                vale muito.
              </h2>
              <p>Faça parte dessa troca. O seu lugar no puclim começa aqui.</p>
              <Link to="/cadastro/aluno" className={s.action}>
                Criar minha conta
                <ArrowUpRight size={20} aria-hidden="true" />
              </Link>
              <a href="#para-voce" className="lp-final-other">
                Professor, empresa ou instituição? Encontre seu acesso{' '}
                <ArrowRight size={16} aria-hidden="true" />
              </a>
            </div>
            <FinaleArtwork />
          </div>
        </section>
      </main>
      <LandingFooter />
    </div>
  )
}
