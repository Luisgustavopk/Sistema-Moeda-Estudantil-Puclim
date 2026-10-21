import type { Profile } from './types'
// Somente prévia explicitamente identificada no modo VITE_DATA_MODE=demo.
export function demoProfile(
  id: string,
  name: string,
  course: string,
  institution: string,
): Profile {
  return {
    id,
    name,
    course,
    institution,
    level: 2,
    totalReceived: 150,
    nextLevelAt: 300,
    levelStart: 100,
    progressPercent: 25,
    streak: 3,
    bestStreak: 7,
    coinPosition: null,
    streakPosition: null,
    history: [{ level: 2, total: 100, date: '2026-10-10T12:00:00Z' }],
    badges: [
      {
        id: 'demo-first-coin',
        name: 'Primeira moeda',
        description: 'Receba seu primeiro reconhecimento.',
        criterion: 'COINS',
        rarity: 'FACIL',
        icon: 'Coins',
        target: 1,
        progress: 1,
        unlockedAt: '2026-10-10T12:00:00Z',
      },
      {
        id: 'demo-streak',
        name: 'Uma semana de constância',
        description: 'Conclua sete quizzes consecutivos.',
        criterion: 'STREAK',
        rarity: 'EPICA',
        icon: 'Flame',
        target: 7,
        progress: 7,
        unlockedAt: '2026-10-12T12:00:00Z',
      },
    ],
  }
}
