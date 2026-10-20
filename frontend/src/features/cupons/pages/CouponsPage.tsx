import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router'
import { useAuth } from '@/features/auth/hooks/auth-context'
import { cuponsApi } from '../api/cupons.api'
import { CouponCard } from '../components/CouponCard'
import { PageHeading } from '@/shared/components/ui/PageHeading'
import { QueryState, EmptyState } from '@/shared/components/ui/Feedback'
export function CouponsPage() {
  const { user } = useAuth()
  const [status, setStatus] = useState('all')
  const query = useQuery({
    queryKey: ['coupons', user?.id],
    queryFn: cuponsApi.list,
    refetchInterval: 15000,
  })
  const coupons =
    query.data?.filter((item) => status === 'all' || item.status === status) ||
    []
  return (
    <>
      <PageHeading
        eyebrow="Prontos para fazer parte do seu dia"
        title="Meus cupons"
        description="Suas conquistas estão aqui. Escolha uma e aproveite."
      />
      <div className="chips" style={{ marginBottom: 25 }}>
        {[
          { value: 'all', label: 'Todos' },
          { value: 'VALIDO', label: 'Disponíveis' },
          { value: 'UTILIZADO', label: 'Utilizados' },
          { value: 'DOADO', label: 'Doados' },
        ].map((item) => (
          <button
            key={item.value}
            className={`chip ${status === item.value ? 'active' : ''}`}
            aria-pressed={status === item.value}
            onClick={() => setStatus(item.value)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <QueryState
        loading={query.isLoading}
        error={query.error}
        retry={query.refetch}
      />
      {query.data &&
        (coupons.length ? (
          <div className="coupon-grid">
            {coupons.map((coupon) => (
              <CouponCard key={coupon.id} coupon={coupon} />
            ))}
          </div>
        ) : (
          <section className="card">
            <EmptyState
              title="Uma vantagem está esperando por você"
              description="Seus cupons aparecerão aqui depois de um resgate. Se já resgatou, experimente outro filtro."
              action={
                <Link className="button button-primary" to="/aluno/catalogo">
                  Explorar vantagens
                </Link>
              }
            />
          </section>
        ))}
    </>
  )
}
