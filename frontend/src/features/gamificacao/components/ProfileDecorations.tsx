import { Check, LockKeyhole } from 'lucide-react'
import type { CSSProperties, ReactNode } from 'react'
import type { ProfileReward, RewardVisual } from '../profile-rewards'
import { ProfileIdentity } from './ProfileIdentity'
import { rewardIcons } from './reward-icons'
import { useProfileMotion } from '../use-profile-motion'
import { ProfileCoverEffects } from './ProfileCoverEffects'
import { ProfileFrameEffects } from './ProfileFrameEffects'
export function ProfileFrame({
  frame,
  children,
  className = '',
  visual,
  animate = true,
}: {
  frame: string
  children: ReactNode
  className?: string
  visual?: RewardVisual | null
  animate?: boolean
}) {
  const motion = visual?.motion || 'NONE'
  const { element, playing } = useProfileMotion(animate && motion !== 'NONE')
  const Icon = visual?.icon
    ? rewardIcons[visual.icon] || rewardIcons.Award
    : null
  return (
    <span
      className={`profile-framed-avatar ${className}`}
      ref={element}
      data-frame={frame}
      data-palette={visual?.palette}
      data-variant={visual?.variant}
      data-artwork={!!visual?.assetUrl}
      data-shape={visual?.avatarShape || 'ROUNDED'}
      data-motion={motion}
      data-motion-playing={playing}
      style={
        {
          '--frame-cycle': `${Math.min(20000, Math.max(1200, visual?.cycleMs ?? 4000))}ms`,
          ...(visual?.assetUrl
            ? {
                padding: `${Math.min(35, Math.max(0, visual.avatarInset ?? 12))}%`,
              }
            : {}),
        } as CSSProperties
      }
    >
      {children}
      {visual?.assetUrl && (
        <img
          className="frame-artwork"
          src={visual.assetUrl}
          alt=""
          aria-hidden="true"
        />
      )}
      <ProfileFrameEffects motion={motion} />
      {!visual?.assetUrl &&
        Icon &&
        !['CROWN', 'LIGHTNING', 'BLACK_HOLE'].includes(motion) && (
          <span className="frame-emblem" aria-hidden="true">
            <Icon size={16} strokeWidth={2} />
          </span>
        )}
    </span>
  )
}

export function ProfileCover({
  banner,
  visual,
  animate = true,
}: {
  banner: string
  visual?: RewardVisual | null
  animate?: boolean
}) {
  const motion = visual?.bannerMotion || 'NONE'
  const { element, playing } = useProfileMotion(animate && motion !== 'NONE')
  const Icon = visual?.icon
    ? rewardIcons[visual.icon] || rewardIcons.Award
    : null
  return (
    <span
      className="profile-cover"
      ref={element}
      data-banner={banner}
      data-banner-motion={motion}
      data-motion-playing={playing}
      style={
        {
          '--cover-cycle': `${Math.min(20000, Math.max(8000, visual?.cycleMs ?? 14000))}ms`,
        } as CSSProperties
      }
      data-palette={
        visual?.palette ||
        (banner === 'cream'
          ? 'CREAM'
          : banner === 'gold'
            ? 'GOLD'
            : 'PETROLEUM')
      }
      aria-hidden="true"
    >
      {visual?.assetUrl && (
        <img className="cover-artwork" src={visual.assetUrl} alt="" />
      )}
      {motion !== 'NONE' && <ProfileCoverEffects motion={motion} />}
      {motion === 'NONE' && !visual?.assetUrl && Icon && (
        <>
          <Icon />
          <Icon />
          <Icon />
        </>
      )}
    </span>
  )
}

export function RewardOptions({
  kind,
  rewards,
  value,
  name,
  avatar,
  avatarVisual,
  onSelect,
}: {
  kind: Exclude<ProfileReward['kind'], 'TITLE'>
  rewards: ProfileReward[]
  value: string
  name: string
  avatar: string
  avatarVisual?: RewardVisual | null
  onSelect: (id: string) => void
}) {
  const label = { AVATAR: 'Avatar', FRAME: 'Moldura', BANNER: 'Fundo' }[kind]
  return (
    <div
      className="reward-options"
      role="group"
      aria-label={`${label}: opções e requisitos`}
    >
      {rewards
        .filter((r) => r.kind === kind)
        .map((reward) => {
          const selected = value === reward.id
          const hintId = `reward-${kind}-${reward.id}`
          return (
            <button
              type="button"
              key={reward.id}
              className="reward-option"
              aria-label={`${label}: ${reward.name}`}
              aria-pressed={selected}
              aria-disabled={!reward.unlocked}
              aria-describedby={hintId}
              onClick={() => {
                if (reward.unlocked) onSelect(reward.id)
              }}
            >
              <span
                className={`reward-art ${kind === 'BANNER' ? 'reward-cover-art' : ''}`}
                aria-hidden="true"
              >
                {kind === 'BANNER' ? (
                  <ProfileCover
                    banner={reward.id}
                    visual={reward.visual}
                    animate={false}
                  />
                ) : kind === 'FRAME' ? (
                  <ProfileFrame
                    frame={reward.id}
                    visual={reward.visual}
                    animate={false}
                  >
                    <ProfileIdentity
                      name={name}
                      avatar={avatar}
                      visual={avatarVisual}
                    />
                  </ProfileFrame>
                ) : (
                  <ProfileIdentity
                    name={name}
                    avatar={reward.id}
                    visual={reward.visual}
                  />
                )}
              </span>
              <span className="reward-copy">
                <strong>{reward.name}</strong>
                {reward.newlyUnlocked && (
                  <span className="reward-new">Novo</span>
                )}
                <span id={hintId}>{reward.requirement}</span>
                {reward.visual.motion && reward.visual.motion !== 'NONE' && (
                  <span className="reward-effect-label">
                    {
                      {
                        ORBIT: 'Órbita em movimento',
                        CROWN: 'Coroa dinâmica',
                        SHIMMER: 'Brilho em movimento',
                        LIGHTNING: 'Raios de plasma',
                        BLACK_HOLE: 'Disco de acreção em movimento',
                      }[reward.visual.motion]
                    }
                  </span>
                )}
                {reward.visual.bannerMotion &&
                  reward.visual.bannerMotion !== 'NONE' && (
                    <span className="reward-effect-label">
                      Fundo animado ·{' '}
                      {
                        {
                          AURORA: 'Aurora',
                          METEORS: 'Meteoros',
                          WAVES: 'Ondas',
                        }[reward.visual.bannerMotion]
                      }
                    </span>
                  )}
                <span className="reward-status">
                  {selected ? (
                    <Check size={14} aria-hidden="true" />
                  ) : !reward.unlocked ? (
                    <LockKeyhole size={14} aria-hidden="true" />
                  ) : (
                    <Check size={14} aria-hidden="true" />
                  )}
                  {selected
                    ? 'Selecionado'
                    : reward.unlocked
                      ? 'Disponível'
                      : 'Bloqueado'}
                </span>
              </span>
            </button>
          )
        })}
    </div>
  )
}
