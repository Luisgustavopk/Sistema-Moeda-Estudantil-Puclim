import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/hooks/auth-context'
import { DATA_MODE } from '@/shared/lib/http'
import { PageHeading } from '@/shared/components/ui/PageHeading'
import { QueryState, EmptyState } from '@/shared/components/ui/Feedback'
import { Button } from '@/shared/components/ui/Button'
import { dateTime, number } from '@/shared/utils/format'
import { gameApi } from './api'
import { api } from '@/shared/lib/api'
import type { Profile } from './types'

export function ProgressCard({ profile }: { profile: Profile }) {
  return (
    <section className="card">
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
          : `${number(profile.nextLevelAt - profile.totalReceived)} moedas para o próximo nível.`}
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
          <Link className="text-link" to="/aluno/conquistas">
            Ver minhas conquistas
          </Link>
        </>
      )}
    </>
  )
}
export function PublicProfilePage() {
  const { id } = useParams()
  const { user } = useAuth()
  const query = useQuery({
    queryKey: ['game', 'profile', id || user?.id],
    queryFn: () => gameApi.profile(id),
  })
  return (
    <>
      <PageHeading
        title={query.data?.name || 'Perfil de mérito'}
        description={
          query.data
            ? `${query.data.course} · ${query.data.institution}`
            : 'Progresso e conquistas do aluno.'
        }
      />
      <QueryState
        loading={query.isLoading}
        error={query.error}
        retry={query.refetch}
      />
      {query.data && (
        <>
          <ProgressCard profile={query.data} />
          <div className="stat-grid">
            {query.data.badges.map((b) => (
              <article className="card" key={b.id}>
                <h3>{b.name}</h3>
                <span className="badge">{b.rarity}</span>
                <p>{b.description}</p>
                <progress
                  aria-label={`Progresso: ${b.name}`}
                  max={b.target}
                  value={b.progress}
                />
                <p>
                  {b.unlockedAt
                    ? `Conquistada em ${dateTime(b.unlockedAt)}`
                    : `${b.progress} de ${b.target}`}
                </p>
              </article>
            ))}
          </div>
          <section className="card">
            <h2>Histórico de níveis</h2>
            {query.data.history.length === 0 && (
              <p>Seus próximos níveis aparecerão aqui.</p>
            )}
            {query.data.history.map((h) => (
              <p key={h.level}>
                Nível {h.level} · {number(h.total)} moedas acumuladas ·{' '}
                {dateTime(h.date)}
              </p>
            ))}
          </section>
        </>
      )}
    </>
  )
}
export function RankingPage() {
  const { user } = useAuth()
  const [semester, setSemester] = useState('')
  const [type, setType] = useState('MOEDAS')
  const [page, setPage] = useState(0)
  const [institution, setInstitution] = useState('')
  const institutions = useQuery({
    queryKey: ['institutions'],
    queryFn: api.institutions,
  })
  const query = useQuery({
    queryKey: ['game', 'ranking', user?.id, institution, semester, type, page],
    queryFn: () =>
      gameApi.ranking(semester, type, page, institution || user?.institutionId),
    enabled: semester === '' || /^[0-9]{4}-[12]$/.test(semester),
  })
  return (
    <>
      <PageHeading
        title="Rankings"
        description="Moedas recebidas e constância no semestre da sua instituição."
      />
      <div className="card toolbar">
        <label>
          Instituição
          <select
            aria-label="Instituição do ranking"
            value={institution || user?.institutionId || ''}
            onChange={(e) => {
              setInstitution(e.target.value)
              setPage(0)
            }}
          >
            {institutions.data?.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Semestre
          <input
            aria-label="Semestre do ranking"
            placeholder={query.data?.semester || 'AAAA-1'}
            value={semester}
            maxLength={6}
            pattern="[0-9]{4}-[12]"
            onChange={(e) => {
              setSemester(e.target.value)
              setPage(0)
            }}
          />
        </label>
        <label>
          Ranking
          <select
            value={type}
            onChange={(e) => {
              setType(e.target.value)
              setPage(0)
            }}
          >
            <option value="MOEDAS">Moedas recebidas</option>
            <option value="STREAK">Maior streak</option>
          </select>
        </label>
      </div>
      <QueryState
        loading={query.isLoading}
        error={query.error}
        retry={query.refetch}
      />
      <QueryState
        loading={institutions.isLoading}
        error={institutions.error}
        retry={institutions.refetch}
      />
      {semester && !/^[0-9]{4}-[12]$/.test(semester) && (
        <p role="alert" className="field-error">
          Use o formato AAAA-1 ou AAAA-2.
        </p>
      )}
      {query.data && (
        <section className="card">
          <p>
            {query.data.semester} ·{' '}
            {query.data.own
              ? `Sua posição: ${query.data.own.position}º`
              : 'Seu perfil não participa deste ranking.'}
          </p>
          {!query.data.content.length && (
            <EmptyState
              title="Ranking ainda sem participantes"
              description="Os resultados do semestre aparecerão aqui."
            />
          )}
          {query.data.content.map((r) => (
            <div className="row" key={r.studentId}>
              <strong>{r.position}º</strong>
              <div className="row-text">
                <Link className="text-link" to={`/perfis/${r.studentId}`}>
                  {r.name}
                </Link>
                <p>
                  {r.course} · {r.institution}
                </p>
                <p>
                  Nível {r.level} · {r.streak} dias
                </p>
              </div>
              <strong>{number(r.received)} moedas</strong>
            </div>
          ))}
          <div className="toolbar">
            <Button
              variant="secondary"
              disabled={page === 0}
              onClick={() => setPage(page - 1)}
            >
              Anterior
            </Button>
            <span>Página {page + 1}</span>
            <Button
              variant="secondary"
              disabled={(page + 1) * query.data.size >= query.data.total}
              onClick={() => setPage(page + 1)}
            >
              Próxima
            </Button>
          </div>
        </section>
      )}
    </>
  )
}
