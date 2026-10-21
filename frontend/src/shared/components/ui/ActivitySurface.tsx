import { useId, useState, type ReactNode } from 'react'

export type StatusTone = 'neutral' | 'info' | 'warning' | 'success'

export function ExpandableMessage({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false)
  const id = useId()
  return (
    <div className="expandable-message">
      <p
        id={id}
        className={`activity-copy ${expanded ? '' : 'message-excerpt'}`}
      >
        {text}
      </p>
      {(text.length > 180 || text.includes('\n')) && (
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
