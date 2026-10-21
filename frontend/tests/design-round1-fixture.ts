import type { Page } from '@playwright/test'
import { mockGame, student, quiz } from './gamification-fixture.ts'
import type {
  Mission,
  Notice,
  Payment,
  Quiz,
} from '../src/features/gamificacao/types'

export async function mockDesignReview(page: Page, role = 'ALUNO') {
  await mockGame(page, role)
  const statuses = [
    '',
    'EM_ANDAMENTO',
    'AGUARDANDO_APROVACAO',
    'DEVOLVIDA',
    'CONCLUIDA',
    '',
    '',
    '',
  ]
  const titles = [
    'Mapeie uma iniciativa sustentável',
    'Uma ideia para melhorar o campus',
    'Compartilhe sua pesquisa',
    'Mentoria entre colegas',
    'Contribua com a comunidade',
    'Explore a biblioteca digital',
    'Prototipe uma solução acessível',
    'Registre a memória do bairro',
  ]
  const missions: Mission[] = titles.map((title, i) => ({
    id: `mission-${i}`,
    title,
    teacherName: 'Helena Prado',
    description:
      'Investigue o tema e apresente sua proposta com referências. Explique as escolhas e compartilhe os aprendizados com a turma. A avaliação considera clareza, colaboração e aplicação prática.',
    reward: 40 + i * 20,
    capacity: 8,
    occupied: i === 6 ? 8 : i % 4,
    reserved: 320,
    deadline: '2099-11-05T20:00:00Z',
    status: i === 7 ? 'ENCERRADA' : 'DISPONIVEL',
    participants: statuses[i]
      ? [
          {
            id: `participation-${i}`,
            studentId: student.id,
            studentName: student.name,
            status: statuses[i],
            delivery:
              i > 1
                ? 'Relatório com referências e proposta de intervenção.'
                : null,
            feedback:
              i === 3 ? 'Inclua uma referência para cada decisão.' : null,
            acceptedAt: '2026-10-10T12:00:00Z',
            submittedAt: null,
            approvedAt: null,
            history:
              i > 1
                ? [
                    {
                      action: 'ENTREGA',
                      text: 'Primeira versão recebida.',
                      date: '2026-10-12T12:00:00Z',
                    },
                  ]
                : [],
          },
        ]
      : [],
  }))
  const notices: Notice[] = [
    {
      id: 'notice-badge',
      type: 'BADGE',
      title: 'Uma semana de constância',
      message:
        'Seu esforço virou conquista. Você concluiu sete quizzes consecutivos.',
      date: '2026-10-20T15:00:00Z',
      readAt: null,
      referenceId: 'STREAK_7',
    },
    {
      id: 'notice-level',
      type: 'LEVEL',
      title: 'Um novo nível na sua trajetória',
      message: 'Você alcançou o nível 3. Continue compartilhando conhecimento.',
      date: '2026-10-19T15:00:00Z',
      readAt: null,
      referenceId: null,
    },
    {
      id: 'notice-mission',
      type: 'MISSION',
      title: 'Sua entrega foi aprovada',
      message:
        'Sua contribuição na missão foi reconhecida. ' +
        'O parecer destacou a clareza das ideias, as referências utilizadas e a colaboração com a turma. '.repeat(
          5,
        ),
      date: '2026-10-18T15:00:00Z',
      readAt: '2026-10-19T15:00:00Z',
      referenceId: 'mission-4',
    },
  ]
  const payments: Payment[] = [
    {
      id: 'reward-1',
      studentName: student.name,
      semester: '2026-2',
      kind: 'RECOMPENSA',
      amount: 20,
      status: 'PAGO',
      sourceKey: 'weekly:1',
      originOperationId: null,
      date: '2026-10-20T12:00:00Z',
      paidAt: '2026-10-20T12:00:00Z',
    },
    {
      id: 'reward-2',
      studentName: student.name,
      semester: '2026-2',
      kind: 'BONUS',
      amount: 15,
      status: 'PENDENTE',
      sourceKey: 'bonus:2',
      originOperationId: null,
      date: '2026-10-19T12:00:00Z',
      paidAt: null,
    },
    {
      id: 'reward-3',
      studentName: student.name,
      semester: '2026-1',
      kind: 'PREMIO',
      amount: 100,
      status: 'PAGO',
      sourceKey: 'prize:3',
      originOperationId: null,
      date: '2026-06-30T12:00:00Z',
      paidAt: '2026-07-01T12:00:00Z',
    },
  ]
  const history: Quiz[] = Array.from({ length: 12 }, (_, i) => ({
    ...quiz,
    id: `past-${i}`,
    day:
      i < 6
        ? `2026-10-${String(19 - i).padStart(2, '0')}`
        : `2026-09-${String(30 - i + 6).padStart(2, '0')}`,
    completedAt: '2026-10-19T12:00:00Z',
    correctCount: 3 + (i % 3),
    errors: 2 - (i % 3),
    grade: 6 + (i % 3) * 2,
    streak: 1 + i,
    items: quiz.items.map((q, n) => ({
      ...q,
      id: `past-item-${i}-${n}`,
      correctIndex: 0,
      selectedIndex: n < 3 + (i % 3) ? 0 : 1,
    })),
  }))
  await page.route(
    (url) =>
      [
        '/api/gamificacao/missoes',
        '/api/gamificacao/participacoes',
        '/api/gamificacao/notificacoes',
        '/api/gamificacao/recompensas',
        '/api/conta/notificacoes',
      ].some((prefix) => url.pathname.startsWith(prefix)),
    async (route) => {
      const path = new URL(route.request().url()).pathname
      if (path.startsWith('/api/gamificacao/participacoes/')) {
        const p = missions
          .flatMap((m) => m.participants)
          .find((p) => path.includes(p.id))!
        const action = path.split('/').at(-1)
        p.status =
          action === 'entregar'
            ? 'AGUARDANDO_APROVACAO'
            : action === 'aprovar'
              ? 'CONCLUIDA'
              : 'DEVOLVIDA'
        const text = route.request().postDataJSON().text
        if (action === 'entregar') p.delivery = text
        else p.feedback = text
        return route.fulfill({
          json: missions.find((m) => m.participants.includes(p)),
        })
      }
      if (path.startsWith('/api/gamificacao/missoes/')) {
        const m = missions.find((m) => path.includes(m.id))!
        if (path.endsWith('/aceitar')) {
          m.occupied++
          m.participants.push({
            id: `new-${m.id}`,
            studentId: student.id,
            studentName: student.name,
            status: 'EM_ANDAMENTO',
            delivery: null,
            feedback: null,
            acceptedAt: '2026-10-20T12:00:00Z',
            submittedAt: null,
            approvedAt: null,
            history: [],
          })
        } else if (path.endsWith('/encerrar')) m.status = 'ENCERRADA'
        else if (path.endsWith('/prazo'))
          m.deadline = route.request().postDataJSON().deadline
        return route.fulfill({ json: m })
      }
      if (path === '/api/gamificacao/missoes')
        return route.fulfill({ json: missions })
      if (path.endsWith('/ler')) {
        notices.find((n) => path.includes(n.id))!.readAt =
          '2026-10-20T16:00:00Z'
        return route.fulfill({ status: 204 })
      }
      if (path === '/api/gamificacao/notificacoes')
        return route.fulfill({ json: notices })
      if (path === '/api/gamificacao/recompensas')
        return route.fulfill({ json: payments })
      return route.fulfill({
        json: [
          {
            id: 'email-1',
            subject: 'Seu reconhecimento chegou',
            body: 'Helena Prado enviou 50 moedas pelo apoio na pesquisa.',
            date: '2026-10-20T12:00:00Z',
            recipient: student.email,
            deliveryStatus: 'ENVIADO',
          },
          {
            id: 'email-2',
            subject: 'Seu cupom está pronto',
            body: 'A vantagem está disponível em Meus cupons.',
            date: '2026-10-19T12:00:00Z',
            recipient: student.email,
            deliveryStatus: 'PENDENTE',
          },
        ],
      })
    },
  )
  await page.route(
    (url) => url.pathname === '/api/gamificacao/quizzes',
    (route) =>
      route.fulfill({
        json: {
          streak: 4,
          bestStreak: 9,
          daysToReward: 3,
          nextAvailable: '2026-10-21T03:00:00Z',
          today: null,
          history,
        },
      }),
  )
}
