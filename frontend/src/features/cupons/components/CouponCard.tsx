import { Check, Copy, QrCode, Ticket } from 'lucide-react'
import { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import type { Coupon } from '@/shared/types/domain'
import { dateTime } from '@/shared/utils/format'
import { Button } from '@/shared/components/ui/Button'
import { useToast } from '@/shared/hooks/toast-context'
import { DonateCoupon } from '@/features/gamificacao/DonateCoupon'
import { Modal } from '@/shared/components/ui/Modal'
export function CouponCard({ coupon }: { coupon: Coupon }) {
  const [copied, setCopied] = useState(false)
  const [showQr, setShowQr] = useState(false)
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
              : coupon.status === 'DOADO'
                ? 'Doado'
                : 'Já utilizado'}
          </span>
        </div>
      </div>
      <p className="coupon-code">{coupon.code}</p>
      <p className="small muted">
        {coupon.status === 'VALIDO'
          ? 'Apresente o QR Code ou este código no atendimento presencial.'
          : coupon.status === 'DOADO'
            ? 'Doado definitivamente a uma instituição beneficiária.'
            : `Utilizado em ${dateTime(coupon.usedAt || coupon.date)}.`}
      </p>
      <div className="coupon-footer">
        <span className="small muted">
          Resgatado em {dateTime(coupon.date)}
        </span>
        <Button
          className="coupon-copy"
          variant="ghost"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(coupon.code)
              setCopied(true)
              toast('Código copiado!')
            } catch {
              toast('Selecione o código e copie manualmente.', 'info')
            }
          }}
        >
          {copied ? <Check size={16} /> : <Copy size={16} />}
          {copied ? 'Copiado' : 'Copiar'}
        </Button>
      </div>
      {coupon.status === 'VALIDO' && (
        <>
          <Button
            className="coupon-show-qr"
            variant="secondary"
            onClick={() => setShowQr(true)}
          >
            <QrCode size={18} aria-hidden="true" /> Mostrar QR Code
          </Button>
          <DonateCoupon code={coupon.code} />
        </>
      )}
      {showQr && coupon.status === 'VALIDO' && (
        <Modal title="Apresentar cupom" onClose={() => setShowQr(false)}>
          <div className="coupon-qr-presentation">
            <h3>{coupon.advantageName}</h3>
            <p className="muted">{coupon.companyName}</p>
            <div className="coupon-qr-art">
              <QRCodeSVG
                value={coupon.code}
                size={256}
                level="M"
                marginSize={4}
                bgColor="#FFFFFF"
                fgColor="#000000"
                title="QR Code do cupom"
              />
            </div>
            <p className="small muted">
              O atendente pode escanear o QR Code ou digitar o código abaixo.
            </p>
            <p className="coupon-code">{coupon.code}</p>
            <p className="small muted">
              A leitura não utiliza o cupom automaticamente. A empresa confirma
              o atendimento.
            </p>
          </div>
          <div className="form-actions">
            <Button onClick={() => setShowQr(false)}>Concluir</Button>
          </div>
        </Modal>
      )}
    </article>
  )
}
