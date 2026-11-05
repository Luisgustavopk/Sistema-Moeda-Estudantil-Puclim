import { Avatar } from '@/shared/components/ui/Avatar'
import type { RewardVisual } from '../profile-rewards'
import { rewardIcons } from './reward-icons'

export function ProfileIdentity({
  name,
  avatar,
  visual,
}: {
  name: string
  avatar: string
  visual?: RewardVisual | null
}) {
  const personalUpload =
    avatar.startsWith('data:image/') ||
    avatar.startsWith('/api/gamificacao/perfil/avatar/')
  const source = personalUpload ? avatar : visual?.assetUrl
  if (source)
    return (
      <img
        className="avatar avatar-large"
        src={source}
        alt={`Avatar de ${name}`}
        width={120}
        height={120}
      />
    )
  const icon =
    visual?.icon ||
    (
      {
        initials: 'Initials',
        portrait: 'Portrait',
        graduate: 'GraduationCap',
      } as Record<string, string>
    )[avatar]
  if (icon === 'Initials')
    return (
      <span className="profile-initials" aria-hidden="true">
        {name
          .split(' ')
          .filter(Boolean)
          .slice(0, 2)
          .map((n) => n[0])
          .join('')}
      </span>
    )
  if (icon === 'Portrait' || !icon) return <Avatar name={name} large />
  const Icon = rewardIcons[icon] || rewardIcons.Award
  return (
    <span
      className="profile-initials themed-avatar"
      data-palette={visual?.palette || 'PETROLEUM'}
      data-avatar={avatar}
      role="img"
      aria-label={`Avatar de ${name}`}
    >
      <Icon size={42} strokeWidth={1.6} aria-hidden="true" />
    </span>
  )
}
