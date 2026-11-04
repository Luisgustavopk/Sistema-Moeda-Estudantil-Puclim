import { useEffect, useId, useRef, useState, type ReactNode } from 'react'

export type StatusTone = 'neutral' | 'info' | 'warning' | 'success'

export function ExpandableMessage({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false)
  const [truncated, setTruncated] = useState(false)
  const ref = useRef<HTMLParagraphElement>(null)
  const id = useId()
  useEffect(() => {
    const node = ref.current
    if (!node) return
    let active = true
    // scrollHeight includes clamped lines; comparing with the line height also
    // works while expanded, so the collapse button never disappears on open.
    const measure = () =>
      setTruncated(
        node.scrollHeight >
          parseFloat(getComputedStyle(node).lineHeight) * 2 + 1,
      )
    const observer = new ResizeObserver(measure)
    observer.observe(node)
    document.fonts.addEventListener('loadingdone', measure)
    void document.fonts.ready.then(() => {
      if (active) measure()
    })
    measure()
    return () => {
      active = false
      observer.disconnect()
      document.fonts.removeEventListener('loadingdone', measure)
    }
  }, [text])
  return (
    <div className="expandable-message">
      <p
        ref={ref}
        id={id}
        className={`activity-copy ${expanded ? '' : 'message-excerpt'}`}
      >
        {text}
      </p>
      {truncated && (
        <button
          className="message-toggle"
          aria-expanded={expanded}
          aria-controls={id}
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? 'Recolher mensagem' : 'Ler mensagem completa'}
        </button>
      )}
    </div>
  )
}

export function Panel({
  children,
  className = '',
  label,
}: {
  children: ReactNode
  className?: string
  label?: string
}) {
  return (
    <section className={`card activity-panel ${className}`} aria-label={label}>
      {children}
    </section>
  )
}

export function ListItem({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return <article className={`activity-item ${className}`}>{children}</article>
}

export function StatusBadge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode
  tone?: StatusTone
}) {
  return (
    <span className={`activity-status status-${tone}`}>
      <span aria-hidden="true" />
      {children}
    </span>
  )
}

export function ProgressRing({
  value,
  label,
  children,
}: {
  value: number
  label: string
  children: ReactNode
}) {
  const percent = Math.min(100, Math.max(0, value))
  return (
    <div className="progress-ring" role="img" aria-label={label}>
      <svg viewBox="0 0 120 120" aria-hidden="true">
        <circle className="ring-track" cx="60" cy="60" r="52" />
        <circle
          className="ring-value"
          cx="60"
          cy="60"
          r="52"
          pathLength="100"
          strokeDasharray={`${percent} 100`}
        />
      </svg>
      <div className="ring-label" aria-hidden="true">
        {children}
      </div>
    </div>
  )
}
