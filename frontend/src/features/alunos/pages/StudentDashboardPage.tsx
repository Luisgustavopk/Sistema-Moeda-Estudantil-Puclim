import { ArrowRight, Gift, Ticket, Wallet } from 'lucide-react'
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
import { QueryState } from '@/shared/components/ui/Feedback'
import type { Advantage } from '@/shared/types/domain'
import { number } from '@/shared/utils/format'

export function StudentDashboardPage() {
  const { user } = useAuth()
  const [selected, setSelected] = useState<Advantage | null>(null)
  const transactions = useQuery({
    queryKey: ['transactions', user?.id],
    queryFn: () => moedasApi.transactions(),
  })
  const offers = useQuery({
    queryKey: ['advantages'],
    queryFn: () => vantagensApi.list(),
  })
  const coupons = useQuery({
    queryKey: ['coupons', user?.id],
    queryFn: cuponsApi.list,
  })
  const received =
    transactions.data
      ?.filter((value) => value.amount > 0)
      .reduce((total, value) => total + value.amount, 0) || 0
  const activeCoupons =
    coupons.data?.filter((value) => value.status === 'VALIDO').length || 0
  return (
    <>
      <PageHeading
        title={`Olá, ${user?.name.split(' ')[0]}!`}
        description="Seu reconhecimento deste semestre em um só lugar."
      />
      <div className="dashboard-grid">
        <div className="dashboard-column">
          <BalanceCard balance={user?.balance || 0} />
          <div className="stat-grid">
            <section className="card stat-card">
              <div>
                <p>Pucoins recebidos</p>
                <div className="stat-value">{number(received)}</div>
              </div>
            </section>
            <section className="card stat-card">
              <div>
                <p>Cupons disponíveis</p>
                <div className="stat-value">{activeCoupons}</div>
              </div>
            </section>
            <section className="card stat-card">
              <div>
                <p>Vantagens no catálogo</p>
                <div className="stat-value">{offers.data?.length || 0}</div>
              </div>
            </section>
          </div>
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
              <TransactionList
                transactions={transactions.data.slice(0, 4)}
                compact
              />
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
          <section className="card">
            <h2 style={{ marginBottom: 12 }}>Seu próximo passo</h2>
            <div className="quick-links">
              <Link className="quick-link" to="/aluno/cupons">
                <Ticket size={20} />
                <div>
                  <strong>Meus cupons</strong>
                  <small>
                    {activeCoupons
                      ? `${activeCoupons} disponíveis para aproveitar`
                      : 'Suas vantagens resgatadas ficam aqui'}
                  </small>
                </div>
                <ArrowRight size={17} />
              </Link>
              <Link className="quick-link" to="/aluno/extrato">
                <Wallet size={20} />
                <div>
                  <strong>Acompanhar meu saldo</strong>
                  <small>Veja tudo que entrou e saiu</small>
                </div>
                <ArrowRight size={17} />
              </Link>
            </div>
            <QueryState
              loading={false}
              error={coupons.error}
              retry={coupons.refetch}
            />
          </section>
        </div>
      </div>
      {selected && (
        <RedeemDialog advantage={selected} onClose={() => setSelected(null)} />
      )}
    </>
  )
}
