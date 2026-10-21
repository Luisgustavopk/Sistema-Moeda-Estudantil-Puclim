import type { Badge } from './types'

export const rarities: Record<string, { label: string; finish: string }> = {
  FACIL: { label: 'Fácil', finish: 'steel' },
  COMUM: { label: 'Comum', finish: 'bronze' },
  RARA: { label: 'Rara', finish: 'teal' },
  EPICA: { label: 'Épica', finish: 'gold' },
  LENDARIA: { label: 'Lendária', finish: 'legendary' },
}
// Dados antigos e seeds podem usar rótulos com acentos e capitalização livre.
export const normalizeRarity = (rarity: string) =>
  rarity
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toUpperCase()
export const rarityPresentation = (rarity: string) =>
  rarities[normalizeRarity(rarity)] || { label: rarity, finish: 'steel' }
export const badgeRatio = (badge: Badge) =>
  badge.target > 0 ? Math.min(1, Math.max(0, badge.progress / badge.target)) : 0
export const badgeState = (badge: Badge) =>
  badge.unlockedAt
    ? 'Desbloqueada'
    : badge.progress > 0
      ? 'Em progresso'
      : 'Bloqueada'
