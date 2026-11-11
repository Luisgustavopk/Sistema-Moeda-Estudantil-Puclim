import { useState } from 'react'
import { Search } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router'
import { useAuth } from '@/features/auth/hooks/auth-context'
import { cuponsApi } from '../api/cupons.api'
import { CouponCard } from '../components/CouponCard'
import { PageHeading } from '@/shared/components/ui/PageHeading'
import { QueryState, EmptyState } from '@/shared/components/ui/Feedback'
import { Pagination } from '@/shared/components/ui/Pagination'
import { useDebouncedValue } from '@/shared/hooks/use-debounced-value'
import type { Coupon } from '@/shared/types/domain'
import { Button } from '@/shared/components/ui/Button'
export function CouponsPage() {
  const { user } = useAuth()
  const [status, setStatus] = useState<Coupon['status'] | 'all'>('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const settledSearch = useDebouncedValue(search)
  const searching = search !== settledSearch
  const filters = {
    page: page - 1,
    size: 12,
    q: settledSearch,
    status: status === 'all' ? undefined : status,
  }
  const query = useQuery({
    queryKey: ['coupons', user?.id, 'history', filters],
    queryFn: () => cuponsApi.list(filters),
    enabled: !searching,
    placeholderData: (previous, query) =>
      query?.queryKey[1] === user?.id ? previous : undefined,
    refetchInterval: 15000,
  })
  if (
    query.data &&
    !query.isPlaceholderData &&
    page > Math.max(1, query.data.pages)
  ) {
    setPage(Math.max(1, query.data.pages))
  }
  return (
    <>
      <PageHeading
        eyebrow="Prontos para fazer parte do seu dia"
        title="Meus cupons"
        description="Suas conquistas estão aqui. Escolha uma e aproveite."
      />
      <div className="toolbar">
        <div className="search-field">
          <Search size={19} aria-hidden="true" />
          <input
            aria-label="Buscar cupom"
            placeholder="Buscar por código, vantagem ou empresa"
            maxLength={200}
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
              setPage(1)
            }}
          />
        </div>
        {(search || status !== 'all') && (
          <Button
            variant="ghost"
            onClick={() => {
              setSearch('')
              setStatus('all')
              setPage(1)
            }}
          >
            Limpar filtros
          </Button>
        )}
      </div>
      <div className="chips" style={{ marginBottom: 25 }}>
        {(
          [
            { value: 'all', label: 'Todos' },
            { value: 'VALIDO', label: 'Disponíveis' },
            { value: 'UTILIZADO', label: 'Utilizados' },
            { value: 'DOADO', label: 'Doados' },
          ] as const
        ).map((item) => (
          <button
            key={item.value}
            className={`chip ${status === item.value ? 'active' : ''}`}
            aria-pressed={status === item.value}
            onClick={() => {
              setStatus(item.value)
              setPage(1)
            }}
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
      <p className="small muted" role="status">
        {searching || (query.isFetching && !query.isPending)
          ? 'Atualizando cupons…'
          : ''}
      </p>
      {query.data &&
        (query.data.total ? (
          <section aria-busy={query.isFetching || searching}>
            <div className="coupon-grid">
              {query.data.items.map((coupon) => (
                <CouponCard key={coupon.id} coupon={coupon} />
              ))}
            </div>
            <Pagination
              page={query.data.page + 1}
              size={12}
              total={query.data.total}
              onChange={setPage}
              disabled={query.isFetching || searching}
              label="Páginas dos cupons"
            />
          </section>
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
