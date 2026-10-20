import { Bell, Mail } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/hooks/auth-context'
import { notificacoesApi } from '../api/notificacoes.api'
import { PageHeading } from '@/shared/components/ui/PageHeading'
import { QueryState, EmptyState } from '@/shared/components/ui/Feedback'
import { dateTime } from '@/shared/utils/format'
import { DATA_MODE } from '@/shared/lib/http'
import { Inbox } from '@/features/gamificacao/Inbox'
export function NotificationsPage() {
  const { user } = useAuth()
  const query = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: notificacoesApi.list,
  })
  return (
    <div className="reading-page">
      <PageHeading
        eyebrow="Novidades que fazem parte da sua história"
        title="Suas notificações"
        description="Reconhecimentos, resgates e mensagens em um só lugar."
      />
      {DATA_MODE === 'demo' && (
        <p className="notice notice-info" style={{ marginBottom: 22 }}>
          <Mail size={18} />
          Neste ambiente, os avisos por e-mail são simulados. Nenhuma mensagem é
          enviada para endereços reais.
        </p>
      )}
      <Inbox />
      <section className="card">
        <QueryState
          loading={query.isLoading}
          error={query.error}
          retry={query.refetch}
        />
        {query.data?.length === 0 && (
          <EmptyState
            title="Tudo em dia por aqui"
            description="Quando houver um reconhecimento ou resgate, a novidade aparecerá neste espaço."
          />
        )}
        {query.data?.map((item) => (
          <article
            key={item.id}
            className="row"
            style={{ alignItems: 'flex-start' }}
          >
            <span className="stat-icon" style={{ flexShrink: 0 }}>
              <Bell size={20} />
            </span>
            <div className="row-text">
              <strong>{item.subject}</strong>
              {item.deliveryStatus && (
                <span
                  className={`badge ${item.deliveryStatus === 'ENVIADO' ? 'badge-success' : ''}`}
                >
                  {item.deliveryStatus === 'ENVIADO'
                    ? 'E-mail enviado'
                    : 'E-mail aguardando envio'}
                </span>
              )}
              <p className="notification-body">{item.body}</p>
              <p style={{ marginTop: 10 }}>
                {dateTime(item.date)} · {item.recipient}
              </p>
            </div>
          </article>
        ))}
      </section>
    </div>
  )
}
