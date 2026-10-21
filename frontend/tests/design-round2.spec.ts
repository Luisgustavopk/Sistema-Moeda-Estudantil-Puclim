import { chooseOption } from './select-option'
import { expect, test, type Page } from '@playwright/test'
import { mockDesignReview } from './design-round1-fixture'
import { profile, publicProfileFixture, quiz } from './gamification-fixture'

async function extendedHistory(page: Page) {
  await mockDesignReview(page)
  const history = Array.from({ length: 25 }, (_, i) => ({
    ...quiz,
    id: `history-${i}`,
    day:
      i < 13
        ? `2026-10-${String(20 - i).padStart(2, '0')}`
        : `2026-09-${String(30 - i + 13).padStart(2, '0')}`,
    completedAt: '2026-10-20T12:00:00Z',
    correctCount: i % 2 ? 3 : 5,
    grade: i % 2 ? 6 : 10,
    errors: i % 2 ? 2 : 0,
    items: quiz.items.map((item, n) => ({
      ...item,
      correctIndex: 0,
      selectedIndex: n < (i % 2 ? 3 : 5) ? 0 : 1,
    })),
  }))
  await page.route(
    (url) => url.pathname === '/api/gamificacao/quizzes',
    (route) =>
      route.fulfill({
        json: {
          today: history[0],
          history,
          streak: 4,
          bestStreak: 9,
          daysToReward: 3,
          nextAvailable: '2026-10-21T03:00:00Z',
        },
      }),
  )
}

test('quiz: três recentes, histórico paginado, estatísticas do período e retorno', async ({
  page,
}) => {
  await extendedHistory(page)
  await page.goto('/aluno/quiz')
  await expect(page.locator('.quiz-history-day')).toHaveCount(3)
  await page.getByRole('link', { name: 'Ver histórico completo' }).click()
  await expect(page).toHaveURL(/\/aluno\/quiz\/historico$/)
  const stats = page.getByLabel('Estatísticas do período')
  await expect(stats).toContainText('25') // Today must not be counted twice.
  await expect(stats).toContainText('81%')
  await expect(stats).toContainText('101 de 125')
  await expect(page.locator('.quiz-history-day')).toHaveCount(12)
  await page.getByRole('button', { name: 'Página 3', exact: true }).click()
  await expect(page.locator('.quiz-history-day')).toHaveCount(1)
  await chooseOption(page.getByLabel('Período do histórico'), '2026-10')
  await expect(
    page.getByRole('button', { name: 'Página 1', exact: true }),
  ).toHaveAttribute('aria-current', 'page')
  await expect(stats).toContainText('13')
  await expect(stats).toContainText('82%')
  await page
    .getByRole('button', { name: 'Ver resultado', exact: false })
    .first()
    .click()
  await expect(page.getByRole('dialog').locator('.quiz-review')).toHaveCount(5)
  await page.keyboard.press('Escape')
  await page.getByRole('link', { name: 'Voltar ao quiz diário' }).click()
  await expect(
    page.getByRole('heading', { name: 'Quiz diário', exact: true }),
  ).toBeVisible()
})

test('notificações: oito por página, leitura ajusta última página e e-mails paginam', async ({
  page,
}) => {
  await mockDesignReview(page)
  const notices = Array.from({ length: 17 }, (_, i) => ({
    id: `n-${i}`,
    title: `Contribuição reconhecida ${i + 1}`,
    type: 'BADGE',
    message: 'Seu aprendizado ganhou um novo marco.',
    date: '2026-10-20T12:00:00Z',
    readAt: null as string | null,
    referenceId: null,
  }))
  await page.route(
    (url) => url.pathname.startsWith('/api/gamificacao/notificacoes'),
    (route) => {
      const path = new URL(route.request().url()).pathname
      if (path.endsWith('/ler')) {
        notices.find((n) => path.includes(`/${n.id}/`))!.readAt =
          '2026-10-20T15:00:00Z'
        return route.fulfill({ status: 204 })
      }
      return route.fulfill({ json: notices })
    },
  )
  await page.route(
    (url) => url.pathname === '/api/conta/notificacoes',
    (route) =>
      route.fulfill({
        json: Array.from({ length: 19 }, (_, i) => ({
          id: `mail-${i}`,
          subject: `Reconhecimento por e-mail ${i + 1}`,
          body: 'Sua contribuição foi reconhecida.',
          date: '2026-10-20T12:00:00Z',
          recipient: 'mariana@example.test',
          deliveryStatus: 'ENVIADO',
        })),
      }),
  )
  await page.goto('/notificacoes')
  await expect(page.locator('.notice-item')).toHaveCount(8)
  await page
    .getByRole('button', { name: 'Não lidas (17)', exact: true })
    .click()
  await page.getByRole('button', { name: 'Página 3', exact: true }).click()
  await expect(page.locator('.notice-item')).toHaveCount(1)
  await page.getByRole('button', { name: 'Marcar como lida' }).click()
  await expect(page.locator('.notice-item')).toHaveCount(8)
  await expect(
    page.getByRole('button', { name: 'Página 2', exact: true }),
  ).toHaveAttribute('aria-current', 'page')
  await page.getByRole('button', { name: 'Todas', exact: true }).click()
  await expect(
    page.getByRole('button', { name: 'Página 1', exact: true }),
  ).toHaveAttribute('aria-current', 'page')
  await page.getByRole('tab', { name: 'E-mails', exact: true }).click()
  await expect(page.locator('.email-item')).toHaveCount(8)
  await page.getByRole('button', { name: 'Página 3', exact: true }).click()
  await expect(page.locator('.email-item')).toHaveCount(3)
})

test('editor: controles estilizados operam por teclado sem submissão pela prévia', async ({
  page,
}) => {
  await mockDesignReview(page)
  await page.goto('/perfil/editar')
  const checkbox = page.getByLabel('Exibir nome real', { exact: true })
  await checkbox.focus()
  const previous = await checkbox.isChecked()
  await page.keyboard.press('Space')
  await expect(checkbox).toBeChecked({ checked: !previous })
  await page.locator('.editor-preview .profile-highlight').click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.locator('.editor-panel').getByRole('alert')).toHaveCount(0)
  await expect(
    page.getByRole('button', { name: 'Salvar perfil' }),
  ).toBeEnabled()
  await page.getByRole('button', { name: 'Vitrines', exact: true }).click()
  const select = page.getByLabel('Conquista favorita', { exact: true })
  await select.focus()
  await page.keyboard.press('ArrowDown')
  await expect(
    page.getByRole('option', { name: 'Sem favorita', exact: true }),
  ).toBeFocused()
  await page.keyboard.press('ArrowDown')
  await expect(
    page.getByRole('option', { name: 'Primeira moeda', exact: true }),
  ).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(select).toContainText('Primeira moeda')
})

for (const width of [360, 390, 768, 1280, 1440])
  for (const theme of ['light', 'dark']) {
    test(`rodada 2 visual ${width} ${theme}`, async ({ page }, info) => {
      test.setTimeout(90000)
      await mockDesignReview(page)
      await page.setViewportSize({ width, height: 1000 })
      await page.addInitScript(
        (theme) => localStorage.setItem('puclim.theme', theme),
        theme,
      )
      const errors: string[] = []
      page.on('pageerror', (error) => errors.push(error.message))
      for (const [route, marker, name] of [
        ['/aluno/conquistas', '.collection-summary', 'colecao'],
        ['/perfis/student', '.public-profile-hero', 'perfil-publico'],
        ['/perfil/editar', '.editor-preview', 'editor'],
        ['/perfil', '#profile-name', 'conta'],
        ['/aluno/quiz', '.quiz-history-day', 'quiz'],
        ['/aluno/quiz/historico', '.quiz-history-day', 'historico'],
        ['/notificacoes', '.notice-item', 'notificacoes'],
      ]) {
        await page.goto(route)
        await expect(page.locator(marker).first()).toBeVisible()
        await page.evaluate(() => document.fonts.ready)
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          route,
        ).toBeTruthy()
        if (
          name === 'colecao' ||
          name === 'perfil-publico' ||
          name === 'editor'
        ) {
          const ring = page
            .locator(
              `${name === 'colecao' ? '.collection-summary' : name === 'editor' ? '.editor-preview' : '.public-profile-hero'} .progress-ring`,
            )
            .first()
          const geometry = await ring.evaluate((el) => {
            const ring = el.getBoundingClientRect(),
              svg = el.querySelector('svg')!.getBoundingClientRect()
            return {
              w: ring.width,
              h: ring.height,
              sw: svg.width,
              sh: svg.height,
            }
          })
          expect(Math.abs(geometry.w - geometry.h)).toBeLessThan(1)
          expect(Math.abs(geometry.sw - geometry.sh)).toBeLessThan(1)
        }
        await page.screenshot({
          path: info.outputPath(`${name}-${width}-${theme}.png`),
          fullPage: true,
          animations: 'disabled',
        })
        if (name === 'editor') {
          await page
            .getByRole('button', { name: 'Avatar', exact: true })
            .click()
          await page.screenshot({
            path: info.outputPath(`editor-avatar-${width}-${theme}.png`),
            fullPage: true,
            animations: 'disabled',
          })
        }
      }
      expect(errors).toEqual([])
    })
  }

test('rodada 2: fonte ampliada, nomes extensos e estados vazios', async ({
  page,
}) => {
  await mockDesignReview(page)
  await page.setViewportSize({ width: 360, height: 900 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.route(
    (url) => url.pathname.startsWith('/api/gamificacao/perfis/'),
    (route) =>
      route.fulfill({
        json: publicProfileFixture({
          ...profile,
          name: 'Maria Eduarda de Albuquerque e Vasconcelos',
          course: 'Engenharia de Computação e Sistemas de Informação',
          institution: 'Pontifícia Universidade Católica de Minas Gerais',
        }),
      }),
  )
  for (const route of [
    '/aluno/conquistas',
    '/perfis/student',
    '/perfil/editar',
    '/perfil',
    '/aluno/quiz/historico',
  ]) {
    await page.goto(route)
    await expect(page.locator('h1')).toBeVisible()
    await page.addStyleTag({ content: 'html {font-size:130%} ' })
    if (route === '/perfil/editar') {
      await page
        .getByLabel('Nome de exibição', { exact: true })
        .fill('Maria Eduarda de Albuquerque e Silva')
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      route,
    ).toBeTruthy()
    if (route === '/perfil/editar') {
      await page.getByRole('button', { name: 'Descartar', exact: true }).click()
    }
  }
  await page.route(
    (url) => url.pathname === '/api/gamificacao/quizzes',
    (route) =>
      route.fulfill({
        json: {
          today: null,
          history: [],
          streak: 0,
          bestStreak: 0,
          daysToReward: 7,
          nextAvailable: '2026-10-21T03:00:00Z',
        },
      }),
  )
  await page.reload()
  await expect(
    page.getByText('Nenhum quiz concluído neste período.'),
  ).toBeVisible()
  await expect(page.getByLabel('Estatísticas do período')).not.toContainText(
    'NaN',
  )
  await expect(
    page.getByRole('navigation', { name: 'Páginas do histórico de quizzes' }),
  ).toHaveCount(0)
})
