import { historyJson } from './history-fixture'
import { test, expect, type Page } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'
import { mockDesignReview } from './design-round1-fixture'
import { student, quiz } from './gamification-fixture'

const phase = process.env.EVIDENCE_PHASE || 'after'
const out = '../docs/evidencias/revisao-visual-2026-11-04'
const offer = {
  id: 'coffee',
  companyId: 'company',
  companyName: 'Café do Campus',
  name: 'Café e pão de queijo',
  description: 'Uma pausa no campus para compartilhar boas ideias.',
  cost: 70,
  photo: '/images/coffee.jpg',
  active: true,
}
const coupon = {
  id: 'coupon',
  code: 'PUC-CAFE-2026',
  advantageName: offer.name,
  companyName: offer.companyName,
  status: 'VALIDO',
  date: '2026-10-20T12:00:00Z',
  studentName: student.name,
}
const transactions = [150, 100, -70].map((amount, i) => ({
  id: `transaction-${i}`,
  kind: amount > 0 ? 'RECEBIMENTO' : 'RESGATE',
  description: amount > 0 ? 'Reconhecimento pela colaboração' : offer.name,
  reason: 'Colaboração na revisão do projeto de acessibilidade',
  counterpart: amount > 0 ? 'Helena Prado' : offer.companyName,
  amount,
  date: `2026-10-${20 - i}T12:00:00Z`,
}))

async function setup(page: Page, persona: string) {
  const role =
    persona === 'FIRST'
      ? 'PROFESSOR'
      : ['ENSINO', 'BENEFICIARIA'].includes(persona)
        ? 'EMPRESA'
        : persona
  await mockDesignReview(page, role)
  await page.route(
    (url) => url.pathname.startsWith('/api/'),
    async (route) => {
      const path = new URL(route.request().url()).pathname
      let data: unknown
      if (path === '/api/auth/session') {
        if (persona === 'PUBLIC')
          return route.fulfill({
            status: 401,
            json: { message: 'Sessão não autenticada' },
          })
        data = {
          ...student,
          role,
          mustChangePassword: persona === 'FIRST',
          partnerKind: role === 'EMPRESA' ? persona : undefined,
          name:
            role === 'ALUNO'
              ? student.name
              : role === 'PROFESSOR'
                ? 'Helena Prado'
                : persona === 'ENSINO'
                  ? 'PUC Minas'
                  : persona === 'BENEFICIARIA'
                    ? 'Rede Solidária'
                    : offer.companyName,
          address: 'Rua do Campus, 123',
        }
      } else if (path === '/api/vantagens')
        data = [
          offer,
          {
            ...offer,
            id: 'books',
            name: 'Material para aprender',
            companyName: 'Livraria Horizonte',
            cost: 120,
            photo: '/images/books.jpg',
          },
        ]
      else if (path === '/api/cupons')
        data = [
          coupon,
          {
            ...coupon,
            id: 'used',
            code: 'PUC-LIVRO-2026',
            status: 'UTILIZADO',
            usedAt: '2026-10-21T12:00:00Z',
          },
        ]
      else if (path === '/api/cupons/PUC-CAFE-2026') data = coupon
      else if (path === '/api/conta/extrato') data = transactions
      else if (path === '/api/alunos/selecionaveis')
        data = [student, { ...student, id: 'other', name: 'Rafael Almeida' }]
      else if (path === '/api/transferencias-alunos')
        data = {
          groups: [
            {
              teacherId: 'teacher',
              teacherName: 'Helena Prado',
              criteria:
                'Reconhecer colaboração comprovada em atividades acadêmicas.',
              students: [
                student,
                { ...student, id: 'other', name: 'Rafael Almeida' },
              ],
            },
          ],
          availableStudents: [
            student,
            { ...student, id: 'other', name: 'Rafael Almeida' },
          ],
          requests: [],
        }
      else if (path === '/api/instituicao/professores')
        data = [
          {
            id: 'teacher',
            name: 'Helena Prado',
            email: 'helena@example.test',
            cpf: '12345678909',
            department: 'Engenharia de Software',
            balance: 900,
            active: true,
          },
        ]
      else if (path === '/api/gamificacao/beneficiarias')
        data = [
          {
            id: 'beneficiary',
            name: 'Rede Solidária',
            address: 'Rua da Comunidade, 42',
          },
        ]
      else if (path === '/api/gamificacao/perguntas')
        data = quiz.items.map((item, i) => ({
          ...item,
          id: `q${i}`,
          alternatives: [
            'Revisar em equipe',
            'Ocultar decisões',
            'Evitar testes',
            'Ignorar comentários',
          ],
          correctIndex: 0,
          active: true,
        }))
      else if (/^\/api\/gamificacao\/fundo\/[^/]+$/.test(path))
        data = {
          semester: '2026-2',
          allocation: 1000,
          balance: 900,
          reserved: 100,
          origin: 'Orçamento institucional',
          movements: [
            {
              kind: 'DOTACAO',
              amount: 1000,
              sourceKey: 'test',
              date: '2026-10-20T12:00:00Z',
            },
          ],
          payments: [],
          winners: [],
        }
      else if (path === '/api/gamificacao/doacoes')
        data = [
          {
            id: 'donation',
            code: coupon.code,
            advantageName: offer.name,
            companyName: offer.companyName,
            studentName: student.name,
            beneficiaryName: 'Rede Solidária',
            date: coupon.date,
            usedAt: null,
          },
        ]
      else if (path === '/api/gamificacao/desafios')
        data = [
          {
            id: 'challenge',
            title: 'Uma solução para o campus',
            description:
              'Proponha uma melhoria acessível para a comunidade acadêmica.',
            reward: 80,
            capacity: 10,
            budget: 800,
            deadline: '2099-11-05T20:00:00Z',
            status: 'PROPOSTA',
            participants: [],
          },
        ]
      else return route.fallback()
      return route.fulfill({ json: historyJson(route, data) })
    },
  )
}

async function capture(page: Page, name: string) {
  await page.evaluate(() => document.fonts.ready)
  await page.locator('img').evaluateAll(async (nodes) => {
    await Promise.all(
      nodes.map(async (node) => {
        if (node instanceof HTMLImageElement) {
          node.loading = 'eager'
          await node.decode().catch(() => {})
        }
      }),
    )
  })
  await page.screenshot({
    path: `${out}/${phase}-${name}.png`,
    fullPage: true,
    animations: 'disabled',
  })
}

const personas: Record<string, string[]> = {
  PUBLIC: [
    '/',
    '/login',
    '/cadastro/aluno',
    '/cadastro/empresa',
    '/inexistente',
  ],
  FIRST: ['/primeiro-acesso'],
  ALUNO: [
    '/aluno',
    '/aluno/catalogo',
    '/aluno/extrato',
    '/aluno/transferencias',
    '/aluno/cupons',
    '/aluno/conquistas',
    '/aluno/quiz',
    '/aluno/quiz/historico',
    '/aluno/missoes',
    '/aluno/recompensas',
    '/ranking',
    '/perfis/student',
    '/perfil',
    '/perfil/editar',
  ],
  PROFESSOR: [
    '/professor',
    '/professor/enviar',
    '/professor/transferencias-alunos',
    '/professor/extrato',
    '/professor/perguntas',
    '/professor/missoes',
    '/ranking',
    '/perfil',
    '/notificacoes',
  ],
  EMPRESA: [
    '/empresa',
    '/empresa/vantagens',
    '/empresa/vantagens/nova',
    '/empresa/vantagens/coffee/editar',
    '/empresa/cupons',
    '/empresa/desafios',
    '/perfil',
  ],
  ENSINO: ['/empresa', '/empresa/professores', '/empresa/fundo'],
  BENEFICIARIA: ['/empresa', '/empresa/doacoes'],
}

for (const theme of ['light', 'dark'])
  for (const width of [1440, 390])
    for (const [persona, paths] of Object.entries(personas)) {
      test(`inventário ${persona} ${theme} ${width}`, async ({ page }) => {
        await mkdir(out, { recursive: true })
        await page.setViewportSize({
          width,
          height: width === 1440 ? 1000 : 844,
        })
        await page.addInitScript(
          (value) => localStorage.setItem('puclim.theme', value),
          theme,
        )
        await setup(page, persona)
        const results = []
        for (const path of paths) {
          const errors: string[] = []
          const onError = (error: Error) => errors.push(error.message)
          page.on('pageerror', onError)
          await page.goto(path)
          await expect(page.locator('h1').first()).toBeVisible()
          await expect(page.locator('.loading')).toHaveCount(0)
          await expect(
            page.getByText('Unexpected Application Error!', { exact: true }),
          ).toHaveCount(0)
          const name = `${persona.toLowerCase()}-${path === '/' ? 'landing' : path.slice(1).replaceAll('/', '-')}-${theme}-${width}`
          await capture(page, name)
          const overflow = await page.evaluate(() => ({
            page: document.documentElement.scrollWidth > innerWidth + 1,
            elements: [...document.querySelectorAll('main *')]
              .filter((el) => {
                const rect = el.getBoundingClientRect()
                return (
                  rect.width > 0 &&
                  (rect.right > innerWidth + 2 || rect.left < -2) &&
                  getComputedStyle(el).position !== 'absolute'
                )
              })
              .slice(0, 6)
              .map((el) => el.className),
          }))
          results.push({
            path,
            rendered: new URL(page.url()).pathname,
            errors,
            overflow,
          })
          page.off('pageerror', onError)
          expect.soft(errors, path).toEqual([])
          expect.soft(overflow.page, `overflow ${path}`).toBe(false)
        }
        await writeFile(
          `${out}/${phase}-inventario-${persona}-${theme}-${width}.json`,
          JSON.stringify(results, null, 2),
        )
      })
    }

for (const theme of ['light', 'dark'])
  for (const width of [1440, 390]) {
    test(`interações ${theme} ${width}`, async ({ page }) => {
      test.setTimeout(60000)
      await page.setViewportSize({ width, height: width === 1440 ? 1000 : 844 })
      await page.addInitScript(
        (value) => localStorage.setItem('puclim.theme', value),
        theme,
      )
      await setup(page, 'ALUNO')
      const suffix = `${theme}-${width}`
      await page.goto('/aluno/cupons')
      await page.getByRole('button', { name: 'Doar vantagem' }).click()
      await expect(page.locator('.query-state.loading')).toHaveCount(0)
      await page
        .getByRole('combobox', { name: 'Instituição beneficiária' })
        .focus()
      await page.keyboard.press('Space')
      await expect(
        page.getByRole('option', { name: 'Rede Solidária' }),
      ).toBeVisible()
      await page.screenshot({
        path: `${out}/${phase}-doacao-menu-${suffix}.png`,
        animations: 'disabled',
      })
      await page.getByRole('option', { name: 'Rede Solidária' }).click()
      await page.getByRole('button', { name: 'Revisar doação' }).focus()
      await capture(page, `doacao-form-${suffix}`)
      await page.getByRole('button', { name: 'Revisar doação' }).click()
      await capture(page, `doacao-revisao-${suffix}`)
      await page.getByRole('button', { name: 'Cancelar', exact: true }).click()
      await page.goto('/aluno/catalogo')
      await page.getByRole('button', { name: 'Ver detalhes' }).first().click()
      await expect(page.getByRole('dialog')).toBeVisible()
      await capture(page, `resgate-modal-${suffix}`)
      await page.keyboard.press('Escape')
      await page.goto('/aluno/extrato')
      const date = page.locator('#from')
      await expect(date).toBeVisible()
      if (phase === 'after')
        await page.getByRole('button', { name: 'Abrir calendário: De' }).click()
      else await date.evaluate((node: HTMLInputElement) => node.showPicker())
      await page.screenshot({
        path: `${out}/${phase}-calendario-${suffix}.png`,
        animations: 'disabled',
      })
      await page.keyboard.press('Escape')
      if (width === 390) {
        await page.getByRole('button', { name: 'Abrir menu' }).click()
        await capture(page, `sidebar-${suffix}`)
        await page.keyboard.press('Escape')
      }
      let started = false
      await page.route(
        (url) => url.pathname === '/api/gamificacao/quizzes/hoje',
        (route) => {
          started = true
          return route.fulfill({ json: quiz })
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
              today: started ? quiz : null,
              history: [],
            },
          }),
      )
      await page.goto('/aluno/quiz')
      await page
        .getByRole('button', { name: /Começar|Iniciar|Continuar/ })
        .first()
        .click()
      await expect(
        page.getByRole('region', { name: 'Quiz em andamento' }),
      ).toBeVisible()
      await page.getByRole('radio').first().check()
      await capture(page, `quiz-sessao-${suffix}`)
    })
  }

async function overlay(page: Page, name: string) {
  await page.evaluate(() => document.fonts.ready)
  await page.screenshot({
    path: `${out}/${phase}-${name}.png`,
    animations: 'disabled',
  })
}

for (const theme of ['light', 'dark'])
  for (const width of [1440, 390]) {
    test(`estados aluno ${theme} ${width}`, async ({ page }) => {
      test.skip(phase === 'before')
      await page.setViewportSize({ width, height: width === 1440 ? 1000 : 844 })
      await page.addInitScript(
        (value) => localStorage.setItem('puclim.theme', value),
        theme,
      )
      await setup(page, 'ALUNO')
      const suffix = `${theme}-${width}`
      await page.goto('/aluno/conquistas')
      await page
        .getByRole('button', { name: 'Ver conquista: Primeira doação' })
        .click()
      await overlay(page, `conquista-modal-${suffix}`)
      await page.keyboard.press('Escape')
      await page.goto('/aluno/missoes')
      await page
        .getByRole('button', { name: 'Ver missão: Mentoria entre colegas' })
        .click()
      await overlay(page, `missao-entrega-${suffix}`)
      await page.keyboard.press('Escape')
      await page.goto('/aluno/quiz/historico')
      await page
        .getByRole('button', { name: /^Ver resultado de/ })
        .first()
        .click()
      await overlay(page, `quiz-resultado-${suffix}`)
      await page.keyboard.press('Escape')
      await page.goto('/perfil')
      await page.getByRole('button', { name: 'Excluir minha conta' }).click()
      await overlay(page, `conta-exclusao-${suffix}`)
      await page.keyboard.press('Escape')
      await page.goto('/perfil/editar')
      for (const section of [
        'Avatar',
        'Fundo do perfil',
        'Vitrines',
        'Privacidade',
      ]) {
        await page.getByRole('button', { name: section, exact: true }).click()
        await capture(
          page,
          `perfil-secao-${section.replaceAll(' ', '-')}-${suffix}`,
        )
      }
      await page.getByRole('button', { name: 'Avatar', exact: true }).click()
      await page
        .locator('#avatar-upload')
        .setInputFiles('public/images/coffee.jpg')
      await expect(
        page.getByRole('dialog', { name: 'Recortar avatar' }),
      ).toBeVisible()
      await overlay(page, `avatar-recorte-${suffix}`)
    })

    test(`estados professor ${theme} ${width}`, async ({ page }) => {
      test.skip(phase === 'before')
      await page.setViewportSize({ width, height: width === 1440 ? 1000 : 844 })
      await page.addInitScript(
        (value) => localStorage.setItem('puclim.theme', value),
        theme,
      )
      await setup(page, 'PROFESSOR')
      const suffix = `${theme}-${width}`
      await page.goto('/professor/perguntas')
      await page
        .getByRole('button', { name: 'Nova pergunta', exact: true })
        .click()
      await capture(page, `pergunta-nova-${suffix}`)
      await page.getByRole('button', { name: 'Cancelar edição' }).click()
      await page
        .getByRole('button', { name: 'Editar pergunta', exact: true })
        .first()
        .click()
      await capture(page, `pergunta-edicao-${suffix}`)
      await page.goto('/professor/missoes')
      await page
        .getByRole('button', { name: 'Criar missão', exact: true })
        .click()
      await capture(page, `missao-nova-${suffix}`)
      await page
        .getByRole('button', {
          name: 'Abrir calendário: Prazo de encerramento',
        })
        .click()
      await expect(
        page.getByRole('dialog', { name: 'Calendário: Prazo de encerramento' }),
      ).toBeVisible()
      await overlay(page, `missao-calendario-${suffix}`)
      await page.keyboard.press('Escape')
      await page.goto('/professor/missoes')
      await page
        .getByRole('button', { name: 'Ver missão: Compartilhe sua pesquisa' })
        .click()
      await overlay(page, `missao-analise-${suffix}`)
      await page
        .getByRole('button', { name: 'Abrir calendário: Novo prazo' })
        .click()
      await overlay(page, `missao-prazo-${suffix}`)
    })

    test(`estados parceiro ${theme} ${width}`, async ({ page }) => {
      test.skip(phase === 'before')
      await page.setViewportSize({ width, height: width === 1440 ? 1000 : 844 })
      await page.addInitScript(
        (value) => localStorage.setItem('puclim.theme', value),
        theme,
      )
      await setup(page, 'EMPRESA')
      const suffix = `${theme}-${width}`
      await page.goto('/empresa/vantagens')
      await page.getByRole('button', { name: `Excluir ${offer.name}` }).click()
      await overlay(page, `vantagem-exclusao-${suffix}`)
      await page.keyboard.press('Escape')
      await page.goto('/empresa/desafios')
      await page.getByRole('button', { name: 'Nova proposta' }).click()
      await capture(page, `desafio-novo-${suffix}`)
      await page.goto('/empresa/cupons')
      await page
        .getByRole('button', { name: 'Conferir', exact: true })
        .first()
        .click()
      await overlay(page, `cupom-conferido-${suffix}`)
    })

    test(`estados instituição ${theme} ${width}`, async ({ page }) => {
      test.skip(phase === 'before')
      await page.setViewportSize({ width, height: width === 1440 ? 1000 : 844 })
      await page.addInitScript(
        (value) => localStorage.setItem('puclim.theme', value),
        theme,
      )
      await setup(page, 'ENSINO')
      const suffix = `${theme}-${width}`
      await page.goto('/empresa/professores')
      await page.getByRole('button', { name: 'Cadastrar professor' }).click()
      await overlay(page, `professor-cadastro-${suffix}`)
      await page.keyboard.press('Escape')
      await page.goto('/empresa/fundo')
      const disabled = page.getByRole('button', { name: /Processar premiação/ })
      await expect(disabled).toBeDisabled()
      await disabled.hover()
      await overlay(page, `fundo-desabilitado-${suffix}`)
    })
  }

test('calendário atualiza o filtro controlado, limita o período e devolve foco', async ({
  page,
}) => {
  test.skip(phase === 'before')
  await page.setViewportSize({ width: 320, height: 700 })
  await setup(page, 'ALUNO')
  await page.goto('/aluno/extrato')
  await page.locator('#from').fill('2026-10-19')
  await page.getByRole('button', { name: 'Abrir calendário: De' }).focus()
  await page.keyboard.press('Enter')
  await expect(page.locator('[data-day="2026-10-19"]')).toBeFocused()
  await page.keyboard.press('ArrowRight')
  await expect(page.locator('[data-day="2026-10-20"]')).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.locator('#from')).toHaveValue('2026-10-20')
  await expect(
    page.getByText('1 movimentação encontrada', { exact: true }),
  ).toBeVisible()
  await page.locator('#to').fill('2026-10-20')
  await page.getByRole('button', { name: 'Abrir calendário: Até' }).click()
  const calendar = page.getByRole('dialog', { name: 'Calendário: Até' })
  expect(
    await calendar.evaluate((node) => node.scrollWidth <= node.clientWidth),
  ).toBe(true)
  await expect(calendar.locator('[data-day="2026-10-19"]')).toBeDisabled()
  await expect(calendar.locator('[data-day="2026-10-20"]')).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await page.keyboard.press('Escape')
  await expect(
    page.getByRole('button', { name: 'Abrir calendário: Até' }),
  ).toBeFocused()
})

test('calendário de formulário preserva horário, registro e validação do prazo', async ({
  page,
}) => {
  test.skip(phase === 'before')
  await setup(page, 'PROFESSOR')
  await page.goto('/professor/missoes')
  await page.getByRole('button', { name: 'Criar missão', exact: true }).click()
  const field = page.locator('#activity-deadline')
  await field.fill('2099-11-05T17:30')
  await page
    .getByRole('button', { name: 'Abrir calendário: Prazo de encerramento' })
    .click()
  await page.locator('[data-day="2099-11-06"]').click()
  await expect(field).toHaveValue('2099-11-06T17:30')
  await page.getByLabel('Título', { exact: true }).fill('Mentoria em equipe')
  await page
    .getByLabel('Descrição', { exact: true })
    .fill('Compartilhe uma proposta com referências para melhorar o campus.')
  await page.locator('#activity-reward').fill('20')
  await page.locator('#activity-capacity').fill('4')
  const request = page.waitForRequest(
    (req) =>
      req.method() === 'POST' &&
      new URL(req.url()).pathname === '/api/gamificacao/missoes',
  )
  await page.getByRole('button', { name: /Publicar missão/ }).click()
  const payload = (await request).postDataJSON()
  expect(payload.deadline).toBe(new Date('2099-11-06T17:30').toISOString())
  expect(payload.reward).toBe(20)
  expect(payload.capacity).toBe(4)
})
