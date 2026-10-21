import { expect, test } from '@playwright/test'
import { mockDesignReview } from './design-round1-fixture'

test('missões compactas: detalhes, aceite e entrega atualizam o estado', async ({
  page,
}) => {
  await mockDesignReview(page)
  await page.goto('/aluno/missoes')
  await expect(page.locator('.mission-tile')).toHaveCount(8)
  await expect(page.locator('.mission-tile').first()).not.toContainText(
    'Investigue o tema',
  )
  await page
    .getByRole('button', {
      name: 'Ver missão: Mapeie uma iniciativa sustentável',
      exact: true,
    })
    .click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toContainText('Investigue o tema')
  await dialog
    .getByRole('button', { name: 'Aceitar missão', exact: true })
    .click()
  await expect(dialog).toContainText('Em andamento')
  await dialog
    .getByLabel('Sua entrega')
    .fill('Proposta fundamentada com referências e resultados.')
  await dialog
    .getByRole('button', { name: 'Enviar entrega', exact: true })
    .click()
  await expect(dialog.locator('.participation-detail')).toContainText(
    'Aguardando aprovação',
  )
  await page.keyboard.press('Escape')
  await expect(
    page.getByRole('button', {
      name: 'Ver missão: Mapeie uma iniciativa sustentável',
      exact: true,
    }),
  ).toBeFocused()
  await page
    .getByRole('button', { name: 'Minhas participações', exact: true })
    .click()
  await expect(page.locator('.mission-tile')).toHaveCount(5)
  await page
    .getByLabel('Estado', { exact: true })
    .selectOption('AGUARDANDO_APROVACAO')
  await expect(page.locator('.mission-tile')).toHaveCount(2)
})

test('professor: aprovação e devolução continuam disponíveis no detalhe', async ({
  page,
}) => {
  await mockDesignReview(page, 'PROFESSOR')
  await page.goto('/professor/missoes')
  await page
    .getByRole('button', {
      name: 'Ver missão: Compartilhe sua pesquisa',
      exact: true,
    })
    .click()
  const dialog = page.getByRole('dialog')
  await dialog
    .getByLabel('Parecer da análise')
    .fill('Inclua uma fonte para a proposta.')
  await dialog.getByRole('button', { name: 'Devolver para ajustes' }).click()
  await expect(dialog.locator('.participation-detail')).toContainText(
    'Ajustes solicitados',
  )
  await expect(
    dialog.getByRole('button', { name: 'Aprovar entrega' }),
  ).toHaveCount(0)
  await page.keyboard.press('Escape')
  await page
    .getByRole('button', {
      name: 'Ver missão: Registre a memória do bairro',
      exact: true,
    })
    .click()
  await expect(
    page.getByRole('dialog').getByRole('button', { name: 'Encerrar missão' }),
  ).toHaveCount(0)
})

test('notificações: leitura, expansão e separação dos e-mails', async ({
  page,
}) => {
  await mockDesignReview(page)
  await page.goto('/notificacoes')
  await page.getByRole('button', { name: 'Não lidas (2)', exact: true }).click()
  await expect(page.locator('.notice-item')).toHaveCount(2)
  await page.getByRole('button', { name: 'Marcar como lida' }).first().click()
  await expect(page.locator('.notice-item')).toHaveCount(1)
  await page.getByRole('button', { name: 'Todas', exact: true }).click()
  await page.getByRole('button', { name: 'Ler mensagem completa' }).click()
  await expect(
    page.getByRole('button', { name: 'Recolher mensagem' }),
  ).toHaveAttribute('aria-expanded', 'true')
  await page.getByRole('tab', { name: 'E-mails', exact: true }).click()
  await expect(page.locator('.email-item')).toHaveCount(2)
  await expect(page.locator('.notice-item')).toHaveCount(0)
  await expect(page.getByRole('tabpanel')).toContainText('Aguardando envio')
})

test('quiz: histórico por mês e dia com revisão separada', async ({ page }) => {
  await mockDesignReview(page)
  await page.goto('/aluno/quiz')
  await expect(page.locator('.quiz-history-day')).toHaveCount(3)
  await page.getByRole('link', { name: 'Ver histórico completo' }).click()
  await expect(page.locator('.quiz-history-month')).toHaveCount(2)
  await expect(page.locator('.quiz-history-day')).toHaveCount(12)
  await expect(page.locator('.quiz-review')).toHaveCount(0)
  await page
    .getByRole('button', {
      name: 'Ver resultado de 19 de outubro',
      exact: true,
    })
    .click()
  await expect(page.getByRole('dialog').locator('.quiz-review')).toHaveCount(5)
  await page.keyboard.press('Escape')
  await expect(
    page.getByRole('button', {
      name: 'Ver resultado de 19 de outubro',
      exact: true,
    }),
  ).toBeFocused()
})

test('perfil: coleção e marcos visuais sem lista de histórico de níveis', async ({
  page,
}) => {
  await mockDesignReview(page)
  await page.goto('/perfis/student')
  await expect(
    page.getByRole('heading', { name: 'Histórico de níveis' }),
  ).toHaveCount(0)
  await expect(
    page.locator('.profile-level-display').getByRole('img'),
  ).toHaveAttribute('aria-label', /Nível 3/)
  await expect(page.locator('.profile-mini-feed li')).toHaveCount(4)
  await page
    .getByRole('button', { name: 'Explorar coleção · 2 conquistas' })
    .click()
  await expect(
    page.getByRole('dialog').locator('.profile-badge-slot'),
  ).toHaveCount(2)
  await page.keyboard.press('Escape')
  await expect(page.locator('.profile-collection-link')).toBeFocused()
})

test('recompensas: totais reconciliam com o período e situação', async ({
  page,
}) => {
  await mockDesignReview(page)
  await page.goto('/aluno/recompensas')
  await expect(page.getByLabel('Resumo do período')).toContainText('120')
  await expect(page.getByLabel('Resumo do período')).toContainText('15')
  await page.getByLabel('Período', { exact: true }).selectOption('2026-2')
  await expect(page.locator('.reward-row')).toHaveCount(2)
  await expect(page.getByLabel('Resumo do período')).toContainText('20')
  await page.getByLabel('Situação', { exact: true }).selectOption('PENDENTE')
  await expect(page.locator('.reward-row')).toHaveCount(1)
  await expect(page.locator('.reward-row')).toContainText('Bônus de mérito')
  await expect(page.locator('.reward-row')).not.toContainText('Mariana Costa')
})

for (const width of [390, 768, 1440, 1920])
  for (const theme of ['light', 'dark']) {
    test(`rodada 1: visual ${width} ${theme}`, async ({ page }, info) => {
      // Seven routes and a dialog capture share this test's total time budget.
      test.setTimeout(90000)
      await mockDesignReview(page)
      await page.setViewportSize({ width, height: 1000 })
      await page.addInitScript(
        (theme) => localStorage.setItem('puclim.theme', theme),
        theme,
      )
      const errors: string[] = []
      page.on('pageerror', (error) => errors.push(error.message))
      for (const [route, selector, name] of [
        ['/aluno/missoes', '.mission-tile', 'missoes'],
        ['/notificacoes', '.notice-item', 'notificacoes'],
        ['/perfis/student', '.profile-trophy-room', 'perfil'],
        ['/aluno/quiz', '.quiz-history-day', 'quiz'],
        ['/aluno/conquistas', '.achievement-card', 'conquistas'],
        ['/ranking', '.ranking-row', 'ranking'],
        ['/aluno/recompensas', '.reward-row', 'recompensas'],
      ]) {
        await page.goto(route)
        await expect(page.locator(selector).first()).toBeVisible()
        await page.evaluate(() => document.fonts.ready)
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          route,
        ).toBeTruthy()
        expect(errors, route).toEqual([])
        await page.screenshot({
          path: info.outputPath(`${name}-${width}-${theme}.png`),
          fullPage: true,
          animations: 'disabled',
        })
        if (name === 'missoes') {
          await page.locator('.mission-tile').first().click()
          await expect(page.getByRole('dialog')).toBeVisible()
          expect(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth,
            ),
          ).toBeTruthy()
          await page.screenshot({
            path: info.outputPath(`missao-detalhe-${width}-${theme}.png`),
            fullPage: true,
            animations: 'disabled',
          })
          await page.keyboard.press('Escape')
        }
      }
    })
  }

test('professor: aprovação conclui a participação e oculta a análise', async ({
  page,
}) => {
  await mockDesignReview(page, 'PROFESSOR')
  await page.goto('/professor/missoes')
  await page
    .getByRole('button', {
      name: 'Ver missão: Compartilhe sua pesquisa',
      exact: true,
    })
    .click()
  const dialog = page.getByRole('dialog')
  await dialog
    .getByLabel('Parecer da análise')
    .fill('Referências e proposta aprovadas.')
  await dialog
    .getByRole('button', { name: 'Aprovar entrega', exact: true })
    .click()
  await expect(dialog.locator('.participation-detail')).toContainText(
    'Concluída',
  )
  await expect(dialog.getByLabel('Parecer da análise')).toHaveCount(0)
})

test('missão sem vagas informa o motivo e impede novo aceite', async ({
  page,
}) => {
  await mockDesignReview(page)
  await page.goto('/aluno/missoes')
  await page
    .getByRole('button', {
      name: 'Ver missão: Prototipe uma solução acessível',
      exact: true,
    })
    .click()
  await expect(page.getByRole('dialog')).toContainText('Sem vagas')
  await expect(
    page.getByRole('dialog').getByRole('button', { name: 'Aceitar missão' }),
  ).toBeDisabled()
})

test('novas telas: fonte ampliada, movimento reduzido e teclado nas abas', async ({
  page,
}) => {
  await mockDesignReview(page)
  await page.setViewportSize({ width: 360, height: 900 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  for (const theme of ['light', 'dark'])
    for (const route of [
      '/aluno/missoes',
      '/notificacoes',
      '/aluno/recompensas',
    ]) {
      await page.goto(route)
      await page.evaluate((theme) => {
        localStorage.setItem('puclim.theme', theme)
        window.dispatchEvent(new Event('puclim:theme'))
      }, theme)
      await page.addStyleTag({ content: 'html { font-size: 130%; }' })
      await expect(page.locator('h1')).toBeVisible()
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        route,
      ).toBeTruthy()
    }
  await page.goto('/notificacoes')
  await page.getByRole('tab', { name: 'Atividades', exact: true }).focus()
  await page.keyboard.press('ArrowRight')
  await expect(
    page.getByRole('tab', { name: 'E-mails', exact: true }),
  ).toBeFocused()
  await expect(
    page.getByRole('tab', { name: 'E-mails', exact: true }),
  ).toHaveAttribute('aria-selected', 'true')
})

test('ranking móvel: final da lista e paginação ficam acima da barra pessoal', async ({
  page,
}) => {
  await mockDesignReview(page)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/ranking')
  await expect(page.locator('.own-rank')).toBeVisible()
  await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight))
  const pagination = await page.locator('.ranking-pagination').boundingBox()
  const own = await page.locator('.own-rank').boundingBox()
  expect(pagination!.y + pagination!.height).toBeLessThan(own!.y)
  await page.getByRole('button', { name: 'Ver contexto', exact: true }).click()
  await expect(page.locator('#own-rank-context')).toBeFocused()
  expect(
    await page
      .locator('#own-rank-context')
      .evaluate((el) => getComputedStyle(el).position),
  ).toBe('static')
})
