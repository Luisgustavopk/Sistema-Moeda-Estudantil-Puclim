import { useState, useSyncExternalStore } from 'react'

const preferenceKey = 'puclim.sidebar.collapsed'
const wideScreen = '(min-width: 1280px)'

function subscribe(listener: () => void) {
  const media = window.matchMedia(wideScreen)
  media.addEventListener('change', listener)
  return () => media.removeEventListener('change', listener)
}

function readPreference(): boolean | null {
  try {
    const value = localStorage.getItem(preferenceKey)
    return value === 'true' ? true : value === 'false' ? false : null
  } catch {
    return null
  }
}

export function useSidebarCollapse() {
  const wide = useSyncExternalStore(
    subscribe,
    () => window.matchMedia(wideScreen).matches,
    () => true,
  )
  const [preference, setPreference] = useState(readPreference)
  const collapsed = preference ?? !wide

  function toggle() {
    const next = !collapsed
    setPreference(next)
    try {
      localStorage.setItem(preferenceKey, String(next))
    } catch {
      // A escolha continua funcionando nesta sessão sem acesso ao armazenamento.
    }
  }

  return { collapsed, toggle }
}
