import {
  CheckCircle2,
  ImageUp,
  ScanLine,
  Search,
  ShieldCheck,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
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
import { CouponQrScanner } from '../components/CouponQrScanner'
import { couponCodeFromImage } from '../qr'
import { Pagination } from '@/shared/components/ui/Pagination'
import { Select } from '@/shared/components/ui/Select'
import { useDebouncedValue } from '@/shared/hooks/use-debounced-value'
export function CheckCouponPage() {
  const { user } = useAuth()
  const toast = useToast()
  const [code, setCode] = useState('')
  const [result, setResult] = useState<Coupon | null>(null)
  const [confirm, setConfirm] = useState(false)
  const [checking, setChecking] = useState(false)
  const [checkError, setCheckError] = useState<unknown>(null)
  const [scanner, setScanner] = useState(false)
  const [readingImage, setReadingImage] = useState(false)
  const [imageError, setImageError] = useState<unknown>(null)
  const [scanMessage, setScanMessage] = useState('')
  const imageInput = useRef<HTMLInputElement>(null)
  const codeInput = useRef<HTMLInputElement>(null)
  const focusAfterUse = useRef(false)
  const request = useRef(0)
  const imageRequest = useRef(0)
  const mounted = useRef(true)
  const currentCode = useRef('')
  const action = useAction(cuponsApi.use)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      request.current += 1
      imageRequest.current += 1
    }
  }, [])
  useEffect(() => {
    if (!confirm && focusAfterUse.current) {
      focusAfterUse.current = false
      codeInput.current?.focus({ preventScroll: true })
    }
  }, [confirm])
  function replaceCode(value: string) {
    request.current += 1
    imageRequest.current += 1
    currentCode.current = value.trim().toUpperCase()
    setCode(value.toUpperCase())
    setResult(null)
    setConfirm(false)
    setChecking(false)
    setReadingImage(false)
    setCheckError(null)
    setImageError(null)
    setScanMessage('')
    action.reset()
  }
  async function checkCode(value: string) {
    const normalized = value.trim().toUpperCase()
    if (!normalized) return
    replaceCode(normalized)
    const version = ++request.current
    setChecking(true)
    try {
      const coupon = await cuponsApi.check(normalized)
      if (
        mounted.current &&
        version === request.current &&
        currentCode.current === normalized
      )
        setResult(coupon)
    } catch (error) {
      if (mounted.current && version === request.current) setCheckError(error)
    } finally {
      if (mounted.current && version === request.current) setChecking(false)
    }
  }
  async function readImage(file: File) {
    replaceCode(code)
    const version = ++imageRequest.current
    setReadingImage(true)
    try {
      const decoded = await couponCodeFromImage(file)
      if (!mounted.current || version !== imageRequest.current) return
      void checkCode(decoded)
      setScanMessage(
        'QR Code lido. Confira os dados antes de confirmar a utilização.',
      )
    } catch (error) {
      if (mounted.current && version === imageRequest.current)
        setImageError(error)
    } finally {
      if (mounted.current && version === imageRequest.current)
        setReadingImage(false)
    }
  }
  const [historyPage, setHistoryPage] = useState(1)
  const [historySearch, setHistorySearch] = useState('')
  const [historyStatus, setHistoryStatus] = useState<Coupon['status'] | 'all'>(
    'all',
  )
  const settledSearch = useDebouncedValue(historySearch)
  const searchingHistory = settledSearch !== historySearch
  const filters = {
    page: historyPage - 1,
    size: 12,
    q: settledSearch,
    status: historyStatus === 'all' ? undefined : historyStatus,
  }
  const coupons = useQuery({
    queryKey: ['coupons', user?.id, 'history', filters],
    queryFn: () => cuponsApi.list(filters),
    enabled: !searchingHistory,
    placeholderData: (previous, query) =>
      query?.queryKey[1] === user?.id ? previous : undefined,
  })
  if (
    coupons.data &&
    !coupons.isPlaceholderData &&
    historyPage > Math.max(1, coupons.data.pages)
  ) {
    setHistoryPage(Math.max(1, coupons.data.pages))
  }
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
            <p>Escaneie o QR Code ou digite o código apresentado pelo aluno.</p>
          </div>
          <div className="coupon-reading-options">
            <Button variant="secondary" onClick={() => setScanner(true)}>
              <ScanLine size={18} aria-hidden="true" /> Escanear QR Code
            </Button>
            <Button
              variant="ghost"
              loading={readingImage}
              onClick={() => imageInput.current?.click()}
            >
              <ImageUp size={18} aria-hidden="true" /> Ler imagem do QR
            </Button>
            <input
              ref={imageInput}
              type="file"
              accept="image/*"
              aria-label="Imagem do QR Code"
              className="coupon-image-input"
              tabIndex={-1}
              onChange={(event) => {
                const file = event.currentTarget.files?.[0]
                event.currentTarget.value = ''
                if (file) void readImage(file)
              }}
            />
          </div>
          <ErrorNotice error={imageError} />
          <p className="small muted coupon-read-status" role="status">
            {scanMessage}
          </p>
          <form
            className="form-stack"
            onSubmit={(event) => {
              event.preventDefault()
              void checkCode(code)
            }}
          >
            <Field id="coupon-code" label="Código do cupom">
              <input
                id="coupon-code"
                ref={codeInput}
                placeholder="PCL-XXXXXXXX"
                value={code}
                onChange={(event) => replaceCode(event.target.value)}
                maxLength={40}
                required
                autoComplete="off"
                className="coupon-code-input"
              />
            </Field>
            <Button type="submit" loading={checking} disabled={!code.trim()}>
              <Search size={18} /> Conferir código
            </Button>
            <ErrorNotice error={checkError} />
          </form>
          {result && (
            <div className="summary-box">
              <div className="summary-line">
                <span>Código conferido</span>
                <strong className="coupon-checked-code">{result.code}</strong>
              </div>
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
                <Button
                  onClick={() => {
                    if (
                      currentCode.current === result.code.trim().toUpperCase()
                    )
                      setConfirm(true)
                  }}
                >
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
        <section
          className="card"
          style={{ marginTop: 25 }}
          aria-busy={coupons.isFetching || searchingHistory}
        >
          <h2 style={{ marginBottom: 18 }}>Resgates da sua empresa</h2>
          <div className="toolbar">
            <div className="search-field">
              <Search size={19} aria-hidden="true" />
              <input
                aria-label="Buscar resgate"
                placeholder="Código, vantagem ou aluno"
                maxLength={200}
                value={historySearch}
                onChange={(event) => {
                  setHistorySearch(event.target.value)
                  setHistoryPage(1)
                }}
              />
            </div>
            <Select
              aria-label="Status dos resgates"
              value={historyStatus}
              onValueChange={(value) => {
                setHistoryStatus(value as Coupon['status'] | 'all')
                setHistoryPage(1)
              }}
            >
              <option value="all">Todos os status</option>
              <option value="VALIDO">Disponíveis</option>
              <option value="UTILIZADO">Utilizados</option>
              <option value="DOADO">Doados</option>
            </Select>
            {(historySearch || historyStatus !== 'all') && (
              <Button
                variant="ghost"
                onClick={() => {
                  setHistorySearch('')
                  setHistoryStatus('all')
                  setHistoryPage(1)
                }}
              >
                Limpar filtros
              </Button>
            )}
          </div>
          <QueryState
            loading={coupons.isLoading}
            error={coupons.error}
            retry={coupons.refetch}
          />
          <p className="small muted" role="status">
            {searchingHistory || (coupons.isFetching && !coupons.isPending)
              ? 'Atualizando resgates…'
              : ''}
          </p>
          {coupons.data?.total === 0 && (
            <p className="small muted">
              Nenhum cupom encontrado. Experimente ajustar os filtros.
            </p>
          )}
          {coupons.data?.items.map((coupon) => (
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
                  void checkCode(coupon.code)
                  window.scrollTo({
                    top: 0,
                    behavior: matchMedia('(prefers-reduced-motion: reduce)')
                      .matches
                      ? 'instant'
                      : 'smooth',
                  })
                }}
              >
                Conferir
              </Button>
            </div>
          ))}
          {coupons.data && (
            <Pagination
              page={coupons.data.page + 1}
              size={12}
              total={coupons.data.total}
              disabled={coupons.isFetching || searchingHistory}
              onChange={setHistoryPage}
              label="Páginas dos resgates"
            />
          )}
        </section>
      </div>
      {scanner && (
        <CouponQrScanner
          onClose={() => setScanner(false)}
          onDetected={(decoded) => {
            setScanner(false)
            void checkCode(decoded)
            setScanMessage(
              'QR Code lido. Confira os dados antes de confirmar a utilização.',
            )
          }}
        />
      )}
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
                const checkedCode = result.code
                if (currentCode.current !== checkedCode.trim().toUpperCase())
                  return
                const version = request.current
                try {
                  const updated = await action.mutateAsync(checkedCode)
                  if (!mounted.current || version !== request.current) return
                  setResult(updated)
                  focusAfterUse.current = true
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
