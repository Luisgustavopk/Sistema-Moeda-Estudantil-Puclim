import { Link, useParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/hooks/auth-context'
import { DATA_MODE } from '@/shared/lib/http'
import { PageHeading } from '@/shared/components/ui/PageHeading'
import { QueryState } from '@/shared/components/ui/Feedback'
import { number } from '@/shared/utils/format'
import { gameApi } from './api'

import type { Profile } from './types'
import { ProfileShowcase } from './components/ProfileShowcase'
import {
  customizationAdapter,
  defaultCustomization,
} from './profile-customization'
import { demoProfile } from './demo-profile'
import { api } from '@/shared/lib/api'

export function ProgressCard({ profile }: { profile: Profile }) {
  return (
    <section className="card merit-progress">
      <div className="section-heading">
        <h2>Nível {profile.level}</h2>
        <span className="badge">{profile.streak} dias de streak</span>
      </div>
      <p>{number(profile.totalReceived)} moedas recebidas no total</p>
      <progress
        aria-label="Progresso de nível"
        max={100}
        value={profile.progressPercent}
        style={{ width: '100%', margin: '12px 0' }}
      />
      <p>
        {profile.nextLevelAt === null
          ? 'Você alcançou o maior nível disponível.'
          : `${number(Math.max(0, profile.nextLevelAt - profile.totalReceived))} moedas para o próximo nível.`}
      </p>
      <p className="small muted">
        Recorde de streak: {profile.bestStreak} · Ranking de moedas:{' '}
        {profile.coinPosition ? `${profile.coinPosition}º` : '—'} · Streak:{' '}
        {profile.streakPosition ? `${profile.streakPosition}º` : '—'}
      </p>
      <div className="chips" style={{ marginTop: 12 }}>
        {profile.badges
          .filter((b) => b.unlockedAt)
          .map((b) => (
            <span
              className="badge badge-success"
              key={b.id}
              title={b.description}
            >
              {b.name}
            </span>
          ))}
      </div>
    </section>
  )
}
export function DashboardProgress() {
  const { user } = useAuth()
  const query = useQuery({
    queryKey: ['game', 'profile', user?.id],
    queryFn: () => gameApi.profile(),
    enabled: DATA_MODE === 'api',
    refetchInterval: 30000,
  })
  if (DATA_MODE === 'demo') return null
  return (
    <>
      <QueryState
        loading={query.isLoading}
        error={query.error}
        retry={query.refetch}
      />
      {query.data && (
        <>
          <ProgressCard profile={query.data} />
          <div className="merit-links">
            <Link className="text-link" to="/aluno/conquistas">
              Ver minhas conquistas
            </Link>
            <Link className="text-link" to="/aluno/quiz">
              Continuar aprendendo
            </Link>
          </div>
        </>
      )}
    </>
  )
}

export function PublicProfilePage() {
  const { id } = useParams()
  const { user } = useAuth()
  const own = user?.role === 'ALUNO' && id === user.id
  const isDemo = DATA_MODE === 'demo' && own
  const institutions = useQuery({
    queryKey: ['institutions'],
    queryFn: api.institutions,
    enabled: isDemo,
  })
  const query = useQuery({
    queryKey: ['game', 'profile', id || user?.id],
    queryFn: () => gameApi.profile(id),
    enabled: !isDemo,
  })
  const settings = useQuery({
    queryKey: ['profile-customization', user?.id],
    queryFn: () => customizationAdapter.load(user!.id, user!.name),
    enabled: isDemo,
  })
  const profile = isDemo
    ? demoProfile(
        user!.id,
        user!.name,
        user!.course || '',
        institutions.data?.find((i) => i.id === user!.institutionId)?.name ||
          'Instituição de demonstração',
      )
    : query.data
  return (
    <div className="merit-page">
      <PageHeading
        title="Perfil de mérito"
        description="Uma trajetória de aprendizado e reconhecimento."
        action={
          own ? (
            <div className="merit-links">
              <Link className="button button-secondary" to="/perfil/editar">
                Editar perfil
              </Link>
              <Link className="text-link" to="/perfil">
                Minha conta
              </Link>
            </div>
          ) : undefined
        }
      />
      {isDemo && (
        <p className="notice notice-info">
          Demonstração explícita: níveis, conquistas e estatísticas são exemplos
          para a prévia. Visibilidade de perfil ainda não tem controle de acesso
          na API.
        </p>
      )}
      <QueryState
        loading={!isDemo && query.isLoading}
        error={query.error}
        retry={query.refetch}
      />
      {isDemo && (
        <QueryState
          loading={settings.isLoading}
          error={settings.error}
          retry={settings.refetch}
        />
      )}
      {profile && (
        <ProfileShowcase
          profile={profile}
          settings={
            isDemo && settings.data
              ? settings.data
              : {
                  ...defaultCustomization(profile.name),
                  avatar: 'portrait',
                  featuredBadgeIds: profile.badges
                    .filter((b) => b.unlockedAt)
                    .slice(0, 3)
                    .map((b) => b.id),
                }
          }
        />
      )}
      {user?.role === 'PROFESSOR' && (
        <p className="notice notice-info">
          Este perfil mostra somente a projeção pública. Os envios que você
          realizou continuam no seu próprio extrato.
        </p>
      )}
    </div>
  )
}
