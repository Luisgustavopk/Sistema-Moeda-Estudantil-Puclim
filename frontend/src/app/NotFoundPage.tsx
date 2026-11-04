import { Link } from 'react-router'
import { Brand } from '@/shared/components/ui/Brand'
export function NotFoundPage() {
  return (
    <div className="fatal-error">
      <Brand />
      <h1>Página não encontrada</h1>
      <p className="muted">Esta página não existe ou foi movida.</p>
      <Link className="button button-primary" to="/">
        Voltar ao meu espaço
      </Link>
    </div>
  )
}
