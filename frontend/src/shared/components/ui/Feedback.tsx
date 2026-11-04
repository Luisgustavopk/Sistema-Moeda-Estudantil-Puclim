import { AlertCircle, ArrowRight, Inbox, LoaderCircle } from 'lucide-react'
import { Button } from './Button'
import { errorMessage } from '@/shared/lib/errors'
import type { ReactNode } from 'react'
import { number } from '@/shared/utils/format'
export function QueryValue({
  value,
  query,
  prefix = '',
}: {
  value: number | undefined
  prefix?: string
  query: {
    isPending: boolean
    isFetching: boolean
    isError: boolean
    refetch: () => unknown
  }
}) {
  return (
    <div className="query-value" aria-busy={query.isFetching}>
      {value !== undefined ? (
        <div className="stat-value">
          {prefix}
          {number(value)}
        </div>
      ) : (
        <span className="small muted">
          {query.isPending ? 'Carregando…' : 'Indisponível'}
        </span>
      )}
      <div className="small muted" role="status">
        {query.isError ? (
          <>
            <span>
              {value !== undefined
                ? 'Último valor confirmado. Falha ao atualizar.'
                : 'Não foi possível consultar.'}
            </span>{' '}
            <button
              className="message-toggle"
              onClick={() => {
                void query.refetch()
              }}
            >
              Atualizar indicador
            </button>
          </>
        ) : query.isFetching && value !== undefined ? (
          'Atualizando…'
        ) : null}
      </div>
    </div>
  )
}
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
