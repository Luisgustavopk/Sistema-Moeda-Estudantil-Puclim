import { historyJson, fulfillHistory } from './history-fixture'
import { test, expect, type Page } from '@playwright/test'
import { mockDesignReview } from './design-round1-fixture'
import { student } from './gamification-fixture'
import { readFile, writeFile } from 'node:fs/promises'

const evidence = '../docs/evidencias/implementacao-interface-2026-11-03'
const phase = process.env.EVIDENCE_PHASE || 'after'
async function capture(page: Page, name: string) {
  await page.evaluate(() => document.fonts.ready)
  await page.locator('img').evaluateAll(async (nodes) => {
    await Promise.all(
      nodes.map(async (node) => {
        if (!(node instanceof HTMLImageElement)) return
        node.loading = 'eager'
        await node.decode().catch(() => {})
      }),
    )
  })
  await page.screenshot({
    path: `${evidence}/${phase}-${name}.png`,
    fullPage: true,
    animations: 'disabled',
  })
}
async function setup(page: Page, role = 'ALUNO', balance = 180) {
  await mockDesignReview(page, role)
  await page.route(
    (url) => url.pathname === '/api/auth/session',
    (route) =>
      route.fulfill({
        json: {
          ...student,
          role,
          balance,
          address: 'Rua do Campus, 123',
          partnerKind: role === 'EMPRESA' ? 'ENSINO' : undefined,
        },
      }),
  )
  await page.route(
    (url) => url.pathname === '/api/vantagens',
    (route) =>
      route.fulfill({
        json: historyJson(route, [
          {
            id: 'coffee',
            companyId: 'company',
            companyName: 'Café do Campus',
            name: 'Café e pão de queijo',
            description: 'Uma pausa no campus.',
            cost: 70,
            photo: '/images/coffee.jpg',
            active: true,
          },
          {
            id: 'books',
            companyId: 'company',
            companyName: 'Livraria Horizonte',
            name: 'Desconto em material de estudo',
            description: 'Materiais para aprender.',
            cost: 120,
            photo: '/images/books.jpg',
            active: true,
          },
        ]),
      }),
  )
  await page.route(
    (url) => url.pathname === '/api/conta/extrato',
    (route) =>
      route.fulfill({
        json: historyJson(route, [
          {
            id: 'one',
            kind: 'RECEBIMENTO',
            description: 'Reconhecimento',
            reason: 'Colaboração na revisão do projeto de acessibilidade',
            counterpart: 'Helena Prado',
            amount: 150,
            date: '2026-11-03T12:00:00Z',
          },
          {
            id: 'two',
            kind: 'RECEBIMENTO',
            description: 'Reconhecimento',
            reason: 'Apoio aos colegas no laboratório',
            counterpart: 'Rafael Almeida',
            amount: 100,
            date: '2026-11-02T12:00:00Z',
          },
          {
            id: 'three',
            kind: 'RESGATE',
            description: 'Resgate de café e pão de queijo',
            counterpart: 'Café do Campus',
            amount: -70,
            date: '2026-11-01T12:00:00Z',
          },
        ]),
      }),
  )
}
const fund = {
  semester: '2026-2',
  allocation: 1000,
  balance: 900,
  reserved: 0,
  origin: 'Orçamento autorizado de teste',
  movements: [
    {
      kind: 'DOTACAO',
      amount: 1000,
      sourceKey: 'test',
      date: '2026-11-03T12:00:00Z',
    },
  ],
  payments: [],
  winners: [],
}
async function setupFund(page: Page) {
  await setup(page, 'EMPRESA')
  await page.route(
    (url) => /^\/api\/gamificacao\/fundo\/[^/]+$/.test(url.pathname),
    (route) =>
      route.fulfill({
        json: {
          ...fund,
          semester: new URL(route.request().url()).pathname.split('/').at(-1),
        },
      }),
  )
}
test('P1 F01 saldo integral em 320 px', async ({ page }) => {
  await setup(page, 'ALUNO', 999999999)
  await page.setViewportSize({ width: 320, height: 900 })
  await page.goto('/aluno')
  const value = page.locator('.balance-number')
  await expect(value).toHaveText('999.999.999')
  await page.evaluate(() => document.fonts.ready)
  await capture(page, 'saldo-320')
  expect(
    await value.evaluate((node) => {
      const range = document.createRange()
      range.selectNodeContents(node)
      const text = range.getBoundingClientRect()
      const box = node.getBoundingClientRect()
      return text.right <= box.right + 1 && text.left >= box.left - 1
    }),
  ).toBe(true)
})
test('P1 F02 mensagens curtas integralmente acessíveis', async ({ page }) => {
  await setup(page)
  await page.setViewportSize({ width: 320, height: 900 })
  await page.goto('/notificacoes')
  const message = page
    .locator('.expandable-message')
    .filter({ hasText: 'Seu esforço virou conquista' })
    .first()
  await expect(message).toBeVisible()
  await capture(page, 'notificacoes-320')
  const clipped = await message
    .locator('p')
    .evaluate((node) => node.scrollHeight > node.clientHeight + 1)
  if (clipped) {
    await message.getByRole('button', { name: 'Ler mensagem completa' }).click()
    expect(
      await message
        .locator('p')
        .evaluate((node) => node.scrollHeight <= node.clientHeight + 1),
    ).toBe(true)
  }
  const second = page
    .locator('.expandable-message')
    .filter({ hasText: 'Você alcançou o nível 3' })
    .first()
  if (
    await second
      .locator('p')
      .evaluate((node) => node.scrollHeight > node.clientHeight + 1)
  ) {
    await second.getByRole('button', { name: 'Ler mensagem completa' }).click()
    expect(
      await second
        .locator('p')
        .evaluate((node) => node.scrollHeight <= node.clientHeight + 1),
    ).toBe(true)
  }
  await page.setViewportSize({ width: 1440, height: 1000 })
  await expect(message.getByRole('button')).toHaveCount(0)
})
test('P1 F03 ações do Fundo sem overflow', async ({ page }) => {
  await setupFund(page)
  await page.setViewportSize({ width: 320, height: 900 })
  await page.goto('/empresa/fundo')
  await expect(
    page.getByRole('button', { name: 'Reprocessar pagamentos pendentes' }),
  ).toBeVisible()
  await capture(page, 'fundo-320')
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(320)
})
test('P1 F04 menu móvel contém foco e restaura acionador', async ({ page }) => {
  await setup(page)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/notificacoes')
  await page.getByRole('button', { name: 'Abrir menu' }).click()
  await capture(page, 'menu-390')
  for (let i = 0; i < 22; i++) {
    await page.keyboard.press('Tab')
    expect(
      await page.evaluate(
        () => !!document.activeElement?.closest('#menu-lateral'),
      ),
    ).toBe(true)
  }
  await page.keyboard.press('Escape')
  await expect(page.getByRole('button', { name: 'Abrir menu' })).toBeFocused()
})
test('P1 F05 falhas independentes sem zeros fictícios', async ({ page }) => {
  await setup(page)
  await page.route(
    (url) => ['/api/conta/extrato', '/api/cupons'].includes(url.pathname),
    (route) =>
      route.fulfill({
        status: 503,
        json: { message: 'Serviço indisponível. Tente novamente.' },
      }),
  )
  await page.goto('/aluno')
  await expect(page.locator('.query-error').first()).toBeVisible()
  await capture(page, 'falha-1440')
  await expect(
    page.locator('.stat-card').filter({ hasText: 'Pucoins recebidos' }),
  ).toContainText('Indisponível')
  await expect(
    page.locator('.stat-card').filter({ hasText: 'Cupons disponíveis' }),
  ).toContainText('Indisponível')
  await expect(
    page.locator('.stat-card').filter({ hasText: 'Vantagens no catálogo' }),
  ).toContainText('2')
})
// Resolve color-mix/alpha through canvas, then composite against the actual ancestors.
async function contrast(page: Page, selector: string) {
  return page
    .locator(selector)
    .first()
    .evaluate((node) => {
      const ctx = document.createElement('canvas').getContext('2d')!
      function rgba(color: string) {
        ctx.clearRect(0, 0, 1, 1)
        ctx.fillStyle = color
        ctx.fillRect(0, 0, 1, 1)
        return [...ctx.getImageData(0, 0, 1, 1).data].map((v, i) =>
          i === 3 ? v / 255 : v,
        )
      }
      function blend(a: number[], b: number[]): number[] {
        return [0, 1, 2].map((i) => a[i] * a[3] + b[i] * (1 - a[3])).concat(1)
      }
      function background(el: Element | null): number[] {
        return el
          ? blend(
              rgba(getComputedStyle(el).backgroundColor),
              background(el.parentElement),
            )
          : [255, 255, 255, 1]
      }
      function luminance(c: number[]) {
        return c
          .slice(0, 3)
          .map((v) => v / 255)
          .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
          .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0)
      }
      function ratio(a: number[], b: number[]) {
        const x = luminance(a),
          y = luminance(b)
        return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)
      }
      const style = getComputedStyle(node),
        bg = background(node),
        outer = background(node.parentElement)
      const border = blend(rgba(style.borderTopColor), bg)
      return {
        border: ratio(border, bg),
        boundary: ratio(border, outer),
        text: ratio(blend(rgba(style.color), bg), bg),
        focus: ratio(blend(rgba(style.outlineColor), outer), outer),
        colors: {
          border: style.borderTopColor,
          background: style.backgroundColor,
          text: style.color,
        },
      }
    })
}
test('P1 F06 contraste de campo e foco nos dois temas', async ({ page }) => {
  await setup(page)
  await page.goto('/perfil')
  await expect(page.locator('#profile-name')).toBeVisible()
  const measurements = []
  for (const theme of ['light', 'dark']) {
    if (theme === 'dark')
      await page.getByRole('button', { name: 'Ativar modo escuro' }).click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
    const pair = await contrast(page, '#profile-name')
    const measurement = {
      theme,
      ...pair,
      buttonText: (await contrast(page, '.account-settings .button-primary'))
        .text,
      secondaryText: (await contrast(page, '.settings-section-heading p')).text,
    }
    measurements.push(measurement)
    await capture(page, `conta-${theme}-1440`)
    expect(
      pair.border,
      JSON.stringify({ theme, ...pair }),
    ).toBeGreaterThanOrEqual(3)
    expect(pair.boundary).toBeGreaterThanOrEqual(3)
    expect(pair.text).toBeGreaterThanOrEqual(4.5)
    await page.locator('#profile-name').focus()
    measurement.focus = (await contrast(page, '#profile-name')).focus
    expect(measurement.focus).toBeGreaterThanOrEqual(3)
    expect(measurement.buttonText).toBeGreaterThanOrEqual(4.5)
    expect(measurement.secondaryText).toBeGreaterThanOrEqual(4.5)
    await page.locator('#profile-name').blur()
  }
  await test.info().attach('contraste', {
    body: JSON.stringify(measurements, null, 2),
    contentType: 'application/json',
  })
  await writeFile(
    `${evidence}/${phase}-contraste.json`,
    JSON.stringify(measurements, null, 2),
  )
})

test('F07 edição protegida, cancelar preserva e salvar limpa', async ({
  page,
}) => {
  await setup(page)
  await page.route(
    (url) => url.pathname === '/api/conta/perfil',
    (route) =>
      route.fulfill({
        json: { ...student, ...route.request().postDataJSON() },
      }),
  )
  await page.goto('/perfil')
  await page
    .locator('.sidebar')
    .getByRole('link', { name: 'Meu extrato', exact: true })
    .click()
  await expect(page).toHaveURL(/\/aluno\/extrato$/)
  await page
    .locator('.sidebar')
    .getByRole('link', { name: 'Minha conta', exact: true })
    .click()
  await page.getByLabel('Nome completo').fill('Mariana Costa Atualizada')
  await page
    .locator('.sidebar')
    .getByRole('link', { name: 'Meu extrato', exact: true })
    .click()
  await expect(
    page.getByRole('dialog', { name: 'Sair sem salvar?' }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Continuar aqui' }).click()
  await expect(page.getByLabel('Nome completo')).toHaveValue(
    'Mariana Costa Atualizada',
  )
  await page.getByRole('button', { name: 'Salvar alterações' }).click()
  await expect(page.getByText('Seus dados foram atualizados.')).toBeVisible()
  await page
    .locator('.sidebar')
    .getByRole('link', { name: 'Meu extrato', exact: true })
    .click()
  await expect(page).toHaveURL(/\/aluno\/extrato$/)
  await expect(
    page.getByRole('heading', { name: 'Meu extrato', exact: true }),
  ).toBeFocused()
  await expect(page).toHaveTitle('Meu extrato · Puclim')
})

test('F07 senha pendente também protege a saída', async ({ page }) => {
  await setup(page)
  await page.goto('/perfil')
  await page.getByLabel('Nova senha', { exact: true }).fill('SenhaDeTeste123')
  await page
    .locator('.sidebar')
    .getByRole('link', { name: 'Meu extrato', exact: true })
    .click()
  await expect(
    page.getByRole('dialog', { name: 'Sair sem salvar?' }),
  ).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByLabel('Nova senha', { exact: true })).toHaveValue(
    'SenhaDeTeste123',
  )
})

test('F08 e F09 falha persistente, recuperação e semestre explícito', async ({
  page,
}) => {
  await setupFund(page)
  let fail = true
  await page.route(
    (url) => url.pathname.endsWith('/reprocessar'),
    (route) =>
      fail
        ? route.fulfill({
            status: 503,
            json: { message: 'Não foi possível reprocessar. Tente novamente.' },
          })
        : route.fulfill({ status: 204 }),
  )
  await page.goto('/empresa/fundo')
  await expect(page.getByLabel('Semestre do Fundo')).toHaveValue('2026-2')
  await page.getByLabel('Semestre do Fundo').fill('2026-3')
  await expect(
    page.getByText('Informe um semestre no formato AAAA-1 ou AAAA-2.'),
  ).toBeVisible()
  await page.getByLabel('Semestre do Fundo').fill('2026-1')
  await expect(
    page.getByRole('heading', { name: 'Semestre 2026-1', exact: true }),
  ).toBeVisible()
  await page
    .getByRole('button', { name: 'Reprocessar pagamentos pendentes' })
    .click()
  await expect(page.locator('.fund-operations .notice-error')).toContainText(
    'Não foi possível reprocessar',
  )
  await expect(page.locator('.toast-alert .lucide-circle-alert')).toBeVisible()
  await page.clock.fastForward(7000)
  await expect(page.locator('.toast-alert')).toBeVisible()
  await page.getByRole('button', { name: 'Fechar aviso' }).click()
  await expect(page.locator('.fund-operations .notice-error')).toBeVisible()
  fail = false
  await page
    .getByRole('button', { name: 'Reprocessar pagamentos pendentes' })
    .click()
  await expect(page.locator('.fund-operations .notice-error')).toHaveCount(0)
  await expect(
    page.getByText('Recompensas pendentes reprocessadas.'),
  ).toBeVisible()
})

test('F12 revisão da dotação imutável e proteção de duplo envio', async ({
  page,
}) => {
  await setupFund(page)
  let allocated = false,
    requests = 0
  await page.route(
    (url) => url.pathname === '/api/gamificacao/fundo/2026-2',
    (route) =>
      route.fulfill({
        json: {
          ...fund,
          allocation: allocated ? 500 : 0,
          balance: allocated ? 500 : 0,
          origin: allocated ? 'Autorização de teste' : null,
        },
      }),
  )
  await page.route(
    (url) => url.pathname.endsWith('/dotacao'),
    async (route) => {
      requests++
      expect(route.request().postDataJSON()).toEqual({
        amount: 500,
        origin: 'Autorização de teste',
      })
      await new Promise((resolve) => setTimeout(resolve, 300))
      allocated = true
      await route.fulfill({ json: { ...fund, allocation: 500, balance: 500 } })
    },
  )
  await page.goto('/empresa/fundo')
  await page.getByLabel('Valor da dotação').fill('500')
  await page
    .getByLabel('Origem e autorização do orçamento')
    .fill('Autorização de teste')
  await page
    .getByRole('button', { name: 'Revisar dotação', exact: true })
    .click()
  const dialog = page.getByRole('dialog', { name: 'Revisar dotação semestral' })
  await expect(dialog).toContainText('2026-2')
  await expect(dialog).toContainText('500 moedas')
  await expect(dialog).toContainText('Autorização de teste')
  expect(requests).toBe(0)
  await dialog.getByRole('button', { name: 'Voltar à edição' }).click()
  await expect(page.getByLabel('Valor da dotação')).toHaveValue('500')
  await page
    .getByRole('button', { name: 'Revisar dotação', exact: true })
    .click()
  await dialog
    .getByRole('button', { name: 'Registrar dotação', exact: true })
    .evaluate((button: HTMLButtonElement) => {
      button.click()
      button.click()
    })
  await expect(dialog).toHaveCount(0)
  expect(requests).toBe(1)
  await expect(page.getByText('Dotação semestral registrada.')).toBeVisible()
})

test('F10 e F13 extrato com 120 registros, filtros, totais e CSV completo', async ({
  page,
}) => {
  await setup(page)
  await page.route(
    (url) => url.pathname.startsWith('/api/conta/extrato'),
    (route) =>
      fulfillHistory(
        route,
        Array.from({ length: 120 }, (_, i) => ({
          id: String(i),
          kind: 'RECEBIMENTO',
          amount: 10,
          date: '2026-11-03T12:00:00Z',
          description: `Reconhecimento ${i + 1}`,
          counterpart: 'Helena Prado',
        })),
      ),
  )
  await page.goto('/aluno/extrato')
  await expect(page.locator('main .row')).toHaveCount(12)
  await expect(page.getByText('1–12 de 120')).toBeVisible()
  await expect(
    page
      .locator('.stat-card')
      .filter({ hasText: 'Entradas no período filtrado' }),
  ).toContainText('1.200')
  await expect(
    page
      .locator('.stat-card')
      .filter({ hasText: 'Saídas no período filtrado' }),
  ).not.toContainText('−0')
  const downloadEvent = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Baixar extrato' }).click()
  const download = await downloadEvent
  expect(
    (await readFile((await download.path())!, 'utf8')).trim().split('\r\n'),
  ).toHaveLength(121)
  await page.getByRole('button', { name: 'Próxima página' }).click()
  await expect(page.getByText('13–24 de 120')).toBeVisible()
  await page
    .getByRole('textbox', { name: 'Buscar movimentação' })
    .fill('Reconhecimento 120')
  await expect(page.locator('main .row')).toHaveCount(1)
  await expect(
    page
      .locator('.stat-card')
      .filter({ hasText: 'Entradas no período filtrado' }),
  ).toContainText('10')
  expect(
    await page
      .locator('.amount')
      .evaluate((node) => getComputedStyle(node).fontVariantNumeric),
  ).toBe('tabular-nums')
})

test('F14 cupons do parceiro distinguem Disponível, Utilizado e Doado', async ({
  page,
}) => {
  await setup(page, 'EMPRESA')
  await page.route(
    (url) => url.pathname === '/api/auth/session',
    (route) =>
      route.fulfill({
        json: { ...student, role: 'EMPRESA', partnerKind: 'EMPRESA' },
      }),
  )
  await page.route(
    (url) => url.pathname === '/api/cupons',
    (route) =>
      route.fulfill({
        json: historyJson(
          route,
          ['VALIDO', 'UTILIZADO', 'DOADO'].map((status, i) => ({
            id: String(i),
            code: `TESTE-${i}`,
            status,
            advantageName: `Vantagem ${i}`,
            studentName: student.name,
            date: '2026-11-03T12:00:00Z',
          })),
        ),
      }),
  )
  await page.goto('/empresa')
  await expect(
    page.locator('.row').filter({ hasText: 'Vantagem 2' }),
  ).toContainText('Doado')
  await expect(
    page.locator('.row').filter({ hasText: 'Vantagem 1' }),
  ).toContainText('Utilizado')
  await expect(
    page.locator('.row').filter({ hasText: 'Vantagem 0' }),
  ).toContainText('Disponível')
  await expect(
    page.locator('.stat-card').filter({ hasText: 'Cupons utilizados' }),
  ).toContainText('1')
})

test('F05 carregamento, atualização com cache e recuperação independente', async ({
  page,
}) => {
  await setup(page)
  let fail = false
  let release: () => void = () => {}
  const pending = new Promise<void>((resolve) => {
    release = resolve
  })
  await page.route(
    (url) => url.pathname === '/api/cupons',
    async (route) => {
      await pending
      await route.fulfill(
        fail
          ? { status: 503, json: { message: 'Falha de teste' } }
          : { json: historyJson(route, [{ id: 'coupon', status: 'VALIDO' }]) },
      )
    },
  )
  await page.goto('/aluno')
  const coupons = page
    .locator('.stat-card')
    .filter({ hasText: 'Cupons disponíveis' })
  await expect(coupons).toContainText('Carregando…')
  release()
  await expect(coupons.locator('.stat-value')).toHaveText('1')
  fail = true
  await page.evaluate(() => window.dispatchEvent(new Event('storage')))
  await expect(coupons).toContainText('Último valor confirmado')
  await expect(coupons.locator('.stat-value')).toHaveText('1')
  await expect(
    page
      .locator('.stat-card')
      .filter({ hasText: 'Vantagens no catálogo' })
      .locator('.stat-value'),
  ).toHaveText('2')
  fail = false
  await coupons.getByRole('button', { name: 'Atualizar indicador' }).click()
  await expect(coupons).not.toContainText('Último valor confirmado')
  await expect(coupons.locator('.stat-value')).toHaveText('1')
})

test('F01 extremos inteiros seguros e navegação móvel após seleção e resize', async ({
  page,
}) => {
  let balance = 0
  await setup(page)
  await page.route(
    (url) => url.pathname === '/api/auth/session',
    (route) => route.fulfill({ json: { ...student, balance } }),
  )
  await page.setViewportSize({ width: 320, height: 900 })
  for (const value of [0, 1000000000, Number.MAX_SAFE_INTEGER]) {
    balance = value
    await page.goto('/aluno')
    await expect(page.locator('.balance-number')).toHaveText(
      value.toLocaleString('pt-BR'),
    )
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(320)
    expect(
      await page
        .locator('.balance-number')
        .evaluate((node) => node.scrollWidth <= node.clientWidth + 1),
    ).toBe(true)
  }
  await page.getByRole('button', { name: 'Abrir menu' }).click()
  await page
    .getByRole('dialog', { name: 'Menu principal' })
    .getByRole('link', { name: 'Meu extrato', exact: true })
    .click()
  await expect(
    page.getByRole('heading', { name: 'Meu extrato', exact: true }),
  ).toBeFocused()
  await page.getByRole('button', { name: 'Abrir menu' }).click()
  await page.setViewportSize({ width: 768, height: 1000 })
  await expect(
    page.getByRole('dialog', { name: 'Menu principal' }),
  ).toHaveCount(0)
  await expect(page.locator('.sidebar')).toBeVisible()
})

for (const width of [1440, 768, 390, 320])
  for (const theme of ['light', 'dark']) {
    test(`visual prioritária ${width} ${theme}`, async ({ page }) => {
      test.setTimeout(90000)
      await setup(page)
      await page.addInitScript(
        (theme) => localStorage.setItem('puclim.theme', theme),
        theme,
      )
      await page.setViewportSize({ width, height: 1000 })
      const errors: string[] = []
      page.on('pageerror', (error) => errors.push(error.message))
      for (const [route, marker, name] of [
        ['/aluno', '.balance-number', 'dashboard'],
        ['/aluno/extrato', '.row', 'extrato'],
        ['/perfil', '#profile-name', 'conta'],
        ['/notificacoes', '.notice-item', 'notificacoes'],
      ]) {
        await page.goto(route)
        await expect(page.locator(marker).first()).toBeVisible()
        await page.evaluate(() => document.fonts.ready)
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth),
          route,
        ).toBeLessThanOrEqual(width)
        if (name === 'dashboard' || width === 320 || width === 1440)
          await capture(page, `${name}-${theme}-${width}`)
      }
      await setupFund(page)
      await page.goto('/empresa/fundo')
      await expect(
        page.getByRole('heading', { name: 'Semestre 2026-2', exact: true }),
      ).toBeVisible()
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(width)
      if (width === 320 || width === 1440)
        await capture(page, `fundo-${theme}-${width}`)
      expect(errors).toEqual([])
    })
  }

for (const width of [1440, 390])
  for (const theme of ['light', 'dark']) {
    test(`consistência da gamificação ${width} ${theme}`, async ({ page }) => {
      test.setTimeout(90000)
      await setup(page)
      await page.addInitScript(
        (theme) => localStorage.setItem('puclim.theme', theme),
        theme,
      )
      await page.setViewportSize({ width, height: 1000 })
      for (const [route, name] of [
        ['/aluno/conquistas', 'conquistas'],
        ['/ranking', 'ranking'],
        ['/aluno/quiz', 'quiz'],
        ['/aluno/missoes', 'missoes'],
        ['/aluno/recompensas', 'recompensas'],
        ['/aluno/catalogo', 'catalogo'],
      ]) {
        await page.goto(route)
        await expect(page.locator('h1')).toBeVisible()
        await page.evaluate(() => document.fonts.ready)
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth),
          route,
        ).toBeLessThanOrEqual(width)
        await capture(page, `${name}-${theme}-${width}`)
      }
    })
  }

test('notificações com 25 registros, filtro e leitura preservados', async ({
  page,
}) => {
  await setup(page)
  const notices = Array.from({ length: 25 }, (_, i) => ({
    id: `notice-${i}`,
    type: 'MISSION',
    title: `Atividade ${i + 1}`,
    message: 'Uma atualização de teste sobre sua participação na comunidade.',
    date: '2026-11-03T12:00:00Z',
    readAt: i % 2 === 0 ? null : '2026-11-03T12:00:00Z',
    referenceId: null,
  }))
  await page.route(
    (url) => url.pathname.startsWith('/api/gamificacao/notificacoes'),
    (route) => {
      if (route.request().method() === 'POST') {
        const id = new URL(route.request().url()).pathname.split('/').at(-2)
        notices.find((n) => n.id === id)!.readAt = '2026-11-03T13:00:00Z'
        return route.fulfill({ status: 204 })
      }
      return route.fulfill({ json: notices })
    },
  )
  await page.goto('/notificacoes')
  await expect(page.locator('.notice-item')).toHaveCount(8)
  await expect(page.getByText('1–8 de 25')).toBeVisible()
  await page.getByRole('button', { name: 'Próxima página' }).click()
  await expect(page.getByText('9–16 de 25')).toBeVisible()
  await page.getByRole('button', { name: 'Não lidas (13)' }).click()
  await expect(page.getByText('1–8 de 13')).toBeVisible()
  await page.getByRole('button', { name: 'Marcar como lida' }).first().click()
  await expect(
    page.getByRole('button', { name: 'Não lidas (12)' }),
  ).toBeVisible()
})

test('redução de movimento mantém dados e controles; ampliação de texto a 200%', async ({
  page,
}) => {
  await setup(page)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.setViewportSize({ width: 1440, height: 1000 })
  for (const route of [
    '/aluno',
    '/aluno/extrato',
    '/perfil',
    '/notificacoes',
  ]) {
    await page.goto(route)
    await expect(page.locator('h1')).toBeVisible()
    await page.addStyleTag({ content: 'html { font-size: 200%; }' })
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
      route,
    ).toBeLessThanOrEqual(1440)
    expect(
      await page.evaluate(
        () =>
          document.getAnimations().filter((a) => a.playState === 'running')
            .length,
      ),
    ).toBe(0)
  }
})

test('comparativo imutável de materiais e conteúdo', async ({ page }) => {
  test.setTimeout(120000)
  await setup(page)
  for (const theme of ['light', 'dark'])
    for (const width of [1440, 390]) {
      await page.addInitScript(
        (theme) => localStorage.setItem('puclim.theme', theme),
        theme,
      )
      await page.setViewportSize({ width, height: 1000 })
      await page.goto('/aluno')
      await expect(page.locator('.balance-number')).toHaveText('180')
      await capture(page, `comparativo-dashboard-${theme}-${width}`)
    }
})

test('resgate preserva revisão, idempotência e envio único no clique duplo', async ({
  page,
}) => {
  await setup(page)
  let requests = 0
  let release: () => void = () => {}
  const pending = new Promise<void>((resolve) => {
    release = resolve
  })
  await page.route(
    (url) => url.pathname === '/api/vantagens/coffee/resgates',
    async (route) => {
      requests++
      expect(route.request().headers()['idempotency-key']).toMatch(
        /^[\da-f-]{36}$/i,
      )
      await pending
      await route.fulfill({
        json: {
          id: 'coupon-test',
          code: 'PCL-TESTE',
          advantageId: 'coffee',
          advantageName: 'Café e pão de queijo',
          companyName: 'Café do Campus',
          cost: 70,
          status: 'VALIDO',
          date: '2026-11-03T12:00:00Z',
        },
      })
    },
  )
  await page.goto('/aluno/catalogo')
  await page
    .getByRole('button', { name: 'Ver detalhes', exact: true })
    .first()
    .click()
  await page
    .getByRole('button', { name: 'Quero resgatar', exact: true })
    .click()
  const dialog = page.getByRole('dialog')
  await expect(
    dialog.locator('.summary-line').filter({ hasText: 'Saldo após o resgate' }),
  ).toContainText('110 Pucoins')
  await capture(page, 'revisao-resgate-1440')
  await dialog
    .getByRole('button', { name: 'Confirmar resgate', exact: true })
    .evaluate((button: HTMLButtonElement) => {
      button.click()
      button.click()
    })
  await expect.poll(() => requests).toBe(1)
  await page.keyboard.press('Escape')
  await expect(dialog).toBeVisible()
  release()
  await expect(dialog).toContainText('Sua conquista virou vantagem!')
  await expect(dialog).toContainText('PCL-TESTE')
  expect(requests).toBe(1)
})
