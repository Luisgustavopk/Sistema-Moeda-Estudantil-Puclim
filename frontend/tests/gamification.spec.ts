import { expect, test } from '@playwright/test'
import { mockGame } from './gamification-fixture'

test('conquistas: filtrar, abrir detalhe e fechar por teclado', async ({
  page,
}) => {
  await mockGame(page)
  await page.goto('/aluno/conquistas')
  await expect(
    page.getByRole('heading', { name: 'Minhas conquistas' }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Bloqueada', exact: true }).click()
  await expect(page.locator('.achievement-card')).toHaveCount(2)
  await page
    .getByRole('button', { name: 'Ver conquista: Primeira doação' })
    .click()
  await expect(page.getByRole('dialog')).toContainText('Vantagens doadas: 1')
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(
    page.getByRole('button', { name: 'Ver conquista: Primeira doação' }),
  ).toBeFocused()
})

for (const width of [360, 375, 390, 768, 1024, 1280, 1920])
  for (const theme of ['light', 'dark']) {
    test(`visual conquistas ${width} ${theme}`, async ({ page }, testInfo) => {
      await mockGame(page)
      await page.setViewportSize({ width, height: 900 })
      await page.addInitScript(
        (theme) => localStorage.setItem('puclim.theme', theme),
        theme,
      )
      const errors: string[] = []
      page.on('pageerror', (error) => errors.push(error.message))
      page.on('console', (message) => {
        if (message.type() === 'error') errors.push(message.text())
      })
      for (const [route, selector, name] of [
        ['/aluno/conquistas', '.achievement-card', 'conquistas'],
        ['/ranking', '.ranking-row', 'ranking'],
        ['/aluno/quiz', '.quiz-intro', 'quiz'],
        ['/perfis/student', '.public-profile-hero', 'perfil-publico'],
        ['/perfil/editar', '.editor-panel', 'editar-perfil'],
        ['/perfil', '#profile-name', 'conta'],
        ['/aluno', '.merit-progress', 'painel'],
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
        if (width < 768)
          expect(
            await page
              .locator(
                '.achievement-card, .merit-chip, .merit-page .button, .mobile-bottom-nav a, .topbar .icon-button',
              )
              .evaluateAll((elements) =>
                elements.every((el) => el.getBoundingClientRect().height >= 44),
              ),
            route,
          ).toBeTruthy()
        expect(errors, route).toEqual([])
        await page.screenshot({
          path: testInfo.outputPath(`${name}-${width}-${theme}.png`),
          fullPage: true,
          animations: 'disabled',
        })
      }
    })
  }

test('ranking: métrica, vizinhos e posição própria fora da primeira página', async ({
  page,
}) => {
  await mockGame(page)
  await page.goto('/ranking')
  await expect(page.getByLabel('Sua posição no ranking')).toContainText('24º')
  await page.getByRole('button', { name: 'Ver contexto', exact: true }).click()
  await expect(page.locator('.rank-neighbors')).toContainText('23º')
  await expect(page.locator('.rank-neighbors')).toContainText('25º')
  await page.getByRole('button', { name: 'Maior streak', exact: true }).click()
  await expect(page.locator('.podium-1')).toContainText('30')
  await expect(page.getByLabel('Sua posição no ranking')).toContainText(
    '7 dias',
  )
  await expect(
    page.locator('.ranking-row').first().locator('.rank-value'),
  ).toHaveText('30dias')
  await expect(
    page.locator('.ranking-row').first().locator('.rank-value'),
  ).not.toContainText('moedas')
  await page.getByRole('button', { name: 'Próxima', exact: true }).click()
  await expect(page.getByLabel('Sua posição no ranking')).toContainText('24º')
})

test('quiz: seleção pelo teclado, revisão e conclusão única', async ({
  page,
}, testInfo) => {
  await mockGame(page)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/aluno/quiz')
  await page.getByRole('button', { name: 'Iniciar quiz de hoje' }).click()
  for (let i = 0; i < 5; i++) {
    await expect(
      page.getByText(`Pergunta ${i + 1} de 5`, { exact: false }),
    ).toBeVisible()
    await page.getByRole('radio').first().focus()
    await page.keyboard.press(i === 4 ? '2' : '1')
    if (i === 0) {
      await expect(page.getByText('Gabarito:', { exact: false })).toHaveCount(0)
      await page.screenshot({
        path: testInfo.outputPath('quiz-active-390.png'),
        fullPage: true,
        animations: 'disabled',
      })
      await page
        .getByRole('button', { name: 'Sair do quiz', exact: true })
        .click()
      await expect(page.getByRole('dialog')).toBeVisible()
      await page.keyboard.press('Escape')
    }
    if (i < 4)
      await page.getByRole('button', { name: 'Próxima pergunta' }).click()
  }
  await page.getByRole('button', { name: 'Concluir quiz', exact: true }).click()
  await expect(
    page.getByText('Quiz de hoje concluído.', { exact: false }),
  ).toBeVisible()
  await expect(page.getByText('Nota 8 / 10', { exact: false })).toBeVisible()
  await expect(page.locator('.quiz-review')).toHaveCount(5)
  await page.screenshot({
    path: testInfo.outputPath('quiz-result-390.png'),
    fullPage: true,
    animations: 'disabled',
  })
  await expect(
    page.getByRole('dialog', { name: 'Quiz concluído', exact: true }),
  ).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.locator('.quiz-result').locator('..')).toBeFocused()
  await page.reload()
  await expect(
    page.getByRole('button', { name: 'Iniciar quiz de hoje' }),
  ).toHaveCount(0)
})

test('editor: prévia, validação, saída pendente e API sem salvamento fictício', async ({
  page,
}) => {
  await mockGame(page)
  await page.goto('/perfil/editar')
  await page.getByLabel('Nome de exibição', { exact: true }).fill('Mari')
  await expect(page.locator('.editor-preview .public-display-name')).toHaveText(
    'Mari',
  )
  await expect(
    page.getByRole('button', { name: 'Salvar perfil' }),
  ).toBeDisabled()
  await page
    .getByRole('link', { name: 'Ver perfil público', exact: true })
    .click()
  await expect(page.getByRole('dialog')).toContainText('Você tem alterações')
  await page.getByRole('button', { name: 'Continuar aqui' }).click()
  await page.getByRole('button', { name: 'Avatar', exact: true }).click()
  await page.getByLabel('Enviar avatar', { exact: false }).setInputFiles({
    name: 'avatar.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('inválido'),
  })
  await expect(
    page.getByText('Escolha PNG, JPEG ou WebP de até 2 MB.'),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Geral', exact: true }).click()
  await page.getByLabel('Nome de exibição', { exact: true }).fill('M')
  await expect(page.getByText('Use pelo menos 2 caracteres.')).toBeVisible()
  expect(
    await page.evaluate(() =>
      Object.keys(localStorage).some((key) =>
        key.startsWith('puclim.demo.profile'),
      ),
    ),
  ).toBeFalsy()
})

test('perfil público: documentos e extrato não aparecem para aluno ou professor', async ({
  page,
}) => {
  await mockGame(page, 'PROFESSOR')
  await page.goto('/perfis/student')
  await expect(page.locator('.public-display-name')).toHaveText('Mariana Costa')
  await expect(page.getByText('CPF', { exact: true })).toHaveCount(0)
  await expect(page.getByText('RG', { exact: true })).toHaveCount(0)
  await expect(page.getByText('Endereço', { exact: true })).toHaveCount(0)
  await expect(
    page.getByRole('link', { name: 'Editar perfil', exact: true }),
  ).toHaveCount(0)
  await expect(page.locator('.public-profile-hero')).not.toContainText(
    '@example.test',
  )
})

test('texto ampliado e movimento reduzido preservam conteúdo e navegação', async ({
  page,
}) => {
  await mockGame(page)
  await page.setViewportSize({ width: 360, height: 900 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  for (const theme of ['light', 'dark'])
    for (const route of [
      '/aluno/conquistas',
      '/ranking',
      '/aluno/quiz',
      '/perfis/student',
      '/perfil/editar',
    ]) {
      await page.goto(route)
      await page.evaluate((theme) => {
        localStorage.setItem('puclim.theme', theme)
        window.dispatchEvent(new Event('puclim:theme'))
      }, theme)
      await expect(page.locator('.merit-page h1')).toBeVisible()
      await page.addStyleTag({ content: 'html { font-size: 130%; }' })
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        route,
      ).toBeTruthy()
    }
})

for (const width of [360, 390, 768, 1280])
  for (const theme of ['light', 'dark']) {
    test(`quiz visual em andamento e resultado ${width} ${theme}`, async ({
      page,
    }, testInfo) => {
      await mockGame(page)
      await page.setViewportSize({ width, height: 900 })
      await page.addInitScript(
        (theme) => localStorage.setItem('puclim.theme', theme),
        theme,
      )
      const errors: string[] = []
      page.on('pageerror', (error) => errors.push(error.message))
      page.on('console', (message) => {
        if (message.type() === 'error') errors.push(message.text())
      })
      await page.goto('/aluno/quiz')
      await page.getByRole('button', { name: 'Iniciar quiz de hoje' }).click()
      await expect(page.locator('.quiz-session')).toBeVisible()
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBeTruthy()
      if (width < 768) {
        await expect(page.locator('.mobile-bottom-nav')).toHaveAttribute(
          'inert',
          '',
        )
        expect(
          await page
            .locator('.quiz-session button, .quiz-option')
            .evaluateAll((elements) =>
              elements.every(
                (element) => element.getBoundingClientRect().height >= 44,
              ),
            ),
        ).toBeTruthy()
      }
      await page.screenshot({
        path: testInfo.outputPath(`quiz-ativo-${width}-${theme}.png`),
        fullPage: true,
        animations: 'disabled',
      })
      for (let index = 0; index < 5; index++) {
        await page.getByRole('radio').first().check()
        if (index < 4)
          await page.getByRole('button', { name: 'Próxima pergunta' }).click()
      }
      await page
        .getByRole('button', { name: 'Concluir quiz', exact: true })
        .click()
      await expect(page.locator('.quiz-result')).toBeVisible()
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBeTruthy()
      expect(errors).toEqual([])
      await page.screenshot({
        path: testInfo.outputPath(`quiz-resultado-${width}-${theme}.png`),
        fullPage: true,
        animations: 'disabled',
      })
    })
  }

test('falha da API não cria conquistas nem ativa demonstração', async ({
  page,
}) => {
  await mockGame(page)
  await page.route(
    (url) => url.pathname === '/api/gamificacao/perfil',
    (route) =>
      route.fulfill({
        status: 503,
        json: { message: 'Progresso temporariamente indisponível.' },
      }),
  )
  await page.goto('/aluno/conquistas')
  await expect(page.getByRole('alert')).toContainText(
    'Progresso temporariamente indisponível.',
  )
  await expect(page.locator('.achievement-card')).toHaveCount(0)
  await expect(
    page.getByRole('button', { name: 'Tentar novamente', exact: false }),
  ).toBeVisible()
  expect(
    await page.evaluate(() =>
      Object.keys(localStorage).some((key) => key.startsWith('puclim.demo')),
    ),
  ).toBeFalsy()
})
