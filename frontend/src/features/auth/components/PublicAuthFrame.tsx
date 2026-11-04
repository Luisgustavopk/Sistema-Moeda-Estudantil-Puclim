import { useState, useSyncExternalStore, type ReactNode } from 'react'
import { Pause, Play, Volume2, VolumeX } from 'lucide-react'
import { Brand } from '@/shared/components/ui/Brand'
import { ThemeToggle } from '@/shared/components/ui/ThemeToggle'
import { DATA_MODE } from '@/shared/lib/http'
import {
  setSoundEnabled,
  soundEnabled,
  subscribeSound,
} from '@/shared/lib/confirmation-sound'
import { loginStyles } from '../pages/login-page.styles'

export function PublicAuthFrame({
  children,
  className = '',
  skipHref = '#auth-form',
  skipLabel = 'Ir para o formulário',
}: {
  children: (sound: boolean) => ReactNode
  className?: string
  skipHref?: string
  skipLabel?: string
}) {
  const sound = useSyncExternalStore(subscribeSound, soundEnabled)
  const [paused, setPaused] = useState(false)
  return (
    <div
      className={`${loginStyles.experience} ${className}`}
      data-motion-paused={paused || undefined}
    >
      <a className={loginStyles.skip} href={skipHref}>
        {skipLabel}
      </a>
      <div className={loginStyles.ambient} aria-hidden="true">
        <span className={loginStyles.lightField} />
        <svg
          className={loginStyles.circulation}
          viewBox="0 0 1600 1000"
          preserveAspectRatio="xMidYMid slice"
        >
          <ellipse
            cx="1100"
            cy="320"
            rx="650"
            ry="210"
            transform="rotate(-28 1100 320)"
          />
          <ellipse
            className={loginStyles.lineFlow}
            cx="1100"
            cy="320"
            rx="650"
            ry="210"
            transform="rotate(-28 1100 320)"
          />
          <ellipse
            className={loginStyles.lineFlow}
            cx="1100"
            cy="320"
            rx="760"
            ry="310"
            transform="rotate(-28 1100 320)"
          />
          <ellipse
            className={loginStyles.lineFlow}
            cx="1100"
            cy="320"
            rx="880"
            ry="420"
            transform="rotate(-28 1100 320)"
          />
          <ellipse
            cx="1100"
            cy="320"
            rx="760"
            ry="310"
            transform="rotate(-28 1100 320)"
          />
          <ellipse
            cx="1100"
            cy="320"
            rx="880"
            ry="420"
            transform="rotate(-28 1100 320)"
          />
        </svg>
      </div>
      <header className={loginStyles.topbar}>
        <Brand />
        <span className={loginStyles.productName}>
          Sistema de moeda estudantil
        </span>
        <div
          className={loginStyles.preferences}
          role="group"
          aria-label="Preferências da página"
        >
          <button
            className={loginStyles.motionToggle}
            type="button"
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
            {sound ? <Volume2 size={19} /> : <VolumeX size={19} />}
          </button>
          <ThemeToggle />
        </div>
      </header>
      {children(sound)}
      <footer className={loginStyles.footer}>
        <span>PUC Minas · Sistema de Moeda Estudantil</span>
        <span>
          {DATA_MODE === 'demo'
            ? 'Ambiente de demonstração'
            : 'Reconhecimento que circula.'}
        </span>
      </footer>
    </div>
  )
}
