import { Camera, CameraOff } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { Button } from '@/shared/components/ui/Button'
import { ErrorNotice } from '@/shared/components/ui/Feedback'
import { Modal } from '@/shared/components/ui/Modal'
import { couponCodeFromQr, qrDecoder } from '../qr'

export function CouponQrScanner({
  onClose,
  onDetected,
}: {
  onClose: () => void
  onDetected: (code: string) => void
}) {
  const descriptionId = useId()
  const video = useRef<HTMLVideoElement>(null)
  const stream = useRef<MediaStream | null>(null)
  const frame = useRef<number | null>(null)
  const session = useRef(0)
  const detected = useRef(onDetected)
  const [starting, setStarting] = useState(false)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const [message, setMessage] = useState(
    'A câmera será ativada apenas quando você permitir.',
  )
  useEffect(() => {
    detected.current = onDetected
  }, [onDetected])

  function stop() {
    session.current += 1
    if (frame.current !== null) cancelAnimationFrame(frame.current)
    frame.current = null
    stream.current?.getTracks().forEach((track) => track.stop())
    stream.current = null
    if (video.current) video.current.srcObject = null
  }

  useEffect(() => {
    function hide() {
      if (!document.hidden) return
      stop()
      setStarting(false)
      setRunning(false)
      setMessage(
        'A câmera foi pausada ao sair da aba. Ative novamente para continuar.',
      )
    }
    document.addEventListener('visibilitychange', hide)
    return () => {
      stop()
      document.removeEventListener('visibilitychange', hide)
    }
  }, [])

  async function start() {
    stop()
    setError(null)
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setError(
        new Error(
          'A câmera precisa de uma conexão HTTPS e de um navegador compatível. Feche esta janela para ler uma imagem ou digitar o código.',
        ),
      )
      return
    }
    const current = session.current
    setStarting(true)
    try {
      const camera = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } },
        audio: false,
      })
      if (session.current !== current) {
        camera.getTracks().forEach((track) => track.stop())
        return
      }
      stream.current = camera
      const player = video.current
      if (!player) {
        stop()
        return
      }
      player.srcObject = camera
      await player.play()
      const decode = await qrDecoder()
      if (session.current !== current) return
      const canvas = document.createElement('canvas')
      const context = canvas.getContext('2d', { willReadFrequently: true })
      if (!context)
        throw new Error(
          'Não foi possível ler a câmera. Feche esta janela e digite o código.',
        )
      let lastRead = 0
      setRunning(true)
      setStarting(false)
      setMessage(
        'Aponte para o QR Code. A leitura apenas confere o cupom; a utilização exige confirmação.',
      )
      const read = (time: number) => {
        if (session.current !== current) return
        try {
          if (
            time - lastRead >= 200 &&
            player.readyState >= 2 &&
            player.videoWidth
          ) {
            lastRead = time
            const scale = Math.min(
              1,
              960 / Math.max(player.videoWidth, player.videoHeight),
            )
            canvas.width = Math.max(1, Math.round(player.videoWidth * scale))
            canvas.height = Math.max(1, Math.round(player.videoHeight * scale))
            context.drawImage(player, 0, 0, canvas.width, canvas.height)
            const pixels = context.getImageData(
              0,
              0,
              canvas.width,
              canvas.height,
            )
            const qr = decode(pixels.data, pixels.width, pixels.height, {
              inversionAttempts: 'attemptBoth',
            })
            if (qr) {
              const code = couponCodeFromQr(qr.data)
              if (!code) {
                stop()
                setRunning(false)
                setError(
                  new Error(
                    'Este QR Code não contém um código de cupom Puclim. Você pode tentar novamente ou digitar o código.',
                  ),
                )
                return
              }
              stop()
              detected.current(code)
              return
            }
          }
        } catch {
          stop()
          setRunning(false)
          setError(
            new Error(
              'A leitura da câmera foi interrompida. Tente novamente ou digite o código do cupom.',
            ),
          )
          return
        }
        frame.current = requestAnimationFrame(read)
      }
      frame.current = requestAnimationFrame(read)
    } catch (cause) {
      if (session.current !== current) return
      stop()
      setStarting(false)
      setRunning(false)
      const denied =
        cause instanceof DOMException &&
        ['NotAllowedError', 'PermissionDeniedError'].includes(cause.name)
      setError(
        new Error(
          denied
            ? 'Permissão da câmera negada. Libere o acesso no navegador ou feche esta janela para ler uma imagem ou digitar o código.'
            : 'Não foi possível acessar a câmera. Verifique se ela está disponível ou feche esta janela para ler uma imagem ou digitar o código.',
        ),
      )
    }
  }

  return (
    <Modal
      title="Escanear QR Code"
      descriptionId={descriptionId}
      onClose={() => {
        stop()
        onClose()
      }}
    >
      <p id={descriptionId} className="muted">
        Posicione o QR Code apresentado pelo aluno dentro da câmera.
      </p>
      <div className={`coupon-scanner ${running ? 'is-running' : ''}`}>
        <video
          ref={video}
          muted
          playsInline
          aria-label="Prévia da câmera para ler o QR Code"
        />
        {!running && <CameraOff size={40} aria-hidden="true" />}
      </div>
      <p className="small muted coupon-scanner-status" role="status">
        {message}
      </p>
      <ErrorNotice error={error} />
      <div className="form-actions">
        <Button
          variant="secondary"
          onClick={() => {
            stop()
            onClose()
          }}
        >
          Usar código ou imagem
        </Button>
        {!running && (
          <Button
            loading={starting}
            onClick={() => {
              void start()
            }}
          >
            <Camera size={18} aria-hidden="true" /> Ativar câmera
          </Button>
        )}
      </div>
    </Modal>
  )
}
