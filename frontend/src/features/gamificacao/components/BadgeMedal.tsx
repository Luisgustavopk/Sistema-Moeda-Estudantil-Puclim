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

import {
  rarityPresentation,
  normalizeRarity,
  badgeState,
} from '../badge-presentation'
const icons: Record<string, typeof Award> = {
  Coins,
  Flame,
  Heart,
  Ticket,
  Trophy,
}
export function BadgeMedal({ badge }: { badge: Badge }) {
  const Icon = icons[badge.icon] || Award
  const rarity = normalizeRarity(badge.rarity)
  return (
    <span
      aria-hidden="true"
      data-rarity={rarity.toLowerCase()}
      data-unlocked={!!badge.unlockedAt}
      className={`merit-medal finish-${rarityPresentation(badge.rarity).finish} shape-${badge.icon.toLowerCase()} ${badgeState(badge) === 'Bloqueada' ? 'is-locked' : ''}`}
    >
      <Icon size={34} strokeWidth={1.8} />
      {['RARA', 'EPICA', 'LENDARIA'].includes(rarity) && (
        <span className="medal-ornaments">
          <svg
            viewBox="0 0 100 100"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            {rarity === 'RARA' ? (
              <path d="M25 8h50l17 25v34L75 92H25L8 67V33Z" />
            ) : (
              <>
                <path d="M17 25C3 49 14 78 35 87M83 25c14 24 3 53-18 62M16 38l-7-3m8 15-9 1m13 11-8 4m16 7-7 6M84 38l7-3m-8 15 9 1M79 62l8 4m-16 7 7 6" />
                {rarity === 'LENDARIA' && (
                  <path d="m41 12 9-7 9 7-9 7Z M32 94h36" />
                )}
              </>
            )}
          </svg>
        </span>
      )}
      {badge.unlockedAt && ['EPICA', 'LENDARIA'].includes(rarity) && (
        <span className="medal-reflection" />
      )}
      {!badge.unlockedAt && <LockKeyhole className="medal-lock" size={16} />}
    </span>
  )
}
