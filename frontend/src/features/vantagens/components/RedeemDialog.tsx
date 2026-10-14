import { CheckCircle2, Ticket } from 'lucide-react'
import { useRef, useState } from 'react'
import { Link } from 'react-router'
import type { Advantage, Coupon } from '@/shared/types/domain'
import { useAuth } from '@/features/auth/hooks/auth-context'
import { vantagensApi } from '../api/vantagens.api'
import { AdvantagePhoto } from './AdvantageCard'
import { Modal } from '@/shared/components/ui/Modal'
import { Button } from '@/shared/components/ui/Button'
import { ErrorNotice } from '@/shared/components/ui/Feedback'
import { Coin } from '@/shared/components/ui/Brand'
import { number } from '@/shared/utils/format'
import { useAction } from '@/shared/hooks/use-action'
import { DATA_MODE } from '@/shared/lib/http'

export function RedeemDialog({
  advantage,
  onClose,
}: {
  advantage: Advantage
  onClose: () => void
}) {
  const { user } = useAuth()
  const [step, setStep] = useState<'detail' | 'confirm' | 'success'>('detail')
  const [coupon, setCoupon] = useState<Coupon | null>(null)
  const submitting = useRef(false)
  const requestKey = useRef(crypto.randomUUID())
  const action = useAction(() =>
    vantagensApi.redeem(advantage.id, requestKey.current),
  )
  const balance = user?.balance || 0
  const submit = async () => {
    if (submitting.current) return
    submitting.current = true
    try {
      setCoupon(await action.mutateAsync(undefined))
      setStep('success')
    } catch {
      /* O erro é exibido no diálogo. */
    } finally {
      submitting.current = false
    }
  }
  return (
    <Modal
      title={
        step === 'success'
          ? 'Sua conquista virou vantagem!'
          : step === 'confirm'
            ? 'Vamos confirmar seu resgate?'
            : advantage.name
      }
      onClose={onClose}
      busy={action.isPending}
    >
      {step === 'success' && coupon ? (
        <>
          <div className="check-hero">
            <span className="check-icon">
              <CheckCircle2 size={34} />
            </span>
            <h3>{coupon.advantageName}</h3>
            <p>Apresente este código na {coupon.companyName}.</p>
          </div>
          <div className="coupon-code" style={{ textAlign: 'center' }}>
            {coupon.code}
          </div>
          <p className="notice notice-info">
            {DATA_MODE === 'demo'
              ? 'Cupom salvo. As notificações do aluno e do parceiro foram simuladas, sem envio de e-mail real.'
              : 'Cupom salvo. O sistema processará as notificações para você e para o parceiro.'}
          </p>
          <div className="form-actions">
            <Link
              to="/aluno/cupons"
              onClick={onClose}
              className="button button-primary"
            >
              <Ticket size={18} /> Ver meus cupons
            </Link>
          </div>
        </>
      ) : (
        <>
          {step === 'detail' && (
            <>
              <AdvantagePhoto
                src={advantage.photo}
                alt={advantage.name}
                className="detail-image"
              />
              <span className="badge badge-gold">{advantage.category}</span>
              <p className="detail-description">{advantage.description}</p>
              <p className="small muted">
                Oferecido por <strong>{advantage.companyName}</strong>
              </p>
              <p className="price" style={{ marginTop: 14 }}>
                <Coin />
                {number(advantage.cost)} Pucoins
              </p>
            </>
          )}
          {step === 'confirm' && (
            <>
              <p className="muted">
                Você está resgatando <strong>{advantage.name}</strong>,
                oferecida por {advantage.companyName}.
              </p>
              <div className="summary-box">
                <div className="summary-line">
                  <span>Seu saldo atual</span>
                  <strong>{number(balance)} Pucoins</strong>
                </div>
                <div className="summary-line">
                  <span>Custo do resgate</span>
                  <strong className="negative">
                    −{number(advantage.cost)} Pucoins
                  </strong>
                </div>
                <div className="summary-line">
                  <span>Saldo após o resgate</span>
                  <strong>{number(balance - advantage.cost)} Pucoins</strong>
                </div>
              </div>
              <p className="small muted">
                Um cupom com código único ficará disponível na sua conta para
                uso presencial.
              </p>
            </>
          )}
          <ErrorNotice error={action.error} />
          {balance < advantage.cost && (
            <p className="notice notice-info" style={{ marginTop: 17 }}>
              Você precisa de mais {number(advantage.cost - balance)} Pucoins
              para resgatar esta vantagem.
            </p>
          )}
          <div className="form-actions">
            <Button
              variant="secondary"
              disabled={action.isPending}
              onClick={step === 'confirm' ? () => setStep('detail') : onClose}
            >
              {step === 'confirm' ? 'Voltar' : 'Agora não'}
            </Button>
            <Button
              disabled={balance < advantage.cost}
              loading={action.isPending}
              onClick={step === 'detail' ? () => setStep('confirm') : submit}
            >
              {step === 'detail' ? 'Quero resgatar' : 'Confirmar resgate'}
            </Button>
          </div>
        </>
      )}
    </Modal>
  )
}
