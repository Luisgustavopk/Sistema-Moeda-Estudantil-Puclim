import { Download, Search, Wallet } from 'lucide-react'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/hooks/auth-context'
import { moedasApi } from '../api/moedas.api'
import { TransactionList } from '../components/TransactionList'
import { PageHeading } from '@/shared/components/ui/PageHeading'
import { Button } from '@/shared/components/ui/Button'
import { QueryState, EmptyState } from '@/shared/components/ui/Feedback'
import { number, downloadText, dateTime } from '@/shared/utils/format'
const csv = (value: string) =>
  `"${(/^[=+\-@]/.test(value) ? `'${value}` : value).replace(/"/g, '""')}"`
export function StatementPage() {
  const { user } = useAuth()
  const teacher = user?.role === 'PROFESSOR'
  const transactions = useQuery({
    queryKey: ['transactions', user?.id],
    queryFn: moedasApi.transactions,
  })
  const [search, setSearch] = useState('')
  const [kind, setKind] = useState('all')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const invalidPeriod = !!from && !!to && from > to
  const filtered = (transactions.data || []).filter((item) => {
    const text =
      `${item.description} ${item.counterpart || ''} ${item.reason || ''}`.toLocaleLowerCase(
        'pt-BR',
      )
    const date = new Date(item.date)
    const localDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    return (
      !invalidPeriod &&
      text.includes(search.toLocaleLowerCase('pt-BR')) &&
      (kind === 'all' ||
        (kind === 'in'
          ? item.amount > 0
          : kind === 'out'
            ? item.amount < 0
            : item.kind === kind)) &&
      (!from || localDate >= from) &&
      (!to || localDate <= to)
    )
  })
  const incoming = filtered
    .filter((item) => item.amount > 0)
    .reduce((sum, item) => sum + item.amount, 0)
  const outgoing = filtered
    .filter((item) => item.amount < 0)
    .reduce((sum, item) => sum - item.amount, 0)
  const exportCsv = () =>
    downloadText(
      'extrato-puclim.csv',
      [
        'Data;Tipo;Descrição;Pessoa ou empresa;Motivo;Pucoins',
        ...filtered.map((item) =>
          [
            csv(dateTime(item.date)),
            csv(item.kind),
            csv(item.description),
            csv(item.counterpart || ''),
            csv(item.reason || ''),
            item.amount,
          ].join(';'),
        ),
      ].join('\r\n'),
    )
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
            disabled={!filtered.length}
            onClick={exportCsv}
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
            <div className="stat-value positive">+{number(incoming)}</div>
            <p>Entradas no período filtrado</p>
          </div>
        </section>
        <section className="card stat-card">
          <div>
            <div className="stat-value negative">−{number(outgoing)}</div>
            <p>Saídas no período filtrado</p>
          </div>
        </section>
      </div>
      <section className="card">
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
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <select
            aria-label="Tipo de movimentação"
            value={kind}
            onChange={(event) => setKind(event.target.value)}
            style={{ width: 'auto' }}
          >
            <option value="all">Todos os tipos</option>
            <option value="in">Entradas</option>
            <option value="out">Saídas</option>
            {teacher ? (
              <>
                <option value="COTA">Cota semestral</option>
                <option value="ENVIO">Envio de moedas</option>
                <option value="RESERVA">Reserva de missão</option>
                <option value="LIBERACAO">Liberação de reserva</option>
              </>
            ) : (
              <>
                <option value="RECEBIMENTO">Reconhecimentos</option>
                <option value="RESGATE">Resgates</option>
                <option value="MISSAO">Missões</option>
                <option value="BONUS">Bônus</option>
                <option value="RECOMPENSA">Recompensas de streak</option>
                <option value="PREMIO">Prêmios do semestre</option>
                <option value="DOACAO">Doações</option>
              </>
            )}
          </select>
        </div>
        <div className="form-grid" style={{ marginBottom: 20 }}>
          <div className="field">
            <label htmlFor="from">De</label>
            <input
              id="from"
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="to">Até</label>
            <input
              id="to"
              type="date"
              value={to}
              min={from || undefined}
              onChange={(event) => setTo(event.target.value)}
            />
          </div>
        </div>
        {invalidPeriod && (
          <p className="notice notice-error" role="alert">
            A data inicial deve ser anterior ou igual à data final.
          </p>
        )}
        <QueryState
          loading={transactions.isLoading}
          error={transactions.error}
          retry={transactions.refetch}
        />
        {transactions.data &&
          !invalidPeriod &&
          (filtered.length ? (
            <>
              <p className="small muted">
                {filtered.length} movimentações encontradas
              </p>
              <TransactionList transactions={filtered} />
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
