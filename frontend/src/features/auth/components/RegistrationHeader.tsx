import { ArrowLeft, Building2, GraduationCap } from 'lucide-react'
import { Link, NavLink, useLocation } from 'react-router'
import { UnsavedPrompt } from '@/shared/components/ui/UnsavedPrompt'

const registrationOptions = [
  {
    href: '/cadastro/aluno',
    label: 'Sou aluno',
    description: 'Meu espaço de conquistas',
    icon: GraduationCap,
  },
  {
    href: '/cadastro/empresa',
    label: 'Sou uma organização',
    description: 'Empresa ou instituição',
    icon: Building2,
  },
] as const

export function RegistrationHeader() {
  const pathname = useLocation().pathname.replace(/\/+$/, '')
  return (
    <>
      <Link to="/login" className="text-link auth-back">
        <ArrowLeft size={16} /> Voltar para entrar
      </Link>
      <h1 id="registration-title">Faça parte do Puclim.</h1>
      <p className="muted" style={{ marginTop: 9 }}>
        Escolha seu cadastro e comece a fazer a diferença.
      </p>
      <nav
        className="registration-tabs"
        aria-label="Tipo de cadastro"
        data-organization={pathname === '/cadastro/empresa' || undefined}
      >
        {registrationOptions.map(({ href, label, description, icon: Icon }) => (
          <NavLink
            key={href}
            to={href}
            className={({ isActive }) => (isActive ? 'active' : '')}
            onClick={(event) => {
              if (
                pathname === href &&
                !event.metaKey &&
                !event.ctrlKey &&
                !event.shiftKey &&
                !event.altKey
              )
                event.preventDefault()
            }}
          >
            <Icon size={22} aria-hidden="true" />
            <span className="registration-option-copy">
              <span className="registration-option-label">{label}</span>
              <span className="registration-option-description">
                {description}
              </span>
            </span>
          </NavLink>
        ))}
      </nav>
    </>
  )
}

export function RegistrationLeavePrompt({ dirty }: { dirty: boolean }) {
  return (
    <UnsavedPrompt
      dirty={dirty}
      title="Descartar este cadastro?"
      message="Ao sair desta tela, todos os dados preenchidos neste cadastro serão perdidos."
      stayLabel="Continuar preenchendo"
      leaveLabel="Descartar e sair"
      destructive
    />
  )
}
