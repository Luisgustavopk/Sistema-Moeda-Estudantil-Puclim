import { Select } from '@/shared/components/ui/Select'
import { useState } from 'react'
import { Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { Flame, Trophy } from 'lucide-react'
import { useAuth } from '@/features/auth/hooks/auth-context'
import { PageHeading } from '@/shared/components/ui/PageHeading'
import { QueryState, EmptyState } from '@/shared/components/ui/Feedback'
import { ProfileIdentity } from './components/ProfileShowcase'
import { Button } from '@/shared/components/ui/Button'
import { number } from '@/shared/utils/format'
import { api } from '@/shared/lib/api'
import { gameApi } from './api'
import type { Rank } from './types'

export function RankingPage() {
  const { user } = useAuth()
  const [semester, setSemester] = useState('')
  const [type, setType] = useState('MOEDAS')
  const [page, setPage] = useState(0)
  const [institution, setInstitution] = useState(user?.institutionId || '')
  const institutions = useQuery({
    queryKey: ['institutions'],
    queryFn: api.institutions,
  })
  const valid = semester === '' || /^\d{4}-[12]$/.test(semester)
  const baseKey = ['game', 'ranking', user?.id, institution, semester, type]
  const query = useQuery({
    queryKey: [...baseKey, page],
    queryFn: () => gameApi.ranking(semester, type, page, institution),
    enabled: valid,
  })
  const podium = useQuery({
    queryKey: [...baseKey, 0],
    queryFn: () => gameApi.ranking(semester, type, 0, institution),
    enabled: valid,
  })
  const own = valid ? query.data?.own : null
  const [contextOpen, setContextOpen] = useState(false)
  const size = query.data?.size || 20
  const neighbors = useQuery({
    queryKey: [...baseKey, 'neighbors', own?.position, size],
    queryFn: async () => {
      const pages = [
        ...new Set(
          [own!.position - 2, own!.position - 1, own!.position]
            .filter((n) => n >= 0 && n < query.data!.total)
            .map((n) => Math.floor(n / size)),
        ),
      ]
      const results = await Promise.all(
        pages.map((index) =>
          gameApi.ranking(semester, type, index, institution),
        ),
      )
      return results
        .flatMap((result) => result.content)
        .filter((row) => Math.abs(row.position - own!.position) === 1)
    },
    enabled: !!own && valid && contextOpen,
  })
  const above = neighbors.data?.find(
    (row) => row.position === (own?.position || 0) - 1,
  )
  const value = (row: Rank) => (type === 'STREAK' ? row.streak : row.received)
  const unit = type === 'STREAK' ? 'dias' : 'moedas recebidas'
  return (
    <div className="merit-page ranking-page">
      <PageHeading
        title="Rankings"
        description="Reconhecimento e constância. Cada trajetória tem seu ritmo."
      />
      <div className="ranking-controls">
        <div
          className="merit-filters"
          role="group"
          aria-label="Tipo de ranking"
        >
          {[
            { id: 'MOEDAS', label: 'Moedas recebidas' },
            { id: 'STREAK', label: 'Maior streak' },
          ].map((tab) => (
            <button
              key={tab.id}
              className="merit-chip"
              aria-pressed={type === tab.id}
              onClick={() => {
                setType(tab.id)
                setPage(0)
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="merit-selects">
          <label>
            Instituição
            <Select
              aria-label="Instituição do ranking"
              value={institution}
              onValueChange={(value) => {
                setInstitution(value)
                setPage(0)
              }}
            >
              {!institution && (
                <option value="">Escolha uma instituição</option>
              )}
              {institutions.data?.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name}
                </option>
              ))}
            </Select>
          </label>
          <label>
            Semestre
            <input
              aria-label="Semestre do ranking"
              value={semester}
              placeholder={query.data?.semester || 'AAAA-1'}
              maxLength={6}
              aria-invalid={!valid}
              onChange={(e) => {
                setSemester(e.target.value)
                setPage(0)
              }}
            />
          </label>
        </div>
      </div>
      {!valid && (
        <p role="alert" className="field-error">
          Use o formato AAAA-1 ou AAAA-2.
        </p>
      )}
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
      {valid && query.data && (
        <>
          {own ? (
            <div className="own-rank-group">
              <aside
                className="card own-rank"
                aria-label="Sua posição no ranking"
              >
                <div className="own-rank-main">
                  <strong>{own.position}º</strong>
                  <span>
                    <strong>Sua posição</strong>
                    <span>
                      {number(value(own))} {unit}
                    </span>
                  </span>
                  <Link className="text-link" to={`/perfis/${own.studentId}`}>
                    Meu perfil
                  </Link>
                  <Button
                    variant="ghost"
                    aria-expanded={contextOpen}
                    aria-controls="own-rank-context"
                    onClick={() => {
                      setContextOpen(!contextOpen)
                      if (!contextOpen)
                        requestAnimationFrame(() => {
                          const context =
                            document.getElementById('own-rank-context')
                          context?.focus({ preventScroll: true })
                          context?.scrollIntoView({
                            block: 'center',
                            behavior: window.matchMedia(
                              '(prefers-reduced-motion: reduce)',
                            ).matches
                              ? 'auto'
                              : 'smooth',
                          })
                        })
                    }}
                  >
                    {contextOpen ? 'Ocultar contexto' : 'Ver contexto'}
                  </Button>
                </div>
              </aside>
              {contextOpen && (
                <section
                  id="own-rank-context"
                  tabIndex={-1}
                  className="card activity-panel own-rank-context"
                >
                  <h2>Posições próximas de você</h2>
                  <p className="small muted">
                    {above
                      ? `A próxima posição tem ${number(value(above))} ${unit}. ${Math.max(0, value(above) - value(own)) === 0 ? 'Vocês estão empatados na métrica; o desempate é definido pelo sistema.' : `A diferença é de ${number(value(above) - value(own))} ${unit}. Continue no seu ritmo.`}`
                      : own.position === 1
                        ? 'Você está entre os destaques. Continue compartilhando conhecimento.'
                        : 'Seu progresso faz parte desta comunidade.'}
                  </p>
                  <div className="rank-neighbors">
                    {neighbors.data?.map((row) => (
                      <Link to={`/perfis/${row.studentId}`} key={row.studentId}>
                        {row.position}º · {row.name} · {number(value(row))}{' '}
                        {unit}
                      </Link>
                    ))}
                  </div>
                  <QueryState
                    loading={neighbors.isLoading}
                    error={neighbors.error}
                    retry={neighbors.refetch}
                  />
                </section>
              )}
            </div>
          ) : (
            <p className="muted">Seu perfil não participa deste ranking.</p>
          )}
          {!!podium.data?.content.length && (
            <section aria-labelledby="podium-title">
              <div className="section-heading">
                <h2 id="podium-title">Destaques do semestre</h2>
                <span className="muted">{query.data.semester}</span>
              </div>
              <div className="ranking-podium">
                {podium.data.content.slice(0, 3).map((row) => (
                  <Link
                    className={`card podium-member podium-${row.position}`}
                    key={row.studentId}
                    to={`/perfis/${row.studentId}`}
                    aria-label={`Perfil de ${row.name}`}
                  >
                    <span className="podium-place">
                      <Trophy size={18} />
                      {row.position}º
                    </span>
                    <span className="rank-avatar">
                      <ProfileIdentity
                        name={row.name}
                        avatar={row.avatar || 'portrait'}
                      />
                    </span>
                    <strong>{row.name}</strong>
                    <span className="small muted">Nível {row.level}</span>
                    <strong>{number(value(row))}</strong>
                    <span className="small muted">{unit}</span>
                  </Link>
                ))}
              </div>
            </section>
          )}
          <section className="card" aria-labelledby="ranking-list-title">
            <div className="section-heading">
              <h2 id="ranking-list-title">Trajetórias da instituição</h2>
              <span className="muted">{query.data.total} participantes</span>
            </div>
            {!query.data.content.length && (
              <EmptyState
                title="Ranking ainda sem participantes"
                description="Os resultados do semestre aparecerão aqui."
              />
            )}
            <div className="ranking-list">
              {query.data.content.map((row) => (
                <Link
                  className={`ranking-row ${row.studentId === user?.id ? 'ranking-self' : ''}`}
                  to={`/perfis/${row.studentId}`}
                  key={row.studentId}
                >
                  <strong className="rank-place">{row.position}º</strong>
                  <span className="ranking-list-avatar">
                    <ProfileIdentity
                      name={row.name}
                      avatar={row.avatar || 'portrait'}
                    />
                  </span>
                  <span className="rank-identity">
                    <strong>
                      {row.name}
                      {row.studentId === user?.id ? ' · Você' : ''}
                    </strong>
                    <span className="small muted">{row.course}</span>
                    <span className="small muted">
                      Nível {row.level}
                      {type !== 'STREAK' && (
                        <>
                          {' '}
                          · <Flame size={14} aria-hidden="true" /> {row.streak}{' '}
                          dias de melhor streak
                        </>
                      )}
                    </span>
                  </span>
                  <span className="rank-value">
                    <strong>{number(value(row))}</strong>
                    <span className="small muted">{unit}</span>
                  </span>
                </Link>
              ))}
            </div>
            {query.data.total > size && (
              <div className="toolbar ranking-pagination">
                <Button
                  variant="secondary"
                  disabled={page === 0}
                  onClick={() => setPage(page - 1)}
                >
                  Anterior
                </Button>
                <span aria-live="polite">
                  Página {page + 1} de {Math.ceil(query.data.total / size)}
                </span>
                <Button
                  variant="secondary"
                  disabled={(page + 1) * size >= query.data.total}
                  onClick={() => setPage(page + 1)}
                >
                  Próxima
                </Button>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}
