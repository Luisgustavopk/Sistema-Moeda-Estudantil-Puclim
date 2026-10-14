import { Gift, Search } from 'lucide-react'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/hooks/auth-context'
import { vantagensApi } from '../api/vantagens.api'
import { AdvantageCard } from '../components/AdvantageCard'
import { RedeemDialog } from '../components/RedeemDialog'
import { PageHeading } from '@/shared/components/ui/PageHeading'
import { Coin } from '@/shared/components/ui/Brand'
import { QueryState, EmptyState } from '@/shared/components/ui/Feedback'
import { Button } from '@/shared/components/ui/Button'
import { number } from '@/shared/utils/format'
import type { Advantage } from '@/shared/types/domain'
export function CatalogPage() {
  const { user } = useAuth()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('Todas')
  const [selected, setSelected] = useState<Advantage | null>(null)
  const query = useQuery({
    queryKey: ['advantages'],
    queryFn: () => vantagensApi.list(),
  })
  const items =
    query.data?.filter(
      (item) =>
        (category === 'Todas' || item.category === category) &&
        `${item.name} ${item.companyName}`
          .toLocaleLowerCase('pt-BR')
          .includes(search.toLocaleLowerCase('pt-BR')),
    ) || []
  return (
    <>
      <PageHeading
        eyebrow="Seu mérito abre possibilidades"
        title="Catálogo de vantagens"
        description="Troque suas Pucoins em empresas parceiras."
        action={
          <div className="catalog-balance">
            <Coin size={24} />
            <span>
              Seu saldo <strong>{number(user?.balance || 0)}</strong> Pucoins
            </span>
          </div>
        }
      />
      <div className="toolbar">
        <div className="search-field">
          <Search size={19} />
          <input
            aria-label="Buscar vantagem ou empresa"
            placeholder="Buscar vantagem ou empresa"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <span
          className="small muted"
          style={{ display: 'flex', gap: 7, alignItems: 'center' }}
        >
          <Gift size={17} /> {items.length} vantagens encontradas
        </span>
      </div>
      <div className="chips" style={{ marginBottom: 18 }}>
        {['Todas', 'Alimentação', 'Material', 'Eventos', 'Descontos'].map(
          (item) => (
            <button
              key={item}
              type="button"
              className={`chip ${category === item ? 'active' : ''}`}
              aria-pressed={category === item}
              onClick={() => setCategory(item)}
            >
              {item}
            </button>
          ),
        )}
      </div>
      <QueryState
        loading={query.isLoading}
        error={query.error}
        retry={query.refetch}
      />
      {query.data &&
        (items.length ? (
          <div className="offers-grid">
            {items.map((item) => (
              <AdvantageCard
                key={item.id}
                advantage={item}
                balance={user?.balance || 0}
                onSelect={setSelected}
              />
            ))}
          </div>
        ) : (
          <section className="card">
            <EmptyState
              title="Vamos procurar de outro jeito?"
              description="Não encontramos vantagens com estes filtros. Tente outro nome ou categoria."
              action={
                <Button
                  variant="secondary"
                  onClick={() => {
                    setSearch('')
                    setCategory('Todas')
                  }}
                >
                  Limpar filtros
                </Button>
              }
            />
          </section>
        ))}
      {selected && (
        <RedeemDialog advantage={selected} onClose={() => setSelected(null)} />
      )}
    </>
  )
}
