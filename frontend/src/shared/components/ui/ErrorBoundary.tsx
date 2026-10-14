import { Component, type ReactNode } from 'react'
import { Brand } from './Brand'
export class ErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    if (this.state.failed)
      return (
        <div className="fatal-error">
          <Brand />
          <h1>Não conseguimos abrir esta página.</h1>
          <p>
            Recarregue para tentar novamente. Seus dados salvos serão
            preservados.
          </p>
          <button
            className="button button-primary"
            onClick={() => window.location.reload()}
          >
            Recarregar página
          </button>
        </div>
      )
    return this.props.children
  }
}
