import {
  Award,
  Coins,
  Flame,
  Heart,
  LockKeyhole,
  Ticket,
  Trophy,
} from 'lucide-react'
import type { Badge } from '../types'

import { rarities, badgeState } from '../badge-presentation'
const icons: Record<string, typeof Award> = {
  Coins,
  Flame,
  Heart,
  Ticket,
  Trophy,
}
export function BadgeMedal({ badge }: { badge: Badge }) {
  const Icon = icons[badge.icon] || Award
  return (
    <span
      aria-hidden="true"
      className={`merit-medal finish-${rarities[badge.rarity]?.finish || 'bronze'} shape-${badge.icon.toLowerCase()} ${badgeState(badge) === 'Bloqueada' ? 'is-locked' : ''}`}
    >
      <Icon size={34} strokeWidth={1.8} />
      {!badge.unlockedAt && <LockKeyhole className="medal-lock" size={16} />}
    </span>
  )
}
