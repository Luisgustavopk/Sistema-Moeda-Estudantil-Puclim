import { ArrowLeft } from 'lucide-react'
import { Link, NavLink } from 'react-router'
export function RegistrationHeader() {
  return (
    <>
      <Link to="/login" className="text-link auth-back">
        <ArrowLeft size={16} /> Voltar para entrar
      </Link>
      <p className="eyebrow">Uma nova possibilidade</p>
      <h1>Faça parte do Puclim.</h1>
      <p className="muted" style={{ marginTop: 9 }}>
        Escolha seu cadastro e comece a fazer a diferença.
      </p>
      <div className="registration-tabs">
        <NavLink
          to="/cadastro/aluno"
          className={({ isActive }) => (isActive ? 'active' : '')}
        >
          Sou aluno
        </NavLink>
        <NavLink
          to="/cadastro/empresa"
          className={({ isActive }) => (isActive ? 'active' : '')}
        >
          Sou uma organização
        </NavLink>
      </div>
    </>
  )
}
