import { useEffect, useRef, useState } from 'react'
import { Modal } from '@/shared/components/ui/Modal'
import { Panel, ProgressRing } from '@/shared/components/ui/ActivitySurface'
import { badgePresentation } from '../badge-presentation'
import { Sparkles, Trophy, Flame, Pause, Play } from 'lucide-react'
import { dateTime, number } from '@/shared/utils/format'
import type { ProfileCustomization } from '../profile-customization'
import type { Profile, Badge } from '../types'
import { BadgeMedal } from './BadgeMedal'
import { ProfileIdentity } from './ProfileIdentity'
import { ProfileTitle } from './ProfileTitle'
import { ProfileFrame, ProfileCover } from './ProfileDecorations'
import { isAnimatedAvatar } from '../avatar-media'
export { ProfileIdentity } from './ProfileIdentity'

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
  const [motionPaused, setMotionPaused] = useState(false)
  const animatedAvatar = isAnimatedAvatar(settings.avatar)
  const animatedBanner =
    !!settings.visuals?.banner?.bannerMotion &&
    settings.visuals.banner.bannerMotion !== 'NONE'
  const animatedFrame =
    !!settings.visuals?.frame?.motion &&
    settings.visuals.frame.motion !== 'NONE'
  const multipleMotion = animatedAvatar || (animatedBanner && animatedFrame)
  const [reducedMotion, setReducedMotion] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReducedMotion(media.matches)
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])
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
  const activity =
    profile.activity !== undefined
      ? (profile.activity || []).map((item) => ({
          ...item,
          badge: unlocked.find((b) => b.id === item.badgeId) || null,
        }))
      : [
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
        <ProfileCover
          banner={settings.banner}
          visual={settings.visuals?.banner}
          animate={!motionPaused && !reducedMotion}
        />
        <ProfileFrame
          frame={settings.frame}
          visual={settings.visuals?.frame}
          className="public-avatar"
          animate={!motionPaused && !reducedMotion}
        >
          <ProfileIdentity
            name={settings.displayName}
            avatar={settings.avatar}
            visual={settings.visuals?.avatar}
            animate={!motionPaused && !reducedMotion}
          />
        </ProfileFrame>
        <div className="public-identity">
          <p className="public-display-name">{settings.displayName}</p>
          <ProfileTitle name={settings.titleName} />
          {settings.showRealName &&
            settings.displayName !== (profile.realName ?? profile.name) && (
              <p>{profile.realName ?? profile.name}</p>
            )}
          <p>
            {profile.course} · {profile.institution}
          </p>
          {settings.bio && <p className="profile-bio">{settings.bio}</p>}
          {(animatedAvatar || animatedBanner || animatedFrame) &&
            (reducedMotion ? (
              <p className="small muted">
                Efeito estático: movimento reduzido ativado.
              </p>
            ) : (
              <button
                type="button"
                className="profile-motion-toggle"
                aria-pressed={motionPaused}
                onClick={() => setMotionPaused((paused) => !paused)}
              >
                {motionPaused ? (
                  <Play size={14} aria-hidden="true" />
                ) : (
                  <Pause size={14} aria-hidden="true" />
                )}
                {multipleMotion
                  ? motionPaused
                    ? 'Ativar animações do perfil'
                    : 'Pausar animações do perfil'
                  : animatedBanner
                    ? motionPaused
                      ? 'Ativar animação do fundo'
                      : 'Pausar animação do fundo'
                    : motionPaused
                      ? 'Ativar efeito da moldura'
                      : 'Pausar efeito da moldura'}
              </button>
            ))}
        </div>
        <div className="profile-level-display">
          <div className="profile-level-ring">
            <ProgressRing
              value={profile.progressPercent}
              label={
                (profile.maximumLevel ?? profile.nextLevelAt === null)
                  ? `Nível ${profile.level}. Maior nível disponível alcançado.`
                  : `Nível ${profile.level}. ${profile.progressPercent}% de progresso para o próximo nível.`
              }
            >
              <span>Nível</span>
              <strong>{profile.level}</strong>
            </ProgressRing>
          </div>
          <span className="small muted">
            {(profile.maximumLevel ?? profile.nextLevelAt === null)
              ? 'Nível máximo'
              : profile.statsHidden
                ? `${profile.progressPercent}% para o próximo nível`
                : `${number(Math.max(0, (profile.nextLevelAt ?? 0) - profile.totalReceived))} moedas para evoluir`}
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
                    {badgePresentation(highlight).label} ·{' '}
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
                      {badgePresentation(b).label}
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
            <span className="badge">{badgePresentation(selected).label}</span>
            <p>{selected.description}</p>
            <p>Conquistada em {dateTime(selected.unlockedAt!)}</p>
          </div>
        </Modal>
      )}
    </div>
  )
}
