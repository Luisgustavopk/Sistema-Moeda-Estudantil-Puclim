import { Moon, Sun } from 'lucide-react'
import { useEffect, useSyncExternalStore } from 'react'
function subscribe(listener: () => void) {
  window.addEventListener('puclim:theme', listener)
  window.addEventListener('storage', listener)
  return () => {
    window.removeEventListener('puclim:theme', listener)
    window.removeEventListener('storage', listener)
  }
}
const snapshot = () => localStorage.getItem('puclim.theme') === 'dark'
export function ThemeSync() {
  const dark = useSyncExternalStore(subscribe, snapshot)
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light'
  }, [dark])
  return null
}
export function ThemeToggle({ labelled = false }: { labelled?: boolean }) {
  const dark = useSyncExternalStore(subscribe, snapshot)
  return (
    <button
      type="button"
      className={labelled ? 'nav-link theme-navigation' : 'icon-button'}
      aria-label={dark ? 'Ativar modo claro' : 'Ativar modo escuro'}
      aria-pressed={dark}
      onClick={() => {
        const root = document.documentElement
        root.classList.add('theme-switching')
        localStorage.setItem('puclim.theme', dark ? 'light' : 'dark')
        root.dataset.theme = dark ? 'light' : 'dark'
        void root.offsetHeight
        window.dispatchEvent(new Event('puclim:theme'))
        requestAnimationFrame(() =>
          requestAnimationFrame(() => root.classList.remove('theme-switching')),
        )
      }}
    >
      {dark ? <Sun size={20} /> : <Moon size={20} />}
      {labelled && <span>{dark ? 'Modo claro' : 'Modo escuro'}</span>}
    </button>
  )
}
