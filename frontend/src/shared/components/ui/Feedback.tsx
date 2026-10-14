import { AlertCircle, ArrowRight, Inbox, LoaderCircle } from 'lucide-react'
import { Button } from './Button'
import { errorMessage } from '@/shared/lib/errors'
import type { ReactNode } from 'react'
export function ErrorNotice({ error }: { error: unknown }) {
  return error ? (
    <div className="notice notice-error" role="alert">
      <AlertCircle size={19} />
      <span>{errorMessage(error)}</span>
    </div>
  ) : null
}
export function Loading({ label = 'Carregando...' }: { label?: string }) {
  return (
    <div className="loading" role="status">
      <LoaderCircle className="spin" size={24} />
      <span>{label}</span>
    </div>
  )
}
export function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="empty-state">
      <span className="empty-icon">
        <Inbox size={28} />
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  )
}
export function QueryState({
  loading,
  error,
  retry,
}: {
  loading: boolean
  error: unknown
  retry: () => unknown
}) {
  if (loading) return <Loading />
  if (error)
    return (
      <div className="query-error">
        <ErrorNotice error={error} />
        <Button
          variant="secondary"
          onClick={() => {
            void retry()
          }}
        >
          Tentar novamente <ArrowRight size={17} />
        </Button>
      </div>
    )
  return null
}
