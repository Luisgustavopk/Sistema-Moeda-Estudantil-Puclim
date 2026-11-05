import { useEffect, useRef, useState } from 'react'

export function useProfileMotion(enabled: boolean) {
  const element = useRef<HTMLSpanElement>(null)
  const [visible, setVisible] = useState(() => !document.hidden)
  useEffect(() => {
    if (!enabled || !element.current) return
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
  }, [enabled])
  return { element, playing: enabled && visible }
}
