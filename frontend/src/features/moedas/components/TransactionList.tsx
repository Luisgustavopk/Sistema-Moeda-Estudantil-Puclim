import { ArrowDownLeft, ArrowUpRight, Gift, Wallet } from 'lucide-react'
import type { Transaction } from '@/shared/types/domain'
import { dateTime, number, shortDate } from '@/shared/utils/format'
import { EmptyState } from '@/shared/components/ui/Feedback'
export function TransactionList({
  transactions,
  compact = false,
}: {
  transactions: Transaction[]
  compact?: boolean
}) {
  if (!transactions.length)
    return (
      <EmptyState
        title="Sua história começa aqui"
        description="Seus recebimentos e movimentações aparecerão neste espaço."
      />
    )
  return (
    <div>
      {transactions.map((transaction) => {
        const Icon =
          transaction.kind === 'RESGATE'
            ? Gift
            : transaction.kind === 'COTA'
              ? Wallet
              : transaction.amount > 0
                ? ArrowDownLeft
                : ArrowUpRight
        return (
          <div className="row" key={transaction.id}>
            <span
              className="stat-icon"
              style={{ width: 38, height: 38, borderRadius: 13, flexShrink: 0 }}
            >
              <Icon size={18} />
            </span>
            <div className="row-text">
              <strong>
                {transaction.kind === 'RECEBIMENTO'
                  ? transaction.reason || transaction.description
                  : transaction.description}
              </strong>
              <p>
                {transaction.counterpart || 'Crédito do semestre'}
                {!compact &&
                transaction.kind !== 'RECEBIMENTO' &&
                transaction.reason
                  ? ` · ${transaction.reason}`
                  : ''}
              </p>
              {!compact && (
                <span className="small muted">
                  {dateTime(transaction.date)}
                </span>
              )}
            </div>
            <div style={{ textAlign: 'right' }}>
              <span
                className={`amount ${transaction.amount > 0 ? 'positive' : 'negative'}`}
              >
                {transaction.amount > 0
                  ? '+'
                  : transaction.amount < 0
                    ? '−'
                    : ''}
                {number(Math.abs(transaction.amount))}
              </span>
              {compact && (
                <p className="small muted">{shortDate(transaction.date)}</p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
