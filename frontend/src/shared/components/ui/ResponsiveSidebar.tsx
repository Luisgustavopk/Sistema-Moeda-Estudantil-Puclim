import { useEffect, useRef, type ReactNode, type RefObject } from 'react'
import { X } from 'lucide-react'

export function ResponsiveSidebar({
  open,
  onClose,
  returnFocus,
  children,
}: {
  open: boolean
  onClose: () => void
  returnFocus: RefObject<HTMLElement | null>
  children: ReactNode
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    if (!open) return
    const trigger = returnFocus.current
    const previousOverflow = document.body.style.overflow
    const node = dialog.current
    document.body.style.overflow = 'hidden'
    node?.showModal()
    return () => {
      node?.close()
      document.body.style.overflow = previousOverflow
      if (trigger?.isConnected && trigger.getClientRects().length)
        trigger.focus({ preventScroll: true })
    }
  }, [open, returnFocus])
  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    if ((event.target as HTMLElement).closest('a')) onClose()
  }
  if (!open)
    return (
      <aside
        id="menu-lateral"
        className="sidebar"
        aria-label="Menu principal"
        onClick={handleClick}
      >
        {children}
      </aside>
    )
  return (
    <dialog
      ref={dialog}
      id="menu-lateral"
      className="sidebar open"
      aria-label="Menu principal"
      onKeyDown={(event) => {
        if (event.key !== 'Tab') return
        const nodes = [
          ...event.currentTarget.querySelectorAll<HTMLElement>(
            'a[href], button:not(:disabled)',
          ),
        ]
        const first = nodes[0],
          last = nodes.at(-1)
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last?.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first?.focus()
        }
      }}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          const bounds = event.currentTarget.getBoundingClientRect()
          if (
            event.clientX < bounds.left ||
            event.clientX > bounds.right ||
            event.clientY < bounds.top ||
            event.clientY > bounds.bottom
          )
            onClose()
        }
        handleClick(event)
      }}
    >
      <button
        type="button"
        className="icon-button sidebar-close"
        aria-label="Fechar menu"
        autoFocus
        onClick={onClose}
      >
        <X size={20} />
      </button>
      {children}
    </dialog>
  )
}
