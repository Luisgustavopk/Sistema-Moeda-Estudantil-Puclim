import { useId, useRef } from 'react'
import { useBeforeUnload, useBlocker } from 'react-router'
import { Modal } from './Modal'
import { Button } from './Button'

export function UnsavedPrompt({
  dirty,
  title = 'Sair sem salvar?',
  message = 'Você tem alterações que ainda não foram salvas.',
  stayLabel = 'Continuar aqui',
  leaveLabel = 'Sair sem salvar',
  destructive = false,
}: {
  dirty: boolean
  title?: string
  message?: string
  stayLabel?: string
  leaveLabel?: string
  destructive?: boolean
}) {
  const descriptionId = useId()
  const stayButton = useRef<HTMLButtonElement>(null)
  const blocker = useBlocker(dirty)
  useBeforeUnload((event) => {
    if (!dirty) return
    event.preventDefault()
    event.returnValue = ''
  })
  return blocker.state === 'blocked' ? (
    <Modal
      title={title}
      descriptionId={descriptionId}
      initialFocusRef={stayButton}
      onClose={() => blocker.reset()}
    >
      <p id={descriptionId}>{message}</p>
      <div className="form-actions">
        <Button
          variant="secondary"
          ref={stayButton}
          onClick={() => blocker.reset()}
        >
          {stayLabel}
        </Button>
        <Button
          variant={destructive ? 'danger' : 'primary'}
          onClick={() => blocker.proceed()}
        >
          {leaveLabel}
        </Button>
      </div>
    </Modal>
  ) : null
}
