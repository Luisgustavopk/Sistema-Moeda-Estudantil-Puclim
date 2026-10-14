import { Check, Copy, Ticket } from 'lucide-react'
import { useState } from 'react'
import type { Coupon } from '@/shared/types/domain'
import { dateTime } from '@/shared/utils/format'
import { Button } from '@/shared/components/ui/Button'
import { useToast } from '@/shared/hooks/toast-context'
export function CouponCard({ coupon }: { coupon: Coupon }) {
  const [copied, setCopied] = useState(false)
  const toast = useToast()
  return (
    <article className="card coupon-card">
      <div className="coupon-header">
        <Ticket size={30} />
        <div>
          <h3>{coupon.advantageName}</h3>
          <p>{coupon.companyName}</p>
          <span
            className={`badge ${coupon.status === 'VALIDO' ? 'badge-success' : ''}`}
          >
            {coupon.status === 'VALIDO'
              ? 'Disponível para usar'
              : 'Já utilizado'}
          </span>
        </div>
      </div>
      <p className="coupon-code">{coupon.code}</p>
      <p className="small muted">
        {coupon.status === 'VALIDO'
          ? 'Apresente este código no atendimento presencial.'
          : `Utilizado em ${dateTime(coupon.usedAt || coupon.date)}.`}
      </p>
      <div className="coupon-footer">
        <span className="small muted">
          Resgatado em {dateTime(coupon.date)}
        </span>
        <Button
          variant="ghost"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(coupon.code)
              setCopied(true)
              toast('Código copiado!')
            } catch {
              toast('Selecione o código e copie manualmente.')
            }
          }}
        >
          {copied ? <Check size={16} /> : <Copy size={16} />}
          {copied ? 'Copiado' : 'Copiar'}
        </Button>
      </div>
    </article>
  )
}
