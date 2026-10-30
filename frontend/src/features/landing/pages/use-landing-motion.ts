import { useEffect, useRef, useState } from 'react'

export function useLandingMotion() {
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const element = root.current
    if (!element || !('IntersectionObserver' in window)) return
    const preference = matchMedia('(prefers-reduced-motion: reduce)')
    let observer: IntersectionObserver | undefined
    const targets = element.querySelectorAll<HTMLElement>('[data-reveal]')
    const words = element.querySelectorAll<HTMLElement>('[data-word]')
    const stories = element.querySelectorAll<HTMLElement>('[data-story]')
    const storyObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          ;(entry.target as HTMLElement).dataset.storyVisible = String(
            entry.isIntersecting,
          )
        })
      },
      { threshold: 0.05 },
    )
    stories.forEach((story) => storyObserver.observe(story))
    const visibility = () => {
      element.dataset.pageHidden = String(document.hidden)
    }
    visibility()
    document.addEventListener('visibilitychange', visibility)
    const configure = () => {
      observer?.disconnect()
      if (preference.matches) {
        targets.forEach((target) => target.classList.remove('lp-pending'))
        words.forEach((word) => word.classList.add('lp-word-visible'))
        return
      }
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return
            entry.target.classList.remove('lp-pending')
            if (entry.target.hasAttribute('data-word'))
              entry.target.classList.add('lp-word-visible')
            observer?.unobserve(entry.target)
          })
        },
        { threshold: 0.3 },
      )
      targets.forEach((target) => {
        if (target.getBoundingClientRect().top > innerHeight) {
          target.classList.add('lp-pending')
          observer?.observe(target)
        }
      })
      // Each word crosses a viewport trigger independently, rather than a timer
      // revealing the whole statement as soon as its container is visible.
      words.forEach((word) => observer?.observe(word))
    }
    configure()
    preference.addEventListener('change', configure)
    return () => {
      observer?.disconnect()
      storyObserver.disconnect()
      document.removeEventListener('visibilitychange', visibility)
      preference.removeEventListener('change', configure)
    }
  }, [])

  return root
}

export function useJourneyPlayback(paused: boolean) {
  const visual = useRef<HTMLDivElement>(null)
  const progress = useRef<HTMLDivElement>(null)
  const elapsed = useRef(0)
  const liveStage = useRef(0)
  const generation = useRef(0)
  const [stage, setStage] = useState(0)
  const [playing, setPlaying] = useState(true)
  const [inView, setInView] = useState(
    () => !('IntersectionObserver' in window),
  )
  const [pageVisible, setPageVisible] = useState(true)
  const [reduced, setReduced] = useState(
    () => matchMedia('(prefers-reduced-motion: reduce)').matches,
  )

  useEffect(() => {
    const preference = matchMedia('(prefers-reduced-motion: reduce)')
    const changed = () => setReduced(preference.matches)
    const visibility = () => setPageVisible(!document.hidden)
    visibility()
    preference.addEventListener('change', changed)
    document.addEventListener('visibilitychange', visibility)
    if (!('IntersectionObserver' in window)) {
      return () => {
        preference.removeEventListener('change', changed)
        document.removeEventListener('visibilitychange', visibility)
      }
    }
    // The journey can start while its topics are visible, even when the
    // product preview is below the fold. Keep playing while either is in view.
    const visible = new Set<Element>()
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) visible.add(entry.target)
          else visible.delete(entry.target)
        })
        setInView(visible.size > 0)
      },
      { threshold: 0.3 },
    )
    if (progress.current) observer.observe(progress.current)
    if (visual.current) observer.observe(visual.current)
    return () => {
      observer.disconnect()
      preference.removeEventListener('change', changed)
      document.removeEventListener('visibilitychange', visibility)
    }
  }, [])

  const running = playing && !paused && !reduced && inView && pageVisible
  useEffect(() => {
    if (!running) return
    // A timer advances the story; no perpetual frame loop is needed while
    // someone reads. Pausing/offscreen preserves the remaining reading time.
    const started = performance.now()
    const current = generation.current
    let advanced = false
    const timer = window.setTimeout(
      () => {
        advanced = true
        elapsed.current = 0
        liveStage.current = (liveStage.current + 1) % 3
        setStage(liveStage.current)
      },
      Math.max(0, 4000 - elapsed.current),
    )
    return () => {
      clearTimeout(timer)
      if (!advanced && current === generation.current)
        elapsed.current += performance.now() - started
    }
  }, [running, stage])

  return {
    visual,
    progress,
    stage,
    running,
    reduced,
    playing,
    toggle: () => setPlaying((current) => !current),
    stop: () => setPlaying(false),
    select: (next: number) => {
      generation.current += 1
      elapsed.current = 0
      liveStage.current = next
      setStage(next)
      setPlaying(false)
    },
  }
}
