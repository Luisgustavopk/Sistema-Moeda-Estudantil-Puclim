import type { Badge } from './types'

export const rarities: Record<string, { label: string; finish: string }> = {
  FACIL: { label: 'Fácil', finish: 'bronze' },
  COMUM: { label: 'Comum', finish: 'bronze' },
  RARA: { label: 'Rara', finish: 'silver' },
  EPICA: { label: 'Épica', finish: 'gold' },
  LENDARIA: { label: 'Lendária', finish: 'legendary' },
}
export const badgeRatio = (badge: Badge) =>
  badge.target > 0 ? Math.min(1, Math.max(0, badge.progress / badge.target)) : 0
export const badgeState = (badge: Badge) =>
  badge.unlockedAt
    ? 'Desbloqueada'
    : badge.progress > 0
      ? 'Em progresso'
      : 'Bloqueada'
