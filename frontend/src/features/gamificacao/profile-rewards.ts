import type { Profile } from './types'

export interface RewardVisual {
  icon: string | null
  palette:
    | 'PETROLEUM'
    | 'CREAM'
    | 'GOLD'
    | 'BRONZE'
    | 'SILVER'
    | 'FOREST'
    | 'COSMOS'
    | 'COPPER'
    | 'TEAL'
  variant: 'PLAIN' | 'DOUBLE'
  assetUrl?: string | null
  avatarInset?: number
  avatarShape?: 'ROUNDED' | 'CIRCLE' | 'SQUARE'
  motion?: 'NONE' | 'ORBIT' | 'CROWN' | 'SHIMMER'
  cycleMs?: number
}
export interface ProfileVisuals {
  avatar: RewardVisual | null
  frame: RewardVisual | null
  banner: RewardVisual | null
}
export interface ProfileReward {
  id: string
  kind: 'AVATAR' | 'FRAME' | 'BANNER'
  name: string
  requirement: string
  requiredLevel: number | null
  badgeId: string | null
  unlocked: boolean
  visual: RewardVisual
}

// Offline demo keeps only the original basic options. Milestone eligibility and
// the complete extensible catalog are served by the API, never reimplemented here.
export function basicDemoRewards(
  profile: Pick<Profile, 'badges'>,
): ProfileReward[] {
  const base = (
    kind: ProfileReward['kind'],
    id: string,
    name: string,
    icon: string | null = null,
    palette: RewardVisual['palette'] = 'PETROLEUM',
  ): ProfileReward => ({
    kind,
    id,
    name,
    requirement: 'Disponível desde o início',
    requiredLevel: null,
    badgeId: null,
    unlocked: true,
    visual: { icon, palette, variant: 'PLAIN' },
  })
  return [
    base('AVATAR', 'initials', 'Iniciais', 'Initials'),
    base('AVATAR', 'graduate', 'Formatura', 'GraduationCap'),
    base('AVATAR', 'portrait', 'Ilustração', 'Portrait'),
    base('FRAME', 'classic', 'Clássica'),
    {
      ...base('FRAME', 'merit', 'Mérito', 'Award', 'GOLD'),
      requirement: 'Desbloqueie sua primeira conquista',
      unlocked: profile.badges.some((b) => b.unlockedAt !== null),
    },
    base('BANNER', 'petroleum', 'Petróleo'),
    base('BANNER', 'cream', 'Creme', null, 'CREAM'),
    base('BANNER', 'gold', 'Ouro', null, 'GOLD'),
  ]
}
