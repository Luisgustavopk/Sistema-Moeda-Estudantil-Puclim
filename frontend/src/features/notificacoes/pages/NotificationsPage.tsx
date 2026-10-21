import { useState } from 'react'
import { Bell, Mail } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/hooks/auth-context'
import { notificacoesApi } from '../api/notificacoes.api'
import { PageHeading } from '@/shared/components/ui/PageHeading'
import { QueryState, EmptyState } from '@/shared/components/ui/Feedback'
import {
  ExpandableMessage,
  ListItem,
  Panel,
  StatusBadge,
} from '@/shared/components/ui/ActivitySurface'
import { dateTime } from '@/shared/utils/format'
import { DATA_MODE } from '@/shared/lib/http'
import { Inbox } from '@/features/gamificacao/Inbox'
import { Pagination } from '@/shared/components/ui/Pagination'
import { usePagination } from '@/shared/hooks/use-pagination'

export function NotificationsPage() {
  const { user } = useAuth()
  const [tab, setTab] = useState(DATA_MODE === 'demo' ? 'email' : 'activity')
  const query = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: notificacoesApi.list,
    enabled: tab === 'email',
  })
  const pagination = usePagination(query.data || [], 8)
  return (
    <div className="merit-page reading-page notifications-page">
      <PageHeading
        title="Suas notificações"
        description="Reconhecimentos e mensagens que acompanham sua trajetória."
      />
      <div
        className="activity-tabs"
        role="tablist"
        aria-label="Tipo de notificação"
        onKeyDown={(event) => {
          if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key))
            return
          event.preventDefault()
          const next =
            event.key === 'Home'
              ? 'activity'
              : event.key === 'End'
                ? 'email'
                : tab === 'activity'
                  ? 'email'
                  : 'activity'
          setTab(next)
          document.getElementById(`${next}-tab`)?.focus()
        }}
      >
        <button
          id="activity-tab"
          role="tab"
          aria-selected={tab === 'activity'}
          tabIndex={tab === 'activity' ? 0 : -1}
          aria-controls="activity-notices"
          onClick={() => setTab('activity')}
        >
          <Bell size={18} aria-hidden="true" />
          Atividades
        </button>
        <button
          id="email-tab"
          role="tab"
          aria-selected={tab === 'email'}
          tabIndex={tab === 'email' ? 0 : -1}
          aria-controls="email-notices"
          onClick={() => setTab('email')}
        >
          <Mail size={18} aria-hidden="true" />
          E-mails
        </button>
      </div>
      {tab === 'activity' ? (
        <div
          id="activity-notices"
          role="tabpanel"
          aria-labelledby="activity-tab"
        >
          <Inbox />
        </div>
      ) : (
        <div
          id="email-notices"
          role="tabpanel"
          aria-labelledby="email-tab"
          className="activity-stack"
        >
          {DATA_MODE === 'demo' && (
            <p className="notice notice-info">
              Neste ambiente, os avisos por e-mail são simulados. Nenhuma
              mensagem é enviada para endereços reais.
            </p>
          )}
          <Panel>
            <h2>Avisos por e-mail</h2>
            <QueryState
              loading={query.isLoading}
              error={query.error}
              retry={query.refetch}
            />
            {query.data?.length === 0 && (
              <EmptyState
                title="Nenhum e-mail por aqui"
                description="Os avisos de reconhecimentos e resgates aparecerão aqui."
              />
            )}
            <div className="activity-list">
              {pagination.items.map((item) => (
                <ListItem className="email-item" key={item.id}>
                  <Mail
                    size={22}
                    className="activity-glyph"
                    aria-hidden="true"
                  />
                  <div className="activity-item-content">
                    <div className="activity-item-heading">
                      <h3>{item.subject}</h3>
                      {item.deliveryStatus && (
                        <StatusBadge
                          tone={
                            item.deliveryStatus === 'ENVIADO'
                              ? 'success'
                              : 'warning'
                          }
                        >
                          {item.deliveryStatus === 'ENVIADO'
                            ? 'Enviado'
                            : 'Aguardando envio'}
                        </StatusBadge>
                      )}
                    </div>
                    <ExpandableMessage text={item.body} />
                    <p className="activity-meta">
                      <time dateTime={item.date}>{dateTime(item.date)}</time>
                      <span>Para {item.recipient}</span>
                    </p>
                  </div>
                </ListItem>
              ))}
            </div>
            <Pagination
              page={pagination.page}
              total={query.data?.length || 0}
              size={8}
              onChange={pagination.setPage}
              label="Páginas de e-mails"
            />
          </Panel>
        </div>
      )}
    </div>
  )
}
