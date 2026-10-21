import { useEffect, useState, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { Volume2 } from 'lucide-react'
import { Wave } from './Brand'
import {
  playConfirmation,
  setSoundEnabled,
  soundEnabled,
  stopConfirmation,
  subscribeSound,
} from '@/shared/lib/confirmation-sound'

export function SoundPreference() {
  const enabled = useSyncExternalStore(subscribeSound, soundEnabled, () => true)
  return (
    <section className="card account-section">
      <div className="settings-section-heading">
        <Volume2 size={22} aria-hidden="true" />
        <div>
          <h2>Sons da interface</h2>
          <p>Um toque de confirmação para seus resgates e quizzes.</p>
        </div>
      </div>
      <label className="editor-check">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(event) => setSoundEnabled(event.target.checked)}
        />
        Sons de confirmação
      </label>
      <p className="small muted">
        Preferência salva neste navegador. O volume do dispositivo continua sob
        seu controle.
      </p>
    </section>
  )
}
export function ConfirmationFeedback() {
  const [container, setContainer] = useState<Element | null>(null)
  const [feedback, setFeedback] = useState<{
    id: string
    kind: string
    playing: boolean
  } | null>(null)
  const feedbackId = feedback?.id
  useEffect(() => {
    if (!feedbackId) return
    const frame = requestAnimationFrame(() =>
      setContainer(document.querySelector('dialog[open]') || document.body),
    )
    return () => cancelAnimationFrame(frame)
  }, [feedbackId])
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>,
      generation = 0
    const show = (event: Event) => {
      const detail = (event as CustomEvent<{ id: string; kind: string }>).detail
      const current = ++generation
      clearTimeout(timer)
      setFeedback({ ...detail, playing: false })
      timer = setTimeout(() => {
        generation++
        setFeedback(null)
      }, 2400)
      void playConfirmation().then((duration) => {
        if (current !== generation || duration === null) return
        clearTimeout(timer)
        setFeedback({ ...detail, playing: true })
        timer = setTimeout(
          () => setFeedback(null),
          Math.max(2400, duration * 1000 + 200),
        )
      })
    }
    const quiet = () => {
      if (document.hidden) {
        generation++
        clearTimeout(timer)
        stopConfirmation()
        setFeedback(null)
      }
    }
    window.addEventListener('puclim:celebrate', show)
    const unsubscribe = subscribeSound(() => {
      if (!soundEnabled()) {
        generation++
        setFeedback((current) =>
          current ? { ...current, playing: false } : null,
        )
      }
    })
    document.addEventListener('visibilitychange', quiet)
    return () => {
      generation++
      clearTimeout(timer)
      unsubscribe()
      stopConfirmation()
      window.removeEventListener('puclim:celebrate', show)
      document.removeEventListener('visibilitychange', quiet)
    }
  }, [])
  useEffect(() => {
    const observed = new WeakSet<Element>()
    const observer = new IntersectionObserver((entries) =>
      entries.forEach((entry) =>
        entry.target.toggleAttribute(
          'data-motion-paused',
          !entry.isIntersecting,
        ),
      ),
    )
    const scan = () =>
      document
        .querySelectorAll('.streak-flame, .medal-reflection')
        .forEach((element) => {
          if (!observed.has(element)) {
            observed.add(element)
            observer.observe(element)
          }
        })
    const hidden = () =>
      document.documentElement.toggleAttribute(
        'data-motion-paused',
        document.hidden,
      )
    const mutations = new MutationObserver(scan)
    scan()
    hidden()
    mutations.observe(document.body, { childList: true, subtree: true })
    document.addEventListener('visibilitychange', hidden)
    return () => {
      mutations.disconnect()
      observer.disconnect()
      document.removeEventListener('visibilitychange', hidden)
      document.documentElement.removeAttribute('data-motion-paused')
    }
  }, [])
  if (!feedback) return null
  return createPortal(
    <div
      key={feedback.id}
      className={`confirmation-feedback ${feedback.playing ? 'is-playing' : ''}`}
      role="status"
    >
      <span className="confirmation-emblem" aria-hidden="true">
        <svg
          className="sound-wavefronts"
          viewBox="0 0 240 88"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        >
          <g className="sound-wave">
            <path d="M88 29Q73 44 88 59M152 29Q167 44 152 59" />
          </g>
          <g className="sound-wave">
            <path d="M69 19Q45 44 69 69M171 19Q195 44 171 69" />
          </g>
          <g className="sound-wave">
            <path d="M49 9Q17 44 49 79M191 9Q223 44 191 79" />
          </g>
        </svg>
        <span className="sound-core">
          <svg className="sound-bars" viewBox="0 0 40 32">
            <Wave />
          </svg>
        </span>
      </span>
      <span>
        {feedback.kind === 'quiz' ? 'Quiz enviado' : 'Vantagem resgatada'}
      </span>
    </div>,
    container?.isConnected ? container : document.body,
  )
}
