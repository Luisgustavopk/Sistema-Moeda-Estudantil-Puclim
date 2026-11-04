import { Coin, Wave } from '@/shared/components/ui/Brand'
import { number } from '@/shared/utils/format'
import type { CSSProperties } from 'react'
export function BalanceCard({
  balance,
  teacher = false,
}: {
  balance: number
  teacher?: boolean
}) {
  return (
    <section className="balance-card" aria-label="Saldo de moedas">
      <Coin size={64} />
      <div className="balance-details">
        <p className="balance-label">
          {teacher ? 'Saldo disponível' : 'Saldo de Pucoins'}
        </p>
        <div
          className="balance-number"
          style={
            { '--balance-characters': number(balance).length } as CSSProperties
          }
        >
          {number(balance)}
        </div>
      </div>
      <svg className="balance-wave" viewBox="0 0 40 32" aria-hidden="true">
        <Wave />
      </svg>
    </section>
  )
}
