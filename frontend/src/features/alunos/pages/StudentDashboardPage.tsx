import { ArrowRight, Gift } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/hooks/auth-context'
import { moedasApi } from '@/features/moedas/api/moedas.api'
import { vantagensApi } from '@/features/vantagens/api/vantagens.api'
import { cuponsApi } from '@/features/cupons/api/cupons.api'
import { BalanceCard } from '@/features/moedas/components/BalanceCard'
import { TransactionList } from '@/features/moedas/components/TransactionList'
import { AdvantagePhoto } from '@/features/vantagens/components/AdvantageCard'
import { RedeemDialog } from '@/features/vantagens/components/RedeemDialog'
import { Coin } from '@/shared/components/ui/Brand'
import { PageHeading } from '@/shared/components/ui/PageHeading'
import { QueryState, QueryValue } from '@/shared/components/ui/Feedback'
import type { Advantage } from '@/shared/types/domain'
import { number } from '@/shared/utils/format'
import { DashboardProgress } from '@/features/gamificacao/ProfileRanking'

export function StudentDashboardPage() {
  const { user } = useAuth()
  const [selected, setSelected] = useState<Advantage | null>(null)
  const transactions = useQuery({
    queryKey: ['transactions', user?.id, 'dashboard'],
    queryFn: () => moedasApi.transactions({ size: 4 }),
  })
  const offers = useQuery({
    queryKey: ['advantages'],
    queryFn: () => vantagensApi.list(),
  })
  const coupons = useQuery({
    queryKey: ['coupons', user?.id, 'dashboard'],
    queryFn: () => cuponsApi.list({ status: 'VALIDO', size: 1 }),
  })
  const received = transactions.data?.summary.incoming
  const activeCoupons = coupons.data?.total
  return (
    <>
      <PageHeading
        title={`Olá, ${user?.name.split(' ')[0]}!`}
        description="Seu saldo e histórico de reconhecimento em um só lugar."
      />
      <div className="student-overview">
        <section className="student-wallet" aria-label="Seu saldo e atalhos">
          <BalanceCard balance={user?.balance || 0} />
          <div className="balance-actions">
            <Link className="text-link" to="/aluno/extrato">
              Ver extrato <ArrowRight size={15} />
            </Link>
            <Link className="text-link" to="/aluno/catalogo">
              Explorar vantagens <ArrowRight size={15} />
            </Link>
          </div>
        </section>
        <div className="student-journey">
          <DashboardProgress />
        </div>
      </div>
      <div className="stat-grid">
        <section className="card stat-card">
          <div>
            <p>Pucoins recebidos</p>
            <QueryValue value={received} query={transactions} />
            <small className="muted small">Total histórico</small>
          </div>
        </section>
        <section className="card stat-card">
          <div>
            <p>
              <Link to="/aluno/cupons" className="summary-link">
                Cupons disponíveis <ArrowRight size={13} aria-hidden="true" />
              </Link>
            </p>
            <QueryValue value={activeCoupons} query={coupons} />
          </div>
        </section>
        <section className="card stat-card">
          <div>
            <p>Vantagens no catálogo</p>
            <QueryValue value={offers.data?.length} query={offers} />
          </div>
        </section>
      </div>
      <div className="dashboard-grid">
        <div className="dashboard-column">
          <section className="card">
            <div className="section-heading">
              <h2>Atividade recente</h2>
              <Link to="/aluno/extrato" className="text-link">
                Ver extrato <ArrowRight size={15} />
              </Link>
            </div>
            <QueryState
              loading={transactions.isLoading}
              error={transactions.error}
              retry={transactions.refetch}
            />
            {transactions.data && (
              <TransactionList transactions={transactions.data.items} compact />
            )}
          </section>
        </div>
        <div className="dashboard-column">
          <section className="card">
            <div className="section-heading">
              <h2>Vantagens para você</h2>
              <Gift size={20} className="muted" />
            </div>
            <QueryState
              loading={offers.isLoading}
              error={offers.error}
              retry={offers.refetch}
            />
            {offers.data?.length === 0 && (
              <p className="small muted">
                Nenhuma vantagem disponível no catálogo.
              </p>
            )}
            {offers.data?.slice(0, 2).map((offer) => (
              <button
                key={offer.id}
                className="featured-offer"
                style={{
                  background: 'none',
                  border: 0,
                  textAlign: 'left',
                  width: '100%',
                  paddingLeft: 0,
                  paddingRight: 0,
                }}
                onClick={() => setSelected(offer)}
              >
                <AdvantagePhoto src={offer.photo} alt={offer.name} />
                <div>
                  <h3>{offer.name}</h3>
                  <p>{offer.companyName}</p>
                  <span className="price">
                    <Coin size={20} />
                    {number(offer.cost)}{' '}
                    <span className="sr-only">Pucoins</span>
                  </span>
                </div>
              </button>
            ))}
            <Link
              to="/aluno/catalogo"
              className="text-link"
              style={{ marginTop: 18 }}
            >
              Explorar vantagens <ArrowRight size={15} />
            </Link>
          </section>
        </div>
      </div>
      {selected && (
        <RedeemDialog advantage={selected} onClose={() => setSelected(null)} />
      )}
    </>
  )
}
