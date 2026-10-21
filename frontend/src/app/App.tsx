import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router'
import { Loading } from '@/shared/components/ui/Feedback'
import { AuthLayout } from './layouts/AuthLayout'
import { AppLayout } from './layouts/AppLayout'
import {
  GuestGuard,
  HomeRedirect,
  RouteGuard,
} from '@/features/auth/components/RouteGuard'
import { NotFoundPage } from './NotFoundPage'
const PublicProfilePage = lazy(() =>
  import('@/features/gamificacao/ProfileRanking').then((module) => ({
    default: module.PublicProfilePage,
  })),
)
const RankingPage = lazy(() =>
  import('@/features/gamificacao/RankingPage').then((module) => ({
    default: module.RankingPage,
  })),
)
const QuestionsPage = lazy(() =>
  import('@/features/gamificacao/QuizPages').then((module) => ({
    default: module.QuestionsPage,
  })),
)
const QuizPage = lazy(() =>
  import('@/features/gamificacao/QuizStudentPage').then((module) => ({
    default: module.QuizPage,
  })),
)
const QuizHistoryPage = lazy(() =>
  import('@/features/gamificacao/QuizHistoryPage').then((module) => ({
    default: module.QuizHistoryPage,
  })),
)
const AchievementsPage = lazy(() =>
  import('@/features/gamificacao/AchievementsPage').then((module) => ({
    default: module.AchievementsPage,
  })),
)
const ProfileEditPage = lazy(() =>
  import('@/features/gamificacao/ProfileEditPage').then((module) => ({
    default: module.ProfileEditPage,
  })),
)
const MissionsPage = lazy(() =>
  import('@/features/gamificacao/MissionsPage').then((module) => ({
    default: module.MissionsPage,
  })),
)
const FundPage = lazy(() =>
  import('@/features/gamificacao/EconomyPages').then((module) => ({
    default: module.FundPage,
  })),
)
const RewardsPage = lazy(() =>
  import('@/features/gamificacao/EconomyPages').then((module) => ({
    default: module.RewardsPage,
  })),
)
const DonationsPage = lazy(() =>
  import('@/features/gamificacao/EconomyPages').then((module) => ({
    default: module.DonationsPage,
  })),
)
const ChallengesPage = lazy(() =>
  import('@/features/gamificacao/EconomyPages').then((module) => ({
    default: module.ChallengesPage,
  })),
)

const LoginPage = lazy(() =>
  import('@/features/auth/pages/LoginPage').then((module) => ({
    default: module.LoginPage,
  })),
)
const StudentRegistrationPage = lazy(() =>
  import('@/features/alunos/pages/StudentRegistrationPage').then((module) => ({
    default: module.StudentRegistrationPage,
  })),
)
const PartnerRegistrationPage = lazy(() =>
  import('@/features/empresas/pages/PartnerRegistrationPage').then(
    (module) => ({ default: module.PartnerRegistrationPage }),
  ),
)
const FirstAccessPage = lazy(() =>
  import('@/features/auth/pages/FirstAccessPage').then((module) => ({
    default: module.FirstAccessPage,
  })),
)
const StudentDashboardPage = lazy(() =>
  import('@/features/alunos/pages/StudentDashboardPage').then((module) => ({
    default: module.StudentDashboardPage,
  })),
)
const TeacherDashboardPage = lazy(() =>
  import('@/features/moedas/pages/TeacherDashboardPage').then((module) => ({
    default: module.TeacherDashboardPage,
  })),
)
const PartnerDashboardPage = lazy(() =>
  import('@/features/empresas/pages/PartnerDashboardPage').then((module) => ({
    default: module.PartnerDashboardPage,
  })),
)
const TransferPage = lazy(() =>
  import('@/features/moedas/pages/TransferPage').then((module) => ({
    default: module.TransferPage,
  })),
)
const StatementPage = lazy(() =>
  import('@/features/moedas/pages/StatementPage').then((module) => ({
    default: module.StatementPage,
  })),
)
const CatalogPage = lazy(() =>
  import('@/features/vantagens/pages/CatalogPage').then((module) => ({
    default: module.CatalogPage,
  })),
)
const ManageAdvantagesPage = lazy(() =>
  import('@/features/vantagens/pages/ManageAdvantagesPage').then((module) => ({
    default: module.ManageAdvantagesPage,
  })),
)
const AdvantageFormPage = lazy(() =>
  import('@/features/vantagens/pages/AdvantageFormPage').then((module) => ({
    default: module.AdvantageFormPage,
  })),
)
const CouponsPage = lazy(() =>
  import('@/features/cupons/pages/CouponsPage').then((module) => ({
    default: module.CouponsPage,
  })),
)
const CheckCouponPage = lazy(() =>
  import('@/features/cupons/pages/CheckCouponPage').then((module) => ({
    default: module.CheckCouponPage,
  })),
)
const ProfilePage = lazy(() =>
  import('@/features/conta/pages/ProfilePage').then((module) => ({
    default: module.ProfilePage,
  })),
)
const TeachersPage = lazy(() =>
  import('@/features/instituicoes/pages/TeachersPage').then((module) => ({
    default: module.TeachersPage,
  })),
)
const NotificationsPage = lazy(() =>
  import('@/features/notificacoes/pages/NotificationsPage').then((module) => ({
    default: module.NotificationsPage,
  })),
)

export default function App() {
  return (
    <Suspense fallback={<Loading label="Preparando seu espaço..." />}>
      <Routes>
        <Route path="/" element={<HomeRedirect />} />
        <Route element={<GuestGuard />}>
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/cadastro/aluno"
              element={<StudentRegistrationPage />}
            />
            <Route
              path="/cadastro/empresa"
              element={<PartnerRegistrationPage />}
            />
          </Route>
        </Route>
        <Route element={<RouteGuard />}>
          <Route element={<AuthLayout />}>
            <Route path="/primeiro-acesso" element={<FirstAccessPage />} />
          </Route>
          <Route element={<AppLayout />}>
            <Route path="/perfil" element={<ProfilePage />} />
            <Route path="/notificacoes" element={<NotificationsPage />} />
            <Route element={<RouteGuard roles={['ALUNO', 'PROFESSOR']} />}>
              <Route path="/ranking" element={<RankingPage />} />
              <Route path="/perfis/:id" element={<PublicProfilePage />} />
            </Route>
            <Route element={<RouteGuard roles={['ALUNO']} />}>
              <Route path="/perfil/editar" element={<ProfileEditPage />} />
              <Route path="/aluno" element={<StudentDashboardPage />} />
              <Route path="/aluno/catalogo" element={<CatalogPage />} />
              <Route path="/aluno/extrato" element={<StatementPage />} />
              <Route path="/aluno/cupons" element={<CouponsPage />} />
              <Route path="/aluno/conquistas" element={<AchievementsPage />} />
              <Route path="/aluno/quiz" element={<QuizPage />} />
              <Route
                path="/aluno/quiz/historico"
                element={<QuizHistoryPage />}
              />
              <Route path="/aluno/missoes" element={<MissionsPage />} />
              <Route path="/aluno/recompensas" element={<RewardsPage />} />
            </Route>
            <Route element={<RouteGuard roles={['PROFESSOR']} />}>
              <Route path="/professor" element={<TeacherDashboardPage />} />
              <Route path="/professor/enviar" element={<TransferPage />} />
              <Route path="/professor/extrato" element={<StatementPage />} />
              <Route path="/professor/perguntas" element={<QuestionsPage />} />
              <Route path="/professor/missoes" element={<MissionsPage />} />
            </Route>
            <Route element={<RouteGuard roles={['EMPRESA']} />}>
              <Route path="/empresa" element={<PartnerDashboardPage />} />
              <Route element={<RouteGuard partnerKind="EMPRESA" />}>
                <Route
                  path="/empresa/vantagens"
                  element={<ManageAdvantagesPage />}
                />
                <Route
                  path="/empresa/vantagens/nova"
                  element={<AdvantageFormPage />}
                />
                <Route
                  path="/empresa/vantagens/:id/editar"
                  element={<AdvantageFormPage />}
                />
                <Route path="/empresa/cupons" element={<CheckCouponPage />} />
                <Route path="/empresa/desafios" element={<ChallengesPage />} />
              </Route>
              <Route element={<RouteGuard partnerKind="ENSINO" />}>
                <Route path="/empresa/professores" element={<TeachersPage />} />
                <Route path="/empresa/fundo" element={<FundPage />} />
              </Route>
              <Route element={<RouteGuard partnerKind="BENEFICIARIA" />}>
                <Route path="/empresa/doacoes" element={<DonationsPage />} />
              </Route>
            </Route>
          </Route>
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  )
}
