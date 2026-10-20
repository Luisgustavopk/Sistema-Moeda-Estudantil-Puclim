import { CheckCircle2, ScanLine, Search, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import type { Coupon } from '@/shared/types/domain'
import { useAuth } from '@/features/auth/hooks/auth-context'
import { cuponsApi } from '../api/cupons.api'
import { PageHeading } from '@/shared/components/ui/PageHeading'
import { Button } from '@/shared/components/ui/Button'
import { Field } from '@/shared/components/ui/Field'
import { Modal } from '@/shared/components/ui/Modal'
import { ErrorNotice, QueryState } from '@/shared/components/ui/Feedback'
import { useAction } from '@/shared/hooks/use-action'
import { useToast } from '@/shared/hooks/toast-context'
import { dateTime } from '@/shared/utils/format'
export function CheckCouponPage() {
  const { user } = useAuth()
  const toast = useToast()
  const [code, setCode] = useState('')
  const [result, setResult] = useState<Coupon | null>(null)
  const [confirm, setConfirm] = useState(false)
  const check = useMutation({
    mutationFn: cuponsApi.check,
    onSuccess: setResult,
  })
  const action = useAction(cuponsApi.use)
  const coupons = useQuery({
    queryKey: ['coupons', user?.id],
    queryFn: cuponsApi.list,
  })
  return (
    <>
      <PageHeading
        eyebrow="Do reconhecimento ao atendimento"
        title="Conferir um cupom"
        description="Confirme a vantagem apresentada pelo aluno com segurança."
      />
      <div className="check-page">
        <section className="card">
          <div className="check-hero">
            <span className="check-icon">
              <ScanLine size={35} />
            </span>
            <h2>Uma conquista pronta para usar.</h2>
            <p>Digite o código apresentado pelo aluno.</p>
          </div>
          <form
            className="form-stack"
            onSubmit={(event) => {
              event.preventDefault()
              setResult(null)
              action.reset()
              check.mutate(code.trim())
            }}
          >
            <Field id="coupon-code" label="Código do cupom">
              <input
                id="coupon-code"
                placeholder="PCL-XXXXXXXX"
                value={code}
                onChange={(event) => {
                  setCode(event.target.value.toUpperCase())
                  setResult(null)
                  check.reset()
                }}
                maxLength={40}
                required
                autoComplete="off"
                style={{ fontFamily: 'monospace', letterSpacing: 2 }}
              />
            </Field>
            <Button
              type="submit"
              loading={check.isPending}
              disabled={!code.trim()}
            >
              <Search size={18} /> Conferir código
            </Button>
            <ErrorNotice error={check.error} />
          </form>
          {result && (
            <div className="summary-box">
              <div className="summary-line">
                <span>Vantagem</span>
                <strong>{result.advantageName}</strong>
              </div>
              <div className="summary-line">
                <span>Aluno</span>
                <strong>{result.studentName}</strong>
              </div>
              <div className="summary-line">
                <span>Resgate</span>
                <strong>{dateTime(result.date)}</strong>
              </div>
              <div className="summary-line">
                <span>Status</span>
                <span
                  className={`badge ${result.status === 'VALIDO' ? 'badge-success' : ''}`}
                >
                  {result.status === 'VALIDO'
                    ? 'Válido'
                    : result.status === 'DOADO'
                      ? 'Doado'
                      : 'Já utilizado'}
                </span>
              </div>
              {result.status === 'VALIDO' ? (
                <Button onClick={() => setConfirm(true)}>
                  <CheckCircle2 size={17} /> Confirmar utilização
                </Button>
              ) : result.status === 'DOADO' ? (
                <p className="small muted">
                  Este cupom foi doado a uma instituição beneficiária e está
                  invalidado para uso pelo aluno.
                </p>
              ) : (
                <p className="small muted">
                  Este cupom foi utilizado em{' '}
                  {dateTime(result.usedAt || result.date)} e não pode ser
                  utilizado novamente.
                </p>
              )}
            </div>
          )}
          <p
            className="small muted"
            style={{
              display: 'flex',
              gap: 9,
              alignItems: 'center',
              marginTop: 22,
            }}
          >
            <ShieldCheck size={18} /> Apenas cupons da sua empresa podem ser
            conferidos.
          </p>
        </section>
        <section className="card" style={{ marginTop: 25 }}>
          <h2 style={{ marginBottom: 18 }}>Resgates da sua empresa</h2>
          <QueryState
            loading={coupons.isLoading}
            error={coupons.error}
            retry={coupons.refetch}
          />
          {coupons.data?.length === 0 && (
            <p className="small muted">Ainda não há cupons emitidos.</p>
          )}
          {coupons.data?.map((coupon) => (
            <div className="row" key={coupon.id}>
              <div className="row-text">
                <strong>{coupon.advantageName}</strong>
                <p>
                  {coupon.studentName} · {coupon.code}
                </p>
              </div>
              <Button
                variant="ghost"
                onClick={() => {
                  setCode(coupon.code)
                  setResult(null)
                  check.mutate(coupon.code)
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                }}
              >
                Conferir
              </Button>
            </div>
          ))}
        </section>
      </div>
      {confirm && result && (
        <Modal
          title="Confirmar utilização do cupom?"
          onClose={() => {
            setConfirm(false)
            action.reset()
          }}
          busy={action.isPending}
        >
          <p className="muted">
            {result.studentName} está utilizando{' '}
            <strong>{result.advantageName}</strong>. Depois da confirmação, o
            código não poderá ser usado novamente.
          </p>
          <p className="coupon-code">{result.code}</p>
          <ErrorNotice error={action.error} />
          <div className="form-actions">
            <Button
              variant="secondary"
              disabled={action.isPending}
              onClick={() => setConfirm(false)}
            >
              Cancelar
            </Button>
            <Button
              loading={action.isPending}
              onClick={async () => {
                try {
                  const updated = await action.mutateAsync(result.code)
                  setResult(updated)
                  setConfirm(false)
                  toast('Cupom utilizado. Bom atendimento!')
                } catch {
                  /* O erro é exibido no diálogo. */
                }
              }}
            >
              Confirmar utilização
            </Button>
          </div>
        </Modal>
      )}
    </>
  )
}
