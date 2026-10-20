import { useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/hooks/auth-context'
import { useToast } from '@/shared/hooks/toast-context'
import { DATA_MODE } from '@/shared/lib/http'
import { Button } from '@/shared/components/ui/Button'
import { QueryState } from '@/shared/components/ui/Feedback'
import { dateTime } from '@/shared/utils/format'
import { gameApi } from './api'
import { useGameAction } from './hooks'

function useInbox() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['game', 'inbox', user?.id],
    queryFn: gameApi.notices,
    enabled: DATA_MODE === 'api',
    refetchInterval: 15000,
  })
}
export function AchievementFeed() {
  const { user } = useAuth()
  const query = useInbox()
  const toast = useToast()
  const previous = useRef<{ userId?: string; ids: Set<string> } | null>(null)
  useEffect(() => {
    if (!query.data) return
    if (previous.current && previous.current.userId === user?.id)
      for (const n of query.data) {
        if (!n.readAt && !previous.current.ids.has(n.id))
          toast(`${n.title} ${n.message}`)
      }
    previous.current = {
      userId: user?.id,
      ids: new Set(query.data.map((n) => n.id)),
    }
  }, [query.data, user?.id, toast])
  return null
}
export function Inbox() {
  const query = useInbox()
  const read = useGameAction(gameApi.read, 'Notificação marcada como lida.')
  if (DATA_MODE === 'demo') return null
  return (
    <section className="card">
      <h2>Conquistas e atividades</h2>
      <QueryState
        loading={query.isLoading}
        error={query.error}
        retry={query.refetch}
      />
      {query.data?.length === 0 && (
        <p>Suas conquistas e novidades aparecerão aqui.</p>
      )}
      {query.data?.map((n) => (
        <article className="row" key={n.id}>
          <div className="row-text">
            <strong>{n.title}</strong>
            <span className="badge">{n.readAt ? 'Lida' : 'Nova'}</span>
            <p className="notification-body">{n.message}</p>
            <p>{dateTime(n.date)}</p>
          </div>
          {!n.readAt && (
            <Button
              variant="ghost"
              loading={read.isPending}
              onClick={() => read.mutate(n.id)}
            >
              Marcar como lida
            </Button>
          )}
        </article>
      ))}
    </section>
  )
}
