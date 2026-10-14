import { CheckCircle2, X } from 'lucide-react'
import { useEffect, useState, type PropsWithChildren } from 'react'
import { ToastContext } from '@/shared/hooks/toast-context'
export function ToastProvider({ children }: PropsWithChildren) {
  const [message, setMessage] = useState('')
  useEffect(() => {
    if (!message) return
    const timer = setTimeout(() => setMessage(''), 6000)
    return () => clearTimeout(timer)
  }, [message])
  return (
    <ToastContext value={setMessage}>
      {children}
      <div
        className={`toast ${message ? 'visible' : ''}`}
        role="status"
        aria-live="polite"
      >
        <CheckCircle2 size={20} />
        <span>{message}</span>
        <button aria-label="Fechar aviso" onClick={() => setMessage('')}>
          <X size={18} />
        </button>
      </div>
    </ToastContext>
  )
}
