import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { Avatar } from '@/shared/components/ui/Avatar'

function subscribeMotion(listener: () => void) {
  const media = window.matchMedia('(prefers-reduced-motion: reduce)')
  media.addEventListener('change', listener)
  return () => media.removeEventListener('change', listener)
}

/** Explicit playback overrides the default pointer-hover behavior. */
export function AnimatedAvatar({
  source,
  name,
  animate,
}: {
  source: string
  name: string
  animate?: boolean
}) {
  const reduced = useSyncExternalStore(
    subscribeMotion,
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    () => true,
  )
  const [hovered, setHovered] = useState(false)
  const [visible, setVisible] = useState(true)
  const [thumbnail, setThumbnail] = useState<{
    source: string
    url: string
  } | null>(null)
  const element = useRef<HTMLImageElement>(null)
  const local = source.startsWith('data:')
  useEffect(() => {
    if (!local) return
    let active = true
    void (async () => {
      const bitmap = await createImageBitmap(
        await fetch(source).then((response) => response.blob()),
      )
      try {
        const canvas = document.createElement('canvas')
        canvas.width = bitmap.width
        canvas.height = bitmap.height
        canvas.getContext('2d')!.drawImage(bitmap, 0, 0)
        if (active) setThumbnail({ source, url: canvas.toDataURL('image/png') })
      } finally {
        bitmap.close()
      }
    })().catch(() => {
      /* A static placeholder remains if preview decoding fails. */
    })
    return () => {
      active = false
    }
  }, [source, local])
  const playing = !reduced && visible && (animate ?? hovered)
  const staticSource = local
    ? thumbnail?.source === source
      ? thumbnail.url
      : null
    : `${source}${source.includes('?') ? '&' : '?'}static=true`
  const displaySource = playing ? source : staticSource
  const hasSource = !!displaySource
  useEffect(() => {
    if (!element.current) return
    let intersecting = true
    const update = () => setVisible(intersecting && !document.hidden)
    const observer = new IntersectionObserver(([entry]) => {
      intersecting = entry.isIntersecting
      update()
    })
    observer.observe(element.current)
    document.addEventListener('visibilitychange', update)
    update()
    return () => {
      observer.disconnect()
      document.removeEventListener('visibilitychange', update)
    }
  }, [source, hasSource])
  if (!displaySource) return <Avatar name={name} large />
  return (
    <img
      ref={element}
      className="avatar avatar-large"
      src={displaySource}
      alt={`Avatar de ${name}`}
      width={120}
      height={120}
      data-animated={playing}
      onPointerEnter={(event) => {
        if (
          event.pointerType === 'mouse' &&
          window.matchMedia('(hover: hover) and (pointer: fine)').matches
        )
          setHovered(true)
      }}
      onPointerLeave={() => setHovered(false)}
    />
  )
}
