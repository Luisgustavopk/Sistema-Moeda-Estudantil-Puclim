import {
  Bell,
  ChevronRight,
  Gift,
  GraduationCap,
  Home,
  LogOut,
  Menu,
  ScanLine,
  Send,
  Sparkles,
  Ticket,
  UserRound,
  Users,
  Wallet,
  X,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router'
import { useAuth } from '@/features/auth/hooks/auth-context'
import { homeFor } from '@/features/auth/utils/routing'
import { Brand } from '@/shared/components/ui/Brand'
import { Avatar } from '@/shared/components/ui/Avatar'
import { ThemeToggle } from '@/shared/components/ui/ThemeToggle'
import { DATA_MODE } from '@/shared/lib/http'
import { useToast } from '@/shared/hooks/toast-context'
import { errorMessage } from '@/shared/lib/errors'
import { AchievementFeed } from '@/features/gamificacao/Inbox'
import { ConfirmationFeedback } from '@/shared/components/ui/ConfirmationFeedback'
import { ResponsiveSidebar } from '@/shared/components/ui/ResponsiveSidebar'

export function AppLayout() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const menuTrigger = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])
  useEffect(() => {
    const media = matchMedia('(min-width: 768px)')
    const close = () => {
      if (media.matches) setOpen(false)
    }
    media.addEventListener('change', close)
    return () => {
      media.removeEventListener('change', close)
    }
  }, [])
  if (!user) return null
  const items =
    user.role === 'ALUNO'
      ? [
          { path: '/aluno', label: 'Meu espaço', icon: Home },
          { path: '/aluno/catalogo', label: 'Vantagens', icon: Gift },
          { path: '/aluno/extrato', label: 'Meu extrato', icon: Wallet },
          {
            path: '/aluno/transferencias',
            label: 'Transferências',
            icon: Send,
          },
          { path: '/aluno/cupons', label: 'Meus cupons', icon: Ticket },
          { path: '/aluno/conquistas', label: 'Conquistas', icon: Sparkles },
          { path: '/ranking', label: 'Rankings', icon: Users },
          { path: '/aluno/quiz', label: 'Quiz diário', icon: GraduationCap },
          { path: '/aluno/missoes', label: 'Missões', icon: Send },
          { path: '/aluno/recompensas', label: 'Recompensas', icon: Gift },
        ]
      : user.role === 'PROFESSOR'
        ? [
            { path: '/professor', label: 'Meu painel', icon: Home },
            { path: '/professor/enviar', label: 'Enviar moedas', icon: Send },
            {
              path: '/professor/transferencias-alunos',
              label: 'Entre alunos',
              icon: Users,
            },
            { path: '/professor/extrato', label: 'Meu extrato', icon: Wallet },
            {
              path: '/professor/perguntas',
              label: 'Perguntas',
              icon: GraduationCap,
            },
            { path: '/professor/missoes', label: 'Missões', icon: Send },
            { path: '/ranking', label: 'Rankings e perfis', icon: Users },
          ]
        : [
            { path: '/empresa', label: 'Meu painel', icon: Home },
            ...(user.partnerKind === 'EMPRESA'
              ? [
                  {
                    path: '/empresa/vantagens',
                    label: 'Minhas vantagens',
                    icon: Gift,
                  },
                  {
                    path: '/empresa/desafios',
                    label: 'Desafios',
                    icon: Sparkles,
                  },
                  {
                    path: '/empresa/cupons',
                    label: 'Conferir cupons',
                    icon: ScanLine,
                  },
                ]
              : []),
            ...(user.partnerKind === 'ENSINO'
              ? [
                  {
                    path: '/empresa/professores',
                    label: 'Professores',
                    icon: Users,
                  },
                  {
                    path: '/empresa/fundo',
                    label: 'Fundo institucional',
                    icon: Wallet,
                  },
                ]
              : []),
          ]
  if (user.partnerKind === 'BENEFICIARIA')
    items.push({
      path: '/empresa/doacoes',
      label: 'Doações recebidas',
      icon: Gift,
    })
  const roleLabel =
    user.role === 'ALUNO'
      ? 'Aluno'
      : user.role === 'PROFESSOR'
        ? 'Professor'
        : user.partnerKind === 'ENSINO'
          ? 'Instituição de ensino'
          : user.partnerKind === 'BENEFICIARIA'
            ? 'Instituição beneficiária'
            : 'Empresa parceira'
  const activeLabel =
    location.pathname === '/aluno/quiz/historico'
      ? 'Histórico de quizzes'
      : location.pathname === '/perfil'
        ? 'Minha conta'
        : location.pathname === '/perfil/editar'
          ? 'Editar perfil'
          : location.pathname.startsWith('/perfis/')
            ? 'Perfil de mérito'
            : location.pathname === '/notificacoes'
              ? 'Notificações'
              : [...items]
                  .reverse()
                  .find(
                    (item) =>
                      location.pathname === item.path ||
                      location.pathname.startsWith(`${item.path}/`),
                  )?.label || 'Meu espaço'
  return (
    <div className="app-shell">
      <AchievementFeed />
      <ConfirmationFeedback />
      <a className="skip-link" href="#conteudo">
        Pular para o conteúdo
      </a>
      <ResponsiveSidebar
        open={open}
        returnFocus={menuTrigger}
        onClose={() => setOpen(false)}
      >
        <Link to={homeFor(user)} aria-label="Puclim, página inicial">
          <Brand />
        </Link>
        <div>
          <nav aria-label="Navegação principal">
            {items.map(({ path, label, icon: Icon }) => (
              <NavLink
                key={path}
                to={path}
                aria-label={label}
                end={path === homeFor(user)}
                className={({ isActive }) =>
                  `nav-link ${['/aluno/conquistas', '/professor/perguntas'].includes(path) ? 'nav-group-start' : ''} ${isActive ? 'active' : ''}`
                }
              >
                <Icon size={19} />
                <span>{label}</span>
                <span className="nav-tooltip" aria-hidden="true">
                  {label}
                </span>
              </NavLink>
            ))}
            <NavLink
              to="/notificacoes"
              aria-label="Notificações"
              className={({ isActive }) =>
                `nav-link nav-group-start ${isActive ? 'active' : ''}`
              }
            >
              <Bell size={19} />
              <span>Notificações</span>
              <span className="nav-tooltip" aria-hidden="true">
                Notificações
              </span>
            </NavLink>
            <NavLink
              to="/perfil"
              aria-label="Minha conta"
              className={({ isActive }) =>
                `nav-link ${isActive ? 'active' : ''}`
              }
            >
              <UserRound size={19} />
              <span>Minha conta</span>
              <span className="nav-tooltip" aria-hidden="true">
                Minha conta
              </span>
            </NavLink>
          </nav>
        </div>
        <div className="sidebar-footer">
          <div className="sidebar-user">
            <Link
              to="/perfil"
              className="sidebar-profile"
              aria-label="Abrir minha conta"
            >
              <Avatar name={user.name} />
              <div className="sidebar-user-info">
                <strong>{user.name.split(' ').slice(0, 2).join(' ')}</strong>
                <small>{roleLabel}</small>
              </div>
            </Link>
            <button
              className="logout-button"
              disabled={leaving}
              aria-label="Sair da conta"
              onClick={async () => {
                setLeaving(true)
                try {
                  await logout()
                } catch (error) {
                  toast(errorMessage(error), 'error')
                  setLeaving(false)
                }
              }}
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </ResponsiveSidebar>
      <div className="workspace">
        <header className="topbar">
          <div className="topbar-inner">
            <button
              className="icon-button mobile-menu"
              ref={menuTrigger}
              aria-label={open ? 'Fechar menu' : 'Abrir menu'}
              aria-expanded={open}
              aria-controls="menu-lateral"
              onClick={() => setOpen(!open)}
            >
              {open ? <X size={19} /> : <Menu size={19} />}
            </button>
            <span className="mobile-brand">
              <Brand />
            </span>
            <nav
              className="topbar-location"
              aria-label="Localização na aplicação"
            >
              <GraduationCap size={20} aria-hidden="true" />
              <Link to={homeFor(user)}>Puclim</Link>
              <ChevronRight size={15} aria-hidden="true" />
              <span aria-current="page">{activeLabel}</span>
            </nav>
            <div className="topbar-actions">
              {DATA_MODE === 'demo' && (
                <span
                  className="demo-badge"
                  title="Ambiente de demonstração com dados fictícios"
                >
                  Demonstração
                </span>
              )}
              <ThemeToggle />
            </div>
          </div>
        </header>
        <main id="conteudo" className="content">
          <Outlet />
          <footer className="content-footer">
            <span>Puclim · mérito que vale moeda</span>
            <span>Feito para reconhecer e conectar.</span>
          </footer>
        </main>
      </div>
      {user.role === 'ALUNO' && (
        <nav className="mobile-bottom-nav" aria-label="Atalhos do aluno">
          {[
            { path: '/aluno', label: 'Início', icon: Home },
            { path: '/aluno/conquistas', label: 'Conquistas', icon: Sparkles },
            { path: '/aluno/quiz', label: 'Quiz', icon: GraduationCap },
            { path: '/ranking', label: 'Ranking', icon: Users },
          ].map(({ path, label, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              end
              className={({ isActive }) => (isActive ? 'active' : '')}
            >
              <Icon size={20} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      )}
    </div>
  )
}
