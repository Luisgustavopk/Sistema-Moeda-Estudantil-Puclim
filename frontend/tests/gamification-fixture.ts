import type { Page } from '@playwright/test'
import type { Profile, Quiz, Rank } from '../src/features/gamificacao/types'
import type { ProfileCustomization } from '../src/features/gamificacao/profile-customization'

// Respostas controladas apenas para testes; nunca importadas pela aplicação.
export const student = {
  id: 'student',
  role: 'ALUNO',
  name: 'Mariana Costa',
  email: 'mariana@example.test',
  login: 'mariana',
  balance: 180,
  active: true,
  course: 'Engenharia de Software',
  institutionId: 'institution',
}
export const profile: Profile = {
  id: 'student',
  name: student.name,
  course: student.course,
  institution: 'PUC Minas',
  level: 3,
  totalReceived: 430,
  nextLevelAt: 700,
  levelStart: 300,
  progressPercent: 32.5,
  streak: 4,
  bestStreak: 9,
  coinPosition: 24,
  streakPosition: 12,
  badges: [
    {
      id: 'FIRST_COIN',
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
      id: 'FIRST_REDEMPTION',
      name: 'Primeiro resgate',
      description: 'Resgate uma vantagem.',
      criterion: 'REDEMPTIONS',
      rarity: 'COMUM',
      icon: 'Ticket',
      target: 1,
      progress: 1,
      unlockedAt: '2026-10-11T12:00:00Z',
    },
    {
      id: 'FIRST_DONATION',
      name: 'Primeira doação',
      description: 'Doe uma vantagem.',
      criterion: 'DONATIONS',
      rarity: 'RARA',
      icon: 'Heart',
      target: 1,
      progress: 0,
      unlockedAt: null,
    },
    {
      id: 'STREAK_7',
      name: 'Uma semana de constância',
      description: 'Conclua sete quizzes consecutivos.',
      criterion: 'STREAK',
      rarity: 'EPICA',
      icon: 'Flame',
      target: 7,
      progress: 4,
      unlockedAt: null,
    },
    {
      id: 'TOP_3',
      name: 'Destaque do semestre',
      description: 'Termine entre os três primeiros da instituição.',
      criterion: 'TOP3',
      rarity: 'LENDARIA',
      icon: 'Trophy',
      target: 1,
      progress: 0,
      unlockedAt: null,
    },
  ],
  history: [
    { level: 2, total: 100, date: '2026-10-10T12:00:00Z' },
    { level: 3, total: 300, date: '2026-10-12T12:00:00Z' },
  ],
}
export const quiz: Quiz = {
  id: 'quiz',
  day: '2026-10-20',
  completedAt: null,
  correctCount: 0,
  errors: 0,
  grade: 0,
  streak: 4,
  items: Array.from({ length: 5 }, (_, i) => ({
    id: `q${i}`,
    prompt: [
      'Qual prática ajuda a manter o código legível?',
      'Como proteger dados pessoais?',
      'O que representa uma Pucoin?',
      'Por que revisar uma entrega?',
      'Como colaborar em uma equipe?',
    ][i],
    area: 'Engenharia de Software',
    options: [
      'Revisar e compartilhar conhecimento',
      'Ignorar o contexto',
      'Evitar testes',
      'Trabalhar sem comunicação',
    ],
    correctIndex: null,
    selectedIndex: null,
  })),
}
export const ranks: Rank[] = Array.from({ length: 30 }, (_, i) => ({
  position: i + 1,
  studentId: i === 23 ? student.id : `student-${i}`,
  name:
    i === 23
      ? student.name
      : ['Ana Ribeiro', 'Lucas Santos', 'Beatriz Lima'][i % 3] +
        (i > 2 ? ` ${i + 1}` : ''),
  course: 'Engenharia de Software',
  institution: 'PUC Minas',
  received: 1000 - i * 20,
  streak: 30 - i,
  level: 4,
  firstCoin: '2026-10-10T12:00:00Z',
}))

export async function mockGame(page: Page, role = 'ALUNO') {
  let appearance: ProfileCustomization = {
    displayName: student.name,
    bio: '',
    showRealName: false,
    avatar: 'portrait',
    frame: 'classic',
    banner: 'petroleum',
    featuredBadgeIds: profile.badges
      .filter((b) => b.unlockedAt)
      .map((b) => b.id),
    favoriteBadgeId: null,
    visibility: 'all',
    showStats: true,
    showActivity: true,
  }
  let started = false
  let completed: Quiz | null = null
  await page.route(
    (url) => url.pathname.startsWith('/api/'),
    async (route) => {
      const url = new URL(route.request().url())
      const path = url.pathname
      let data: unknown = []
      if (path === '/api/auth/session' || path === '/api/auth/login')
        data = { ...student, role }
      else if (path === '/api/instituicoes')
        data = [{ id: 'institution', name: 'PUC Minas' }]
      else if (path === '/api/gamificacao/perfil/personalizacao') {
        if (route.request().method() === 'PUT')
          appearance = route.request().postDataJSON()
        data = appearance
      } else if (path === '/api/gamificacao/perfil') data = profile
      else if (path.startsWith('/api/gamificacao/perfis/'))
        data = publicProfileFixture(profile, appearance)
      else if (path === '/api/gamificacao/contexto')
        data = {
          today: '2026-10-20',
          semester: '2026-2',
          maxAllocation: 1000000,
        }
      else if (path === '/api/gamificacao/ranking') {
        const index = Number(url.searchParams.get('page') || 0)
        data = {
          content: ranks.slice(index * 20, (index + 1) * 20),
          page: index,
          size: 20,
          total: 30,
          own: role === 'ALUNO' ? ranks[23] : null,
          semester: url.searchParams.get('semester') || '2026-2',
          type: url.searchParams.get('type') || 'MOEDAS',
        }
      } else if (path === '/api/gamificacao/quizzes')
        data = {
          streak: 4,
          bestStreak: 9,
          daysToReward: 3,
          nextAvailable: '2026-10-21T03:00:00Z',
          today: completed || (started ? quiz : null),
          history: [],
        }
      else if (path === '/api/gamificacao/quizzes/hoje') {
        started = true
        data = quiz
      } else if (path === '/api/gamificacao/quizzes/quiz/respostas') {
        const { answers } = route.request().postDataJSON()
        completed = {
          ...quiz,
          completedAt: '2026-10-20T12:00:00Z',
          correctCount: answers.filter((a: number) => a === 0).length,
          errors: answers.filter((a: number) => a !== 0).length,
          grade: answers.filter((a: number) => a === 0).length * 2,
          streak: 5,
          items: quiz.items.map((q, i) => ({
            ...q,
            correctIndex: 0,
            selectedIndex: answers[i],
          })),
        }
        data = completed
      }
      return route.fulfill({ json: data })
    },
  )
}
export function publicProfileFixture(
  p: Profile = profile,
  appearance?: ProfileCustomization,
) {
  const settings = appearance || {
    displayName: p.name,
    bio: '',
    showRealName: false,
    avatar: 'portrait',
    frame: 'classic',
    banner: 'petroleum',
    featuredBadgeIds: p.badges.filter((b) => b.unlockedAt).map((b) => b.id),
    favoriteBadgeId: null,
    visibility: 'all',
    showStats: true,
    showActivity: true,
  }
  return {
    id: p.id,
    name: settings.displayName,
    realName: settings.showRealName ? p.name : null,
    course: p.course,
    institution: p.institution,
    level: p.level,
    progressPercent: p.progressPercent,
    maximumLevel: p.nextLevelAt === null,
    appearance: settings,
    badges: p.badges,
    stats: settings.showStats
      ? {
          totalReceived: p.totalReceived,
          nextLevelAt: p.nextLevelAt,
          levelStart: p.levelStart,
          streak: p.streak,
          bestStreak: p.bestStreak,
          coinPosition: p.coinPosition,
          streakPosition: p.streakPosition,
        }
      : null,
    activity: settings.showActivity
      ? [
          ...p.history.map((h) => ({
            id: `level-${h.level}`,
            date: h.date,
            title: `Alcançou o nível ${h.level}`,
            level: h.level,
            badgeId: null,
          })),
          ...p.badges
            .filter((b) => b.unlockedAt)
            .map((b) => ({
              id: `badge-${b.id}`,
              date: b.unlockedAt!,
              title: b.name,
              level: null,
              badgeId: b.id,
            })),
        ]
          .sort((a, b) => b.date.localeCompare(a.date))
          .slice(0, 4)
      : null,
  }
}
