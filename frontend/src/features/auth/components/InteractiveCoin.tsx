import { loginStyles } from '../pages/login-page.styles'
import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { RotateCcw } from 'lucide-react'
import { Coin } from '@/shared/components/ui/Brand'
import { playCoinSound, stopCoinSound } from '../utils/coin-sound'

type Rotation = { x: number; y: number }

const transform = (pose: Rotation) =>
  `rotateX(${pose.x}deg) rotateY(${pose.y}deg)`

const reflectionTransform = (pose: Rotation, reverse: boolean) => {
  const yaw = ((pose.y + (reverse ? 180 : 0)) * Math.PI) / 180
  const pitch = (pose.x * Math.PI) / 180
  return `translate3d(${Math.sin(yaw) * 28 - 8}%, ${Math.sin(pitch) * 16}%, 0) rotate(-18deg)`
}

type CoinDrag = {
  pointerId: number
  startX: number
  startY: number
  startAngle: Rotation
  lastAngle: Rotation
  lastTime: number
  velocity: Rotation
  moved: boolean
  reduce: boolean
}

export function InteractiveCoin({ sound }: { sound: boolean }) {
  const model = useRef<HTMLSpanElement>(null)
  const animation = useRef<Animation | null>(null)
  const reflections = useRef<Animation[]>([])
  const activation = useRef(0)
  const angle = useRef({ from: { x: 0, y: 0 }, to: { x: 0, y: 0 } })
  const drag = useRef<CoinDrag | null>(null)
  const skipClick = useRef(false)
  const [spinning, setSpinning] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [feedback, setFeedback] = useState('')

  useEffect(() => {
    if (!sound) stopCoinSound()
  }, [sound])

  useEffect(
    () => () => {
      activation.current++
      animation.current?.cancel()
      reflections.current.forEach((effect) => effect.cancel())
      stopCoinSound()
    },
    [],
  )

  function lightAt(pose: Rotation) {
    reflections.current.forEach((effect) => effect.cancel())
    reflections.current = []
    model.current
      ?.querySelectorAll<HTMLElement>('.login-coin-sheen')
      .forEach((light, index) => {
        light.style.transform = reflectionTransform(pose, index === 1)
      })
  }

  function stopAtCurrentAngle() {
    const progress =
      animation.current?.effect?.getComputedTiming().progress ?? 1
    const from = {
      x:
        angle.current.from.x +
        (angle.current.to.x - angle.current.from.x) * Number(progress),
      y:
        angle.current.from.y +
        (angle.current.to.y - angle.current.from.y) * Number(progress),
    }
    animation.current?.cancel()
    animation.current = null
    angle.current = { from, to: from }
    if (model.current) model.current.style.transform = transform(from)
    lightAt(from)
    return from
  }

  function playFeedback(reduce: boolean) {
    setFeedback(reduce ? 'Moeda ativada.' : 'Moeda em movimento.')
    const currentActivation = ++activation.current
    void playCoinSound().then((played) => {
      if (activation.current !== currentActivation) return
      setFeedback(
        played
          ? 'Moeda ativada. Som da moeda reproduzido.'
          : sound
            ? 'Moeda ativada. Som indisponível neste navegador.'
            : 'Moeda ativada. O som está silenciado.',
      )
    })
  }

  function rotateTo(
    from: Rotation,
    to: Rotation,
    duration: number,
    reduce: boolean,
  ) {
    const node = model.current
    if (!node) return
    animation.current?.cancel()
    angle.current = { from, to }
    setSpinning(true)
    lightAt(from)
    if (!reduce) {
      reflections.current = Array.from(
        node.querySelectorAll<HTMLElement>('.login-coin-sheen'),
        (light, index) =>
          light.animate(
            Array.from({ length: 17 }, (_, frame) => {
              const progress = frame / 16
              return {
                transform: reflectionTransform(
                  {
                    x: from.x + (to.x - from.x) * progress,
                    y: from.y + (to.y - from.y) * progress,
                  },
                  index === 1,
                ),
              }
            }),
            {
              duration,
              easing: 'cubic-bezier(0.23, 1, 0.32, 1)',
              fill: 'forwards',
            },
          ),
      )
    }
    const effect = node.animate(
      reduce
        ? [{ opacity: 0.65 }, { opacity: 1 }]
        : [{ transform: transform(from) }, { transform: transform(to) }],
      {
        duration: reduce ? 160 : duration,
        easing: 'cubic-bezier(0.23, 1, 0.32, 1)',
        fill: 'forwards',
      },
    )
    animation.current = effect
    effect.onfinish = () => {
      node.style.transform = reduce ? transform({ x: 0, y: 0 }) : transform(to)
      if (reduce) angle.current = { from: { x: 0, y: 0 }, to: { x: 0, y: 0 } }
      lightAt(reduce ? { x: 0, y: 0 } : to)
      effect.cancel()
      animation.current = null
      setSpinning(false)
    }
  }

  function spin() {
    const from = stopAtCurrentAngle()
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    playFeedback(reduce)
    rotateTo(from, { x: from.x + 360, y: from.y + 720 }, 1100, reduce)
  }

  function resetPosition() {
    const current = stopAtCurrentAngle()
    stopCoinSound()
    activation.current++
    // Equivalent angles keep the return short, even after many full turns.
    const normalize = (value: number) => (((value % 360) + 540) % 360) - 180
    const from = { x: normalize(current.x), y: normalize(current.y) }
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    rotateTo(from, { x: 0, y: 0 }, 240, reduce)
    setFeedback('Moeda na posição inicial, com a logo do puclim à frente.')
  }

  function startDrag(event: PointerEvent<HTMLButtonElement>) {
    if (event.button !== 0 || !event.isPrimary) return
    skipClick.current = false
    const from = stopAtCurrentAngle()
    stopCoinSound()
    activation.current++
    drag.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startAngle: from,
      lastAngle: from,
      lastTime: event.timeStamp,
      velocity: { x: 0, y: 0 },
      moved: false,
      reduce: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
    setDragging(true)
    setSpinning(false)
  }

  function moveDrag(event: PointerEvent<HTMLButtonElement>) {
    const held = drag.current
    if (!held || held.pointerId !== event.pointerId) return
    const horizontal = event.clientX - held.startX
    const vertical = event.clientY - held.startY
    if (!held.moved && Math.hypot(horizontal, vertical) < 5) return
    if (!held.moved) {
      held.moved = true
      playFeedback(held.reduce)
    }
    const next = {
      x: held.startAngle.x - vertical * 1.4,
      y: held.startAngle.y + horizontal * 1.4,
    }
    const elapsed = Math.max(8, event.timeStamp - held.lastTime)
    held.velocity = {
      x: held.velocity.x * 0.6 + ((next.x - held.lastAngle.x) / elapsed) * 0.4,
      y: held.velocity.y * 0.6 + ((next.y - held.lastAngle.y) / elapsed) * 0.4,
    }
    held.lastAngle = next
    held.lastTime = event.timeStamp
    if (model.current && !held.reduce) {
      model.current.style.transform = transform(next)
      lightAt(next)
    }
    angle.current = { from: next, to: next }
  }

  function finishDrag(event: PointerEvent<HTMLButtonElement>) {
    const held = drag.current
    if (!held || held.pointerId !== event.pointerId) return
    drag.current = null
    setDragging(false)
    if (event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId)
    if (!held.moved) return
    skipClick.current = true
    const cancelled =
      event.type === 'pointercancel' || event.type === 'lostpointercapture'
    const velocity =
      cancelled || event.timeStamp - held.lastTime > 100
        ? { x: 0, y: 0 }
        : held.velocity
    const momentum = (speed: number) =>
      Math.max(-540, Math.min(540, speed * 240))
    const target = {
      x: held.lastAngle.x + momentum(velocity.x),
      y: held.lastAngle.y + momentum(velocity.y),
    }
    const distance = Math.hypot(
      target.x - held.lastAngle.x,
      target.y - held.lastAngle.y,
    )
    const duration = Math.max(240, Math.min(1100, distance * 1.5))
    rotateTo(held.lastAngle, target, duration, held.reduce)
  }

  return (
    <div className={loginStyles.coinScene}>
      <div className={loginStyles.coinStage}>
        <div className={loginStyles.coinOrbit} aria-hidden="true" />
        <button
          type="button"
          className={loginStyles.coinButton}
          aria-label={
            sound
              ? 'Girar moeda e ouvir seu som'
              : 'Girar moeda com som silenciado'
          }
          aria-describedby="coin-instruction coin-description"
          aria-busy={spinning || dragging || undefined}
          data-dragging={dragging || undefined}
          onPointerDown={startDrag}
          onPointerMove={moveDrag}
          onPointerUp={finishDrag}
          onPointerCancel={finishDrag}
          onLostPointerCapture={finishDrag}
          onClick={(event) => {
            if (skipClick.current && event.detail !== 0) {
              skipClick.current = false
              return
            }
            spin()
          }}
        >
          <span className={loginStyles.coinFloat}>
            <span className={loginStyles.coinTilt}>
              <span className={loginStyles.coinModel} ref={model}>
                {Array.from({ length: 9 }, (_, index) => (
                  <span
                    key={index}
                    className={loginStyles.coinEdge}
                    style={{
                      transform: `translateZ(calc(${index * 2 - 8}px * var(--login-scale)))`,
                    }}
                  />
                ))}
                <span
                  className={[loginStyles.coinFace, loginStyles.coinFront].join(
                    ' ',
                  )}
                >
                  <Coin size={240} />
                  <span className={loginStyles.coinFinish} aria-hidden="true">
                    <span className={loginStyles.coinSheen} />
                  </span>
                </span>
                <span
                  className={[loginStyles.coinFace, loginStyles.coinBack].join(
                    ' ',
                  )}
                >
                  <Coin size={240} face="crown" />
                  <span className={loginStyles.coinFinish} aria-hidden="true">
                    <span className={loginStyles.coinSheen} />
                  </span>
                </span>
              </span>
            </span>
          </span>
        </button>
      </div>
      <div className={loginStyles.coinControls}>
        <button
          type="button"
          className={loginStyles.coinReset}
          aria-label="Restaurar posição da moeda"
          title="Restaurar posição da moeda"
          onClick={resetPosition}
        >
          <RotateCcw size={18} aria-hidden="true" />
        </button>
        <span id="coin-instruction" className={loginStyles.coinInstruction}>
          Segure e gire em qualquer direção.
        </span>
      </div>
      <span id="coin-description" className="sr-only">
        Moeda com a logo do puclim na frente e uma coroa no verso.
      </span>
      <span className="sr-only" role="status" aria-atomic="true">
        {feedback}
      </span>
    </div>
  )
}
