import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react'
import { useCallback, useEffect, useState, type PropsWithChildren } from 'react'
import { ToastContext, type ToastTone } from '@/shared/hooks/toast-context'
export function ToastProvider({ children }: PropsWithChildren) {
  const [notice, setNotice] = useState<{
    message: string
    tone: ToastTone
  } | null>(null)
  const show = useCallback(
    (message: string, tone: ToastTone = 'success') =>
      setNotice({ message, tone }),
    [],
  )
  useEffect(() => {
    if (!notice || notice.tone === 'error') return
    const timer = setTimeout(() => setNotice(null), 6000)
    return () => clearTimeout(timer)
  }, [notice])
  return (
    <ToastContext value={show}>
      {children}
      {(['status', 'alert'] as const).map((role) => {
        const active =
          notice &&
          (role === 'alert' ? notice.tone === 'error' : notice.tone !== 'error')
        const Icon =
          role === 'alert'
            ? AlertCircle
            : notice?.tone === 'info'
              ? Info
              : CheckCircle2
        return (
          <div
            key={role}
            className={`toast toast-${role} ${active ? 'visible' : ''}`}
            role={role}
          >
            {active && (
              <>
                <Icon size={20} />
                <span>{notice.message}</span>
                <button
                  aria-label="Fechar aviso"
                  onClick={() => setNotice(null)}
                >
                  <X size={18} />
                </button>
              </>
            )}
          </div>
        )
      })}
    </ToastContext>
  )
}
