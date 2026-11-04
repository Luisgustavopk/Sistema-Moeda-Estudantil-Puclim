import { useEffect, useRef, type ReactNode } from 'react'
import { useLocation } from 'react-router'
export function PageHeading({
  title,
  description,
  action,
}: {
  eyebrow?: string
  title: string
  description: string
  action?: ReactNode
}) {
  const heading = useRef<HTMLHeadingElement>(null)
  const location = useLocation()
  useEffect(() => {
    document.title = `${heading.current?.textContent || 'Meu espaço'} · Puclim`
    heading.current?.focus({ preventScroll: true })
  }, [location.pathname])
  useEffect(() => {
    document.title = `${title} · Puclim`
  }, [title])
  return (
    <header className="page-heading">
      <div>
        <h1 ref={heading} tabIndex={-1}>
          {title}
        </h1>
        <p className="muted">{description}</p>
      </div>
      {action}
    </header>
  )
}
