import { Select } from '@/shared/components/ui/Select'
import { Download, Search, Wallet } from 'lucide-react'
import { useState } from 'react'
import { DateInput } from '@/shared/components/ui/DateInput'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/hooks/auth-context'
import { moedasApi } from '../api/moedas.api'
import { TransactionList } from '../components/TransactionList'
import { PageHeading } from '@/shared/components/ui/PageHeading'
import { Button } from '@/shared/components/ui/Button'
import {
  QueryState,
  QueryValue,
  EmptyState,
  ErrorNotice,
} from '@/shared/components/ui/Feedback'
import { Pagination } from '@/shared/components/ui/Pagination'
import { useDebouncedValue } from '@/shared/hooks/use-debounced-value'
import { number, downloadBlob } from '@/shared/utils/format'
import type { StatementQuery } from '@/shared/types/domain'
export function StatementPage() {
  const { user } = useAuth()
  const teacher = user?.role === 'PROFESSOR'
  const [search, setSearch] = useState('')
  const [kind, setKind] = useState('all')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [page, setPage] = useState(1)
  const settledSearch = useDebouncedValue(search)
  const searching = settledSearch !== search
  const invalidPeriod = !!from && !!to && from > to
  const filters: StatementQuery = {
    q: settledSearch,
    kind: kind === 'all' ? undefined : (kind as StatementQuery['kind']),
    from,
    to,
    zone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  }
  const transactions = useQuery({
    queryKey: ['transactions', user?.id, 'history', { ...filters, page }],
    queryFn: () =>
      moedasApi.transactions({ ...filters, page: page - 1, size: 12 }),
    enabled: !invalidPeriod && !searching,
    placeholderData: (previous, query) =>
      query?.queryKey[1] === user?.id ? previous : undefined,
  })
  if (
    transactions.data &&
    !transactions.isPlaceholderData &&
    page > Math.max(1, transactions.data.pages)
  ) {
    setPage(Math.max(1, transactions.data.pages))
  }
  const incoming = invalidPeriod
    ? undefined
    : transactions.data?.summary.incoming
  const outgoing = invalidPeriod
    ? undefined
    : transactions.data?.summary.outgoing
  const exportCsv = useMutation({
    mutationFn: (query: StatementQuery) => moedasApi.exportTransactions(query),
    onSuccess: (blob) => downloadBlob('extrato-puclim.csv', blob),
  })
  return (
    <>
      <PageHeading
        eyebrow="Cada movimento, uma história"
        title="Meu extrato"
        description={
          teacher
            ? 'Acompanhe sua cota e os reconhecimentos que você enviou.'
            : 'Veja de onde vieram e para onde foram suas conquistas.'
        }
        action={
          <Button
            variant="secondary"
            disabled={
              invalidPeriod ||
              searching ||
              transactions.isFetching ||
              !transactions.data?.total
            }
            loading={exportCsv.isPending}
            onClick={() => exportCsv.mutate(filters)}
          >
            <Download size={17} /> Baixar extrato
          </Button>
        }
      />
      <div className="stat-grid">
        <section className="card stat-card">
          <span className="stat-icon">
            <Wallet size={22} />
          </span>
          <div>
            <div className="stat-value">{number(user?.balance || 0)}</div>
            <p>Saldo atual de Pucoins</p>
          </div>
        </section>
        <section className="card stat-card">
          <div>
            <QueryValue
              value={incoming}
              prefix={incoming && incoming > 0 ? '+' : ''}
              query={transactions}
            />
            <p>Entradas no período filtrado</p>
          </div>
        </section>
        <section className="card stat-card">
          <div>
            <QueryValue
              value={outgoing}
              prefix={outgoing && outgoing > 0 ? '−' : ''}
              query={transactions}
            />
            <p>Saídas no período filtrado</p>
          </div>
        </section>
      </div>
      <section
        className="card"
        aria-busy={transactions.isFetching || searching}
      >
        <div className="toolbar">
          <div className="search-field">
            <Search size={19} />
            <input
              aria-label={
                teacher ? 'Buscar por aluno ou motivo' : 'Buscar movimentação'
              }
              placeholder={
                teacher ? 'Buscar aluno ou motivo' : 'Buscar uma movimentação'
              }
              value={search}
              maxLength={200}
              onChange={(event) => {
                setSearch(event.target.value)
                setPage(1)
              }}
            />
          </div>
          <Select
            aria-label="Tipo de movimentação"
            value={kind}
            onValueChange={(value) => {
              setKind(value)
              setPage(1)
            }}
            style={{ width: 'auto' }}
          >
            <option value="all">Todos os tipos</option>
            <option value="in">Entradas</option>
            <option value="out">Saídas</option>
            {(teacher
              ? [
                  ['COTA', 'Cota semestral'],
                  ['ENVIO', 'Envio de moedas'],
                  ['RESERVA', 'Reserva de missão'],
                  ['LIBERACAO', 'Liberação de reserva'],
                ]
              : [
                  ['RECEBIMENTO', 'Reconhecimentos'],
                  ['TRANSF_ENVIO', 'Transferências enviadas'],
                  ['TRANSF_ENTRADA', 'Transferências recebidas'],
                  ['RESGATE', 'Resgates'],
                  ['MISSAO', 'Missões'],
                  ['BONUS', 'Bônus'],
                  ['RECOMPENSA', 'Recompensas de streak'],
                  ['PREMIO', 'Prêmios do semestre'],
                  ['DOACAO', 'Doações'],
                ]
            ).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>
        <div className="form-grid" style={{ marginBottom: 20 }}>
          <div className="field">
            <label htmlFor="from">De</label>
            <DateInput
              id="from"
              label="De"
              type="date"
              value={from}
              onChange={(event) => {
                setFrom(event.target.value)
                setPage(1)
              }}
            />
          </div>
          <div className="field">
            <label htmlFor="to">Até</label>
            <DateInput
              id="to"
              label="Até"
              type="date"
              value={to}
              min={from || undefined}
              onChange={(event) => {
                setTo(event.target.value)
                setPage(1)
              }}
            />
          </div>
        </div>
        {invalidPeriod && (
          <p className="notice notice-error" role="alert">
            A data inicial deve ser anterior ou igual à data final.
          </p>
        )}
        <QueryState
          loading={!invalidPeriod && transactions.isPending}
          error={transactions.error}
          retry={transactions.refetch}
        />
        <ErrorNotice error={exportCsv.error} />
        <p className="small muted" role="status">
          {!invalidPeriod &&
          (searching || (transactions.isFetching && !transactions.isPending))
            ? 'Atualizando resultados…'
            : ''}
        </p>
        {transactions.data &&
          !invalidPeriod &&
          (transactions.data.total ? (
            <>
              <p className="small muted">
                {transactions.data.total}{' '}
                {transactions.data.total === 1
                  ? 'movimentação encontrada'
                  : 'movimentações encontradas'}
              </p>
              <TransactionList transactions={transactions.data.items} />
              <Pagination
                page={transactions.data.page + 1}
                total={transactions.data.total}
                size={12}
                onChange={setPage}
                disabled={transactions.isFetching || searching}
                label="Páginas do extrato"
              />
            </>
          ) : (
            <EmptyState
              title="Nada por aqui neste período"
              description="Experimente ajustar os filtros para encontrar suas movimentações."
              action={
                <Button
                  variant="secondary"
                  onClick={() => {
                    setSearch('')
                    setKind('all')
                    setFrom('')
                    setTo('')
                    setPage(1)
                  }}
                >
                  Limpar filtros
                </Button>
              }
            />
          ))}
      </section>
    </>
  )
}
