import { useRef, useState } from 'react'
import { Modal } from '@/shared/components/ui/Modal'
import { Panel, ProgressRing } from '@/shared/components/ui/ActivitySurface'
import { rarities } from '../badge-presentation'
import { GraduationCap, Sparkles, Trophy, Flame } from 'lucide-react'
import { Avatar } from '@/shared/components/ui/Avatar'
import { dateTime, number } from '@/shared/utils/format'
import type { ProfileCustomization } from '../profile-customization'
import type { Profile, Badge } from '../types'
import { BadgeMedal } from './BadgeMedal'

export function ProfileIdentity({
  name,
  avatar,
}: {
  name: string
  avatar: string
}) {
  return avatar.startsWith('data:image/') ? (
    <img
      className="avatar avatar-large"
      src={avatar}
      alt={`Avatar de ${name}`}
    />
  ) : avatar === 'initials' ? (
    <span className="profile-initials" aria-hidden="true">
      {name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((n) => n[0])
        .join('')}
    </span>
  ) : avatar === 'graduate' ? (
    <span className="profile-initials">
      <GraduationCap size={42} aria-label="Avatar de formatura" />
    </span>
  ) : (
    <Avatar name={name} large />
  )
}
export function ProfileShowcase({
  profile,
  settings,
  preview = false,
}: {
  profile: Profile
  settings: ProfileCustomization
  preview?: boolean
}) {
  const [selected, setSelected] = useState<Badge | null>(null)
  const [collectionOpen, setCollectionOpen] = useState(false)
  const [returnToCollection, setReturnToCollection] = useState(false)
  const collectionTrigger = useRef<HTMLButtonElement>(null)
  const unlocked = profile.badges.filter((b) => b.unlockedAt)
  const featured = settings.featuredBadgeIds
    .map((id) => unlocked.find((b) => b.id === id))
    .filter((b) => !!b)
  const favorite = unlocked.find((b) => b.id === settings.favoriteBadgeId)
  const highlight =
    favorite ||
    [...unlocked].sort((a, b) => b.unlockedAt!.localeCompare(a.unlockedAt!))[0]
  const additionalBadges = featured.filter((b) => b.id !== highlight?.id)
  const activity = [
    ...unlocked.map((b) => ({
      id: `badge-${b.id}`,
      date: b.unlockedAt!,
      title: b.name,
      badge: b,
      level: null,
    })),
    ...profile.history.map((h) => ({
      id: `level-${h.level}`,
      date: h.date,
      title: `Alcançou o nível ${h.level}`,
      badge: null,
      level: h.level,
    })),
  ]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 4)
  return (
    <div
      className={`profile-showcase banner-${settings.banner} ${preview ? 'is-preview' : ''}`}
    >
      <section className="card public-profile-hero">
        <div className={`public-avatar frame-${settings.frame}`}>
          <ProfileIdentity
            name={settings.displayName}
            avatar={settings.avatar}
          />
        </div>
        <div className="public-identity">
          <p className="public-display-name">{settings.displayName}</p>
          {settings.showRealName && settings.displayName !== profile.name && (
            <p>{profile.name}</p>
          )}
          <p>
            {profile.course} · {profile.institution}
          </p>
          {settings.bio && <p className="profile-bio">{settings.bio}</p>}
        </div>
        <div className="profile-level-display">
          <div className="profile-level-ring">
            <ProgressRing
              value={profile.progressPercent}
              label={
                profile.nextLevelAt === null
                  ? `Nível ${profile.level}. Maior nível disponível alcançado.`
                  : `Nível ${profile.level}. ${profile.progressPercent}% de progresso para o próximo nível.`
              }
            >
              <span>Nível</span>
              <strong>{profile.level}</strong>
            </ProgressRing>
          </div>
          <span className="small muted">
            {profile.nextLevelAt === null
              ? 'Nível máximo'
              : `${number(Math.max(0, profile.nextLevelAt - profile.totalReceived))} moedas para evoluir`}
          </span>
        </div>
      </section>
      <div className="public-profile-columns">
        <div className="public-profile-main">
          <Panel className="profile-trophy-room">
            <div className="section-heading">
              <div>
                <h2>Vitrine de conquistas</h2>
                <p className="small muted">
                  Marcos que merecem ficar em destaque.
                </p>
              </div>
              <Sparkles size={24} aria-hidden="true" />
            </div>
            {highlight ? (
              <button
                type="button"
                className="profile-highlight"
                onClick={() => setSelected(highlight)}
              >
                <BadgeMedal badge={highlight} />
                <span>
                  <h3 className="highlight-caption">
                    {favorite ? 'Conquista favorita' : 'Destaque da coleção'}
                  </h3>
                  <strong>{highlight.name}</strong>
                  <span>{highlight.description}</span>
                  <span className="small muted">
                    {rarities[highlight.rarity]?.label || highlight.rarity} ·{' '}
                    {dateTime(highlight.unlockedAt!)}
                  </span>
                </span>
              </button>
            ) : (
              <p className="activity-empty">
                A primeira conquista vai abrir sua vitrine.
              </p>
            )}
            {additionalBadges.length > 0 && (
              <div className="featured-badges">
                {additionalBadges.map((b) => (
                  <button
                    type="button"
                    className="profile-badge-slot"
                    key={b.id}
                    onClick={() => setSelected(b)}
                  >
                    <BadgeMedal badge={b} />
                    <strong>{b.name}</strong>
                    <span className="small muted">
                      {rarities[b.rarity]?.label || b.rarity}
                    </span>
                  </button>
                ))}
              </div>
            )}
            <button
              type="button"
              ref={collectionTrigger}
              className="button button-ghost profile-collection-link"
              onClick={() => setCollectionOpen(true)}
            >
              Explorar coleção · {unlocked.length} conquistas
            </button>
          </Panel>
          {!preview && settings.showActivity && (
            <Panel className="profile-activity">
              <div className="section-heading">
                <h2>Atividade recente</h2>
                <span className="small muted">Últimos marcos</span>
              </div>
              {!activity.length && (
                <p className="activity-empty">Novos marcos aparecerão aqui.</p>
              )}
              <ol className="profile-mini-feed">
                {activity.map((item) => (
                  <li key={item.id}>
                    {item.badge ? (
                      <BadgeMedal badge={item.badge} />
                    ) : (
                      <span className="feed-level" aria-hidden="true">
                        {item.level}
                      </span>
                    )}
                    <div>
                      <span className="small muted">
                        {item.badge ? 'Conquista desbloqueada' : 'Novo nível'}
                      </span>
                      <strong>{item.title}</strong>
                      <time dateTime={item.date}>{dateTime(item.date)}</time>
                    </div>
                  </li>
                ))}
              </ol>
            </Panel>
          )}
        </div>
        {!preview && settings.showStats && (
          <aside className="public-profile-rail">
            <Panel className="profile-records">
              <h2>Em números</h2>
              <dl className="profile-stat-cards">
                <div>
                  <dt>
                    <Trophy size={18} aria-hidden="true" />
                    Conquistas
                  </dt>
                  <dd>
                    {unlocked.length}
                    <span> de {profile.badges.length}</span>
                  </dd>
                </div>
                <div>
                  <dt>
                    <Flame size={18} aria-hidden="true" />
                    Recorde de constância
                  </dt>
                  <dd>
                    {profile.bestStreak}
                    <span> dias</span>
                  </dd>
                  <p className="small muted">
                    Sequência atual: {profile.streak} dias
                  </p>
                </div>
                <div>
                  <dt>Moedas recebidas</dt>
                  <dd>{number(profile.totalReceived)}</dd>
                  <p className="small muted">Ao longo da trajetória</p>
                </div>
              </dl>
            </Panel>
            <Panel className="profile-rankings">
              <h2>No semestre</h2>
              <dl className="merit-stats">
                <dt>Ranking de moedas</dt>
                <dd>
                  {profile.coinPosition ? `${profile.coinPosition}º` : '—'}
                </dd>
                <dt>Ranking de streak</dt>
                <dd>
                  {profile.streakPosition ? `${profile.streakPosition}º` : '—'}
                </dd>
              </dl>
            </Panel>
          </aside>
        )}
      </div>
      {collectionOpen && (
        <Modal
          title="Coleção de conquistas"
          onClose={() => {
            setCollectionOpen(false)
            requestAnimationFrame(() => collectionTrigger.current?.focus())
          }}
        >
          <div className="profile-collection-grid">
            {unlocked.map((b) => (
              <button
                type="button"
                className="profile-badge-slot"
                key={b.id}
                onClick={() => {
                  setCollectionOpen(false)
                  setReturnToCollection(true)
                  setSelected(b)
                }}
              >
                <BadgeMedal badge={b} />
                <strong>{b.name}</strong>
              </button>
            ))}
          </div>
          {!unlocked.length && <p>Nenhuma conquista desbloqueada ainda.</p>}
        </Modal>
      )}
      {selected && (
        <Modal
          title={selected.name}
          onClose={() => {
            setSelected(null)
            if (returnToCollection) {
              setCollectionOpen(true)
              setReturnToCollection(false)
            }
          }}
        >
          <div className="badge-detail">
            <BadgeMedal badge={selected} />
            <span className="badge">
              {rarities[selected.rarity]?.label || selected.rarity}
            </span>
            <p>{selected.description}</p>
            <p>Conquistada em {dateTime(selected.unlockedAt!)}</p>
          </div>
        </Modal>
      )}
    </div>
  )
}
