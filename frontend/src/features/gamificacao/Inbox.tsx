import { useEffect, useRef, useState } from 'react'
import { Award, CheckCheck, Flag, TrendingUp } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/hooks/auth-context'
import { useToast } from '@/shared/hooks/toast-context'
import { DATA_MODE } from '@/shared/lib/http'
import { Button } from '@/shared/components/ui/Button'
import { QueryState } from '@/shared/components/ui/Feedback'
import {
  ExpandableMessage,
  ListItem,
  Panel,
  StatusBadge,
} from '@/shared/components/ui/ActivitySurface'
import { dateTime } from '@/shared/utils/format'
import { gameApi } from './api'
import { useGameAction } from './hooks'
import { Pagination } from '@/shared/components/ui/Pagination'
import { usePagination } from '@/shared/hooks/use-pagination'

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
  const [unread, setUnread] = useState(false)
  const read = useGameAction(gameApi.read, 'Notificação marcada como lida.')
  const rows = query.data?.filter((n) => !unread || !n.readAt)
  const pagination = usePagination(rows || [], 8)
  if (DATA_MODE === 'demo')
    return (
      <Panel>
        <p>
          As atividades de gamificação estão disponíveis no ambiente integrado.
        </p>
      </Panel>
    )
  return (
    <Panel className="inbox-panel">
      <div className="section-heading">
        <h2>Conquistas e atividades</h2>
        <div
          className="merit-filters"
          role="group"
          aria-label="Filtrar atividades"
        >
          <button
            className="merit-chip"
            aria-pressed={!unread}
            onClick={() => {
              setUnread(false)
              pagination.setPage(1)
            }}
          >
            Todas
          </button>
          <button
            className="merit-chip"
            aria-pressed={unread}
            onClick={() => {
              setUnread(true)
              pagination.setPage(1)
            }}
          >
            Não lidas
            {query.data
              ? ` (${query.data.filter((n) => !n.readAt).length})`
              : ''}
          </button>
        </div>
      </div>
      <QueryState
        loading={query.isLoading}
        error={query.error}
        retry={query.refetch}
      />
      {rows?.length === 0 && (
        <p className="activity-empty">
          {unread
            ? 'Nenhuma atividade não lida. Tudo em dia!'
            : 'Suas conquistas e novidades aparecerão aqui.'}
        </p>
      )}
      <div className="activity-list">
        {pagination.items.map((n) => {
          const Icon = n.type.includes('BADGE')
            ? Award
            : n.type.includes('LEVEL')
              ? TrendingUp
              : Flag
          return (
            <ListItem
              className={`notice-item ${!n.readAt ? 'is-unread' : ''}`}
              key={n.id}
            >
              <Icon size={24} className="activity-glyph" aria-hidden="true" />
              <div className="activity-item-content">
                <div className="activity-item-heading">
                  <h3>{n.title}</h3>
                  {!n.readAt && <StatusBadge tone="info">Nova</StatusBadge>}
                </div>
                <ExpandableMessage text={n.message} />
                <time dateTime={n.date}>{dateTime(n.date)}</time>
              </div>
              {!n.readAt && (
                <Button
                  variant="ghost"
                  className="notice-read"
                  loading={read.isPending}
                  onClick={() => read.mutate(n.id)}
                >
                  <CheckCheck size={16} aria-hidden="true" /> Marcar como lida
                </Button>
              )}
            </ListItem>
          )
        })}
      </div>
      <Pagination
        page={pagination.page}
        total={rows?.length || 0}
        size={8}
        onChange={pagination.setPage}
        label="Páginas de atividades"
      />
    </Panel>
  )
}
