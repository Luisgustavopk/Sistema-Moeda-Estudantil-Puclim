import { Link } from 'react-router'
import { Brand } from '@/shared/components/ui/Brand'
export function NotFoundPage() {
  return (
    <div className="fatal-error">
      <Brand />
      <p className="eyebrow">404 · caminho não encontrado</p>
      <h1>Vamos encontrar outro caminho?</h1>
      <p className="muted">Esta página não existe ou foi movida.</p>
      <Link className="button button-primary" to="/">
        Voltar ao meu espaço
      </Link>
    </div>
  )
}
