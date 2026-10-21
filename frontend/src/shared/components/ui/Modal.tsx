import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { X } from 'lucide-react'
export function Modal({
  title,
  children,
  onClose,
  busy = false,
  size = 'normal',
}: {
  title: string
  children: ReactNode
  onClose: () => void
  busy?: boolean
  size?: 'normal' | 'wide'
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const trigger = useRef(document.activeElement as HTMLElement | null)
  const titleId = useId()
  const [closing, setClosing] = useState(false)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  )
  const close = () => {
    if (busy || closing) return
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      onClose()
      return
    }
    setClosing(true)
    closeTimer.current = setTimeout(onClose, 140)
  }
  useEffect(() => {
    const dialog = ref.current
    const previousFocus = trigger.current
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialog?.showModal()
    return () => {
      dialog?.close()
      clearTimeout(closeTimer.current)
      document.body.style.overflow = previousOverflow
      previousFocus?.focus({ preventScroll: true })
    }
  }, [])
  return (
    <dialog
      ref={ref}
      className={`modal ${size === 'wide' ? 'modal-wide' : ''} ${closing ? 'is-closing' : ''}`}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault()
        close()
      }}
      onClick={(event) => {
        if (event.target !== event.currentTarget || busy) return
        const bounds = event.currentTarget.getBoundingClientRect()
        if (
          event.clientX < bounds.left ||
          event.clientX > bounds.right ||
          event.clientY < bounds.top ||
          event.clientY > bounds.bottom
        )
          close()
      }}
    >
      <div className="modal-content">
        <div className="modal-heading">
          <h2 id={titleId}>{title}</h2>
          <button
            type="button"
            className="icon-button"
            aria-label="Fechar janela"
            onClick={close}
            disabled={busy}
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  )
}
