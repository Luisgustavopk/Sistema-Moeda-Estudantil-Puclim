import { Select } from '@/shared/components/ui/Select'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { Sparkles } from 'lucide-react'
import { useAuth } from '@/features/auth/hooks/auth-context'
import { PageHeading } from '@/shared/components/ui/PageHeading'
import { QueryState, EmptyState } from '@/shared/components/ui/Feedback'
import { Modal } from '@/shared/components/ui/Modal'
import { dateTime } from '@/shared/utils/format'
import { gameApi } from './api'
import {
  ProgressRing,
  StatusBadge,
} from '@/shared/components/ui/ActivitySurface'
import { BadgeMedal } from './components/BadgeMedal'
import {
  badgeRatio,
  badgeState,
  rarities,
  normalizeRarity,
  rarityPresentation,
} from './badge-presentation'
import type { Badge } from './types'

export function AchievementsPage() {
  const { user } = useAuth()
  const [state, setState] = useState('Todas')
  const [rarity, setRarity] = useState('Todas')
  const [sort, setSort] = useState('near')
  const [selected, setSelected] = useState<Badge | null>(null)
  const [celebration, setCelebration] = useState('')
  const previous = useRef<Set<string> | null>(null)
  const query = useQuery({
    queryKey: ['game', 'profile', user?.id],
    queryFn: () => gameApi.profile(),
    refetchInterval: 30000,
  })
  useEffect(() => {
    if (!query.data) return
    const unlocked = query.data.badges.filter((b) => b.unlockedAt)
    if (previous.current) {
      const added = unlocked.filter((b) => !previous.current!.has(b.id))
      if (added.length)
        setCelebration(
          `Nova conquista: ${added.map((b) => b.name).join(', ')}. Seu mérito ganhou mais um marco!`,
        )
    }
    previous.current = new Set(unlocked.map((b) => b.id))
  }, [query.data])
  useEffect(() => {
    if (!celebration) return
    const timer = window.setTimeout(() => setCelebration(''), 6000)
    return () => window.clearTimeout(timer)
  }, [celebration])
  const profile = query.data
  const badges = profile?.badges || []
  const unlocked = badges.filter((b) => b.unlockedAt).length
  const next = badges
    .filter((b) => !b.unlockedAt)
    .sort((a, b) => badgeRatio(b) - badgeRatio(a))[0]
  const filtered = badges
    .filter(
      (b) =>
        (state === 'Todas' || badgeState(b) === state) &&
        (rarity === 'Todas' || normalizeRarity(b.rarity) === rarity),
    )
    .sort((a, b) =>
      sort === 'name'
        ? a.name.localeCompare(b.name, 'pt-BR')
        : Number(!!a.unlockedAt) - Number(!!b.unlockedAt) ||
          badgeRatio(b) - badgeRatio(a),
    )
  return (
    <div className="merit-page">
      <PageHeading
        title="Minhas conquistas"
        description="Cada conquista conta um pedaço da sua trajetória."
        action={
          <Link className="button button-secondary" to={`/perfis/${user?.id}`}>
            Ver perfil público
          </Link>
        }
      />
      <QueryState
        loading={query.isLoading}
        error={query.error}
        retry={query.refetch}
      />
      <div aria-live="polite">
        {celebration && (
          <p className="notice merit-celebration">
            <Sparkles size={22} />
            {celebration}
          </p>
        )}
      </div>
      {profile && (
        <>
          <div className="collection-overview">
            <section className="card collection-summary">
              <ProgressRing
                value={badges.length ? (unlocked / badges.length) * 100 : 0}
                label={`${unlocked} de ${badges.length} conquistas desbloqueadas`}
              >
                <strong>
                  {unlocked}
                  <span>/{badges.length}</span>
                </strong>
              </ProgressRing>
              <div className="activity-stack">
                <h2>Sua coleção</h2>
                <p>
                  {unlocked} de {badges.length} conquistas desbloqueadas
                </p>
                {!next && (
                  <p className="muted">
                    {badges.length
                      ? 'Todos os marcos disponíveis foram alcançados.'
                      : 'Os marcos aparecerão quando o catálogo estiver disponível.'}
                  </p>
                )}
              </div>
            </section>
            {next && (
              <button
                className="card next-achievement"
                onClick={() => setSelected(next)}
              >
                <BadgeMedal badge={next} />
                <span>
                  <strong>Mais perto de conquistar</strong>
                  <span>
                    {next.name} · {next.progress} de {next.target}
                  </span>
                  <progress
                    aria-label={`Próxima conquista: ${next.name}`}
                    max={Math.max(1, next.target)}
                    value={next.progress}
                  />
                </span>
                <span aria-hidden="true">→</span>
              </button>
            )}
          </div>
          <section aria-labelledby="collection-title">
            <div className="section-heading">
              <h2 id="collection-title">Explore suas conquistas</h2>
              <span className="muted" aria-live="polite">
                {filtered.length} resultados
              </span>
            </div>
            <div
              className="merit-filters"
              role="group"
              aria-label="Estado da conquista"
            >
              {['Todas', 'Desbloqueada', 'Em progresso', 'Bloqueada'].map(
                (value) => (
                  <button
                    className="merit-chip"
                    aria-pressed={state === value}
                    key={value}
                    onClick={() => setState(value)}
                  >
                    {value}
                  </button>
                ),
              )}
            </div>
            <div className="merit-selects">
              <label>
                Raridade
                <Select
                  aria-label="Raridade"
                  value={rarity}
                  onValueChange={(value) => setRarity(value)}
                >
                  <option value="Todas">Todas</option>
                  {Object.entries(rarities).map(([key, value]) => (
                    <option key={key} value={key}>
                      {value.label}
                    </option>
                  ))}
                </Select>
              </label>
              <label>
                Ordenar por
                <Select
                  aria-label="Ordenar por"
                  value={sort}
                  onValueChange={(value) => setSort(value)}
                >
                  <option value="near">Mais próximas</option>
                  <option value="name">Nome</option>
                </Select>
              </label>
            </div>
            {!filtered.length && (
              <EmptyState
                title="Nenhuma conquista neste filtro"
                description="Experimente outro estado ou raridade para explorar a coleção."
              />
            )}
            <div className="achievement-grid">
              {filtered.map((badge) => (
                <button
                  key={badge.id}
                  className={`card achievement-card ${badge.unlockedAt ? 'is-unlocked' : ''}`}
                  onClick={() => setSelected(badge)}
                  aria-label={`Ver conquista: ${badge.name}`}
                >
                  <BadgeMedal badge={badge} />
                  <span className="small muted">
                    {rarityPresentation(badge.rarity).label}
                  </span>
                  <h3>{badge.name}</h3>
                  <StatusBadge
                    tone={
                      badge.unlockedAt
                        ? 'success'
                        : badge.progress
                          ? 'info'
                          : 'neutral'
                    }
                  >
                    {badge.unlockedAt ? 'Conquistada' : badgeState(badge)}
                  </StatusBadge>
                  {!badge.unlockedAt && badge.progress > 0 && (
                    <>
                      <progress
                        aria-label={`Progresso: ${badge.name}`}
                        max={Math.max(1, badge.target)}
                        value={badge.progress}
                      />
                      <span className="small muted">
                        {badge.progress} de {badge.target}
                      </span>
                    </>
                  )}
                </button>
              ))}
            </div>
          </section>
        </>
      )}
      {selected && (
        <Modal title={selected.name} onClose={() => setSelected(null)}>
          <div className="badge-detail">
            <BadgeMedal badge={selected} />
            <span className="badge">
              {rarityPresentation(selected.rarity).label} ·{' '}
              {badgeState(selected)}
            </span>
            <p>{selected.description}</p>
            <h3>Como conquistar</h3>
            <p>{criterionText(selected)}</p>
            <progress
              aria-label="Progresso da conquista"
              max={Math.max(1, selected.target)}
              value={selected.progress}
            />
            <p>
              {selected.progress} de {selected.target}
            </p>
            {selected.unlockedAt && (
              <p>Conquistada em {dateTime(selected.unlockedAt)}</p>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}
function criterionText(badge: Badge) {
  const labels: Record<string, string> = {
    COINS: 'Moedas recebidas',
    REDEMPTIONS: 'Vantagens resgatadas',
    DONATIONS: 'Vantagens doadas',
    STREAK: 'Dias consecutivos de quiz',
    TOP3: 'Presenças no top 3 do semestre',
  }
  return `${labels[badge.criterion] || badge.criterion}: ${badge.target}. ${badge.description}`
}
