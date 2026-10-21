import { useBeforeUnload, useBlocker } from 'react-router'
import { Modal } from '@/shared/components/ui/Modal'
import { Button } from '@/shared/components/ui/Button'

export function UnsavedPrompt({
  dirty,
  message = 'Você tem alterações que ainda não foram salvas.',
}: {
  dirty: boolean
  message?: string
}) {
  const blocker = useBlocker(dirty)
  useBeforeUnload((event) => {
    if (dirty) event.preventDefault()
  })
  return blocker.state === 'blocked' ? (
    <Modal title="Sair sem salvar?" onClose={() => blocker.reset()}>
      <p>{message}</p>
      <div className="form-actions">
        <Button variant="secondary" onClick={() => blocker.reset()}>
          Continuar aqui
        </Button>
        <Button onClick={() => blocker.proceed()}>Sair sem salvar</Button>
      </div>
    </Modal>
  ) : null
}
