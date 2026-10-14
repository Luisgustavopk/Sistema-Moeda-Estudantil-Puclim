import {
  ArrowRight,
  Gift,
  GraduationCap,
  HeartHandshake,
  Plus,
  ScanLine,
  Ticket,
  Users,
} from 'lucide-react'
import { Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/hooks/auth-context'
import { vantagensApi } from '@/features/vantagens/api/vantagens.api'
import { cuponsApi } from '@/features/cupons/api/cupons.api'
import { instituicoesApi } from '@/features/instituicoes/api/instituicoes.api'
import { PageHeading } from '@/shared/components/ui/PageHeading'
import { QueryState } from '@/shared/components/ui/Feedback'
import { dateTime } from '@/shared/utils/format'

export function PartnerDashboardPage() {
  const { user } = useAuth()
  const isCompany = user?.partnerKind === 'EMPRESA'
  const isInstitution = user?.partnerKind === 'ENSINO'
  const advantages = useQuery({
    queryKey: ['own-advantages', user?.id],
    queryFn: () => vantagensApi.list(true),
    enabled: isCompany,
  })
  const coupons = useQuery({
    queryKey: ['coupons', user?.id],
    queryFn: cuponsApi.list,
    enabled: isCompany,
  })
  const teachers = useQuery({
    queryKey: ['teachers', user?.id],
    queryFn: instituicoesApi.teachers,
    enabled: isInstitution,
  })
  return (
    <>
      <PageHeading
        eyebrow="Uma parceria que faz a diferença"
        title={`Olá, ${user?.name}!`}
        description={
          isCompany
            ? 'Conecte sua marca às conquistas de quem faz o campus acontecer.'
            : isInstitution
              ? 'Prepare o caminho para reconhecer seus alunos e professores.'
              : 'Sua organização faz parte de uma rede de boas atitudes.'
        }
        action={
          isCompany && (
            <Link
              to="/empresa/vantagens/nova"
              className="button button-primary"
            >
              <Plus size={18} /> Nova vantagem
            </Link>
          )
        }
      />
      {isCompany ? (
        <>
          <div className="stat-grid">
            <div className="card stat-card">
              <span className="stat-icon">
                <Gift size={21} />
              </span>
              <div>
                <div className="stat-value">
                  {advantages.data?.filter((item) => item.active).length || 0}
                </div>
                <p>Vantagens ativas</p>
              </div>
            </div>
            <div className="card stat-card">
              <span className="stat-icon">
                <Ticket size={21} />
              </span>
              <div>
                <div className="stat-value">{coupons.data?.length || 0}</div>
                <p>Resgates realizados</p>
              </div>
            </div>
            <div className="card stat-card">
              <span className="stat-icon">
                <ScanLine size={21} />
              </span>
              <div>
                <div className="stat-value">
                  {coupons.data?.filter((item) => item.status === 'UTILIZADO')
                    .length || 0}
                </div>
                <p>Cupons utilizados</p>
              </div>
            </div>
          </div>
          <div className="dashboard-bottom">
            <section className="card">
              <div className="section-heading">
                <h2>Últimos resgates</h2>
                <Link to="/empresa/cupons" className="text-link">
                  Conferir cupom <ArrowRight size={15} />
                </Link>
              </div>
              <QueryState
                loading={coupons.isLoading}
                error={coupons.error}
                retry={coupons.refetch}
              />
              {coupons.data?.length === 0 && (
                <p className="muted small">
                  Os resgates dos alunos aparecerão aqui.
                </p>
              )}
              {coupons.data?.slice(0, 5).map((item) => (
                <div key={item.id} className="row">
                  <Ticket size={20} className="muted" />
                  <div className="row-text">
                    <strong>{item.advantageName}</strong>
                    <p>
                      {item.studentName} · {dateTime(item.date)}
                    </p>
                  </div>
                  <span
                    className={`badge ${item.status === 'VALIDO' ? 'badge-success' : ''}`}
                  >
                    {item.status === 'VALIDO' ? 'Disponível' : 'Utilizado'}
                  </span>
                </div>
              ))}
            </section>
            <section className="card">
              <div className="section-heading">
                <h2>Sua parceria em ação</h2>
                <HeartHandshake size={23} className="muted" />
              </div>
              <div className="quick-links">
                <Link className="quick-link" to="/empresa/vantagens">
                  <Gift size={21} />
                  <div>
                    <strong>Gerenciar vantagens</strong>
                    <small>Cuide do que você oferece aos alunos.</small>
                  </div>
                  <ArrowRight size={17} />
                </Link>
                <Link className="quick-link" to="/empresa/cupons">
                  <ScanLine size={21} />
                  <div>
                    <strong>Conferir um cupom</strong>
                    <small>Confirme a troca no atendimento.</small>
                  </div>
                  <ArrowRight size={17} />
                </Link>
              </div>
              <QueryState
                loading={false}
                error={advantages.error}
                retry={advantages.refetch}
              />
            </section>
          </div>
        </>
      ) : (
        <section className="card welcome-card">
          <div>
            <span className="intro-icon">
              {isInstitution ? (
                <GraduationCap size={24} />
              ) : (
                <HeartHandshake size={24} />
              )}
            </span>
            <h2>
              {isInstitution
                ? 'Sua comunidade começa aqui.'
                : 'Boas-vindas à nossa rede.'}
            </h2>
            <p>
              {isInstitution
                ? 'Sua instituição já está disponível no cadastro dos alunos. Importe os professores para que possam começar a reconhecer boas atitudes.'
                : 'Seu cadastro está pronto. O recebimento de doações será disponibilizado na próxima etapa do projeto.'}
            </p>
          </div>
          {isInstitution && (
            <>
              <QueryState
                loading={teachers.isLoading}
                error={teachers.error}
                retry={teachers.refetch}
              />
              <Link className="quick-link" to="/empresa/professores">
                <Users size={21} />
                <div>
                  <strong>Professores da instituição</strong>
                  <small>
                    {teachers.data?.length || 0} professores vinculados ·
                    importar e consultar
                  </small>
                </div>
                <ArrowRight size={17} />
              </Link>
            </>
          )}
        </section>
      )}
    </>
  )
}
