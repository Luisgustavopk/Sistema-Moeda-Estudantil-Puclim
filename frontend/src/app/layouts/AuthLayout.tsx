import { Outlet } from 'react-router'
import { Brand, Coin } from '@/shared/components/ui/Brand'
import { ThemeToggle } from '@/shared/components/ui/ThemeToggle'
import { DATA_MODE } from '@/shared/lib/http'
export function AuthLayout() {
  return (
    <div className="auth-layout">
      <aside className="auth-story">
        <Brand light />
        <div>
          <p className="eyebrow">Seu esforço faz a diferença</p>
          <h1>
            Pequenas atitudes.
            <br />
            <em>Grandes conquistas.</em>
          </h1>
          <p>
            Seu mérito tem valor. Transforme dedicação, participação e boas
            ideias em novas possibilidades.
          </p>
          <div className="auth-art">
            <Coin size={54} />
            <div>
              <strong>Reconhecimento que circula.</strong>
              <small>Da sala de aula para o seu dia a dia.</small>
            </div>
          </div>
        </div>
        <footer>PUC Minas · Sistema de Moeda Estudantil</footer>
      </aside>
      <main className="auth-main">
        <div className="auth-tools">
          <span className="mobile-brand">
            <Brand />
          </span>
          {DATA_MODE === 'demo' && (
            <span className="demo-badge">Ambiente de demonstração</span>
          )}
          <ThemeToggle />
        </div>
        <Outlet />
      </main>
    </div>
  )
}
