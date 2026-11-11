import { expect, test, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { mockGame, student } from './gamification-fixture'
import { fulfillHistory, historyJson, historyParams } from './history-fixture'
import type { Coupon, Transaction } from '../src/shared/types/domain'

const transactions: Transaction[] = Array.from({ length: 125 }, (_, i) => ({
  id: String(i).padStart(3, '0'),
  date: '2026-11-03T12:00:00Z',
  kind: 'RECEBIMENTO',
  amount: 10,
  description: `Reconhecimento ${i}`,
  counterpart: 'Helena Prado',
  reason: 'Projeto do campus',
}))
const coupons: Coupon[] = Array.from({ length: 29 }, (_, i) => ({
  id: String(i).padStart(3, '0'),
  code: `CODE-${String(i).padStart(3, '0')}`,
  advantageId: 'coffee',
  companyId: 'company',
  companyName: 'Café do campus',
  studentId: student.id,
  studentName: student.name,
  advantageName: `Vantagem ${i}`,
  cost: 10,
  date: '2026-11-03T12:00:00Z',
  status: i < 13 ? 'VALIDO' : 'UTILIZADO',
}))

async function setup(page: Page, role = 'ALUNO') {
  await mockGame(page, role)
  page.on('pageerror', (error) => {
    throw error
  })
  const requests: URL[] = []
  await page.route(
    (url) => url.pathname.startsWith('/api/conta/extrato'),
    (route) => {
      requests.push(new URL(route.request().url()))
      return fulfillHistory(route, transactions)
    },
  )
  return requests
}
async function noOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true)
}

for (const width of [390, 820, 1440]) {
  test(`extrato pagina e filtra na API, mantém totais globais e exporta todos os resultados em ${width}px`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 1000 })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    const requests = await setup(page)
    await page.goto('/aluno/extrato')
    await expect(page.locator('main .row')).toHaveCount(12)
    await expect(page.getByText('1–12 de 125')).toBeVisible()
    await expect(
      page
        .locator('.stat-card')
        .filter({ hasText: 'Entradas no período filtrado' }),
    ).toContainText('1.250')
    expect(requests.at(-1)?.searchParams.get('size')).toBe('12')
    await page.getByRole('button', { name: 'Próxima página' }).click()
    await expect(page.getByText('13–24 de 125')).toBeVisible()
    expect(requests.at(-1)?.searchParams.get('page')).toBe('1')
    await page
      .getByRole('textbox', { name: 'Buscar movimentação' })
      .fill('Reconhecimento 124')
    await expect(page.locator('main .row')).toHaveCount(1)
    expect(requests.at(-1)?.searchParams.get('q')).toBe('Reconhecimento 124')
    expect(requests.at(-1)?.searchParams.get('page')).toBe('0')
    await expect(
      page
        .locator('.stat-card')
        .filter({ hasText: 'Entradas no período filtrado' }),
    ).toContainText('+10')
    await page.locator('#from').fill('2026-11-01')
    await page.locator('#to').fill('2026-11-05')
    await expect
      .poll(() => requests.at(-1)?.searchParams.get('to'))
      .toBe('2026-11-05')
    expect(requests.at(-1)?.searchParams.get('from')).toBe('2026-11-01')
    expect(requests.at(-1)?.searchParams.get('zone')).toBeTruthy()
    const event = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Baixar extrato' }).click()
    const download = await event
    expect(
      (await readFile((await download.path())!, 'utf8')).trim().split('\r\n'),
    ).toHaveLength(2)
    expect(requests.at(-1)?.pathname).toBe('/api/conta/extrato/exportar')
    await noOverflow(page)
    await page.screenshot({
      path: info.outputPath('extrato-claro.png'),
      fullPage: true,
    })
    await page.getByRole('button', { name: 'Ativar modo escuro' }).click()
    await page.screenshot({
      path: info.outputPath('extrato-escuro.png'),
      fullPage: true,
    })
    await page.locator('#from').fill('2026-11-10')
    await expect(page.getByRole('alert')).toContainText('A data inicial')
    await expect(
      page.getByRole('button', { name: 'Baixar extrato' }),
    ).toBeDisabled()
    expect(
      requests.filter((url) => url.searchParams.get('from') === '2026-11-10'),
    ).toHaveLength(0)
  })
}

test('cupons do aluno enviam busca, status e página para a API e limpam os filtros', async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 390, height: 1000 })
  await setup(page)
  const requests: URL[] = []
  await page.route(
    (url) => url.pathname === '/api/cupons',
    (route) => {
      requests.push(new URL(route.request().url()))
      return route.fulfill({ json: historyJson(route, coupons) })
    },
  )
  await page.goto('/aluno/cupons')
  await expect(page.locator('.coupon-card')).toHaveCount(12)
  await expect(page.getByText('1–12 de 29')).toBeVisible()
  await page.getByRole('button', { name: 'Próxima página' }).click()
  await expect(page.getByText('13–24 de 29')).toBeVisible()
  await page.getByRole('button', { name: 'Disponíveis', exact: true }).click()
  await expect(page.getByText('1–12 de 13')).toBeVisible()
  expect(requests.at(-1)?.searchParams.get('status')).toBe('VALIDO')
  expect(requests.at(-1)?.searchParams.get('page')).toBe('0')
  await page.getByRole('textbox', { name: 'Buscar cupom' }).fill('CODE-000')
  await expect(page.locator('.coupon-card')).toHaveCount(1)
  expect(requests.at(-1)?.searchParams.get('q')).toBe('CODE-000')
  await noOverflow(page)
  await page.screenshot({
    path: info.outputPath('cupons-mobile.png'),
    fullPage: true,
  })
  await page.getByRole('button', { name: 'Limpar filtros' }).click()
  await expect(page.getByText('1–12 de 29')).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Todos', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('textbox', { name: 'Buscar cupom' })).toHaveValue(
    '',
  )
})

test('usar o último cupom da última página ajusta a página sem afetar a confirmação por código', async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 390, height: 1000 })
  await setup(page, 'EMPRESA')
  await page.route('**/api/auth/session', (route) =>
    route.fulfill({
      json: { ...student, role: 'EMPRESA', partnerKind: 'EMPRESA' },
    }),
  )
  const items = coupons.map((item) => ({ ...item }))
  const requests: URL[] = []
  await page.route(
    (url) => url.pathname === '/api/cupons',
    (route) => {
      requests.push(new URL(route.request().url()))
      return route.fulfill({ json: historyJson(route, items, false) })
    },
  )
  await page.route('**/api/cupons/**', (route) => {
    const url = new URL(route.request().url())
    const item = items.find((row) => row.code === url.pathname.split('/')[3])!
    if (url.pathname.endsWith('/utilizar')) item.status = 'UTILIZADO'
    return route.fulfill({ json: item })
  })
  await page.goto('/empresa/cupons')
  await page.getByRole('combobox', { name: 'Status dos resgates' }).click()
  await page.getByRole('option', { name: 'Disponíveis', exact: true }).click()
  await expect(page.getByText('1–12 de 13')).toBeVisible()
  await page.getByRole('button', { name: 'Próxima página' }).click()
  await expect(page.getByText('13–13 de 13')).toBeVisible()
  await page.getByRole('button', { name: 'Conferir', exact: true }).click()
  await page
    .getByRole('button', { name: 'Confirmar utilização', exact: true })
    .click()
  const dialog = page.getByRole('dialog', {
    name: 'Confirmar utilização do cupom?',
  })
  await expect(dialog).toBeVisible()
  await dialog
    .getByRole('button', { name: 'Confirmar utilização', exact: true })
    .click()
  await expect(dialog).toHaveCount(0)
  await expect(page.getByLabel('Código do cupom')).toBeFocused()
  await expect(
    page.getByRole('button', { name: 'Conferir', exact: true }),
  ).toHaveCount(12)
  await expect.poll(() => requests.at(-1)?.searchParams.get('page')).toBe('0')
  await noOverflow(page)
  await page.screenshot({
    path: info.outputPath('resgates-mobile.png'),
    fullPage: true,
  })
})

test('painel do professor pede cinco movimentos e usa indicadores globais devolvidos pelo servidor', async ({
  page,
}) => {
  const requests = await setup(page, 'PROFESSOR')
  await page.route(
    (url) => url.pathname === '/api/conta/extrato',
    (route) => {
      requests.push(new URL(route.request().url()))
      return route.fulfill({
        json: {
          items: [{ ...transactions[0], amount: -10, kind: 'ENVIO' }],
          page: 0,
          size: 5,
          total: 120,
          pages: 24,
          summary: { incoming: 0, outgoing: 9990, recognizedStudents: 35 },
        },
      })
    },
  )
  await page.goto('/professor')
  await expect(
    page
      .locator('.teacher-stat-card')
      .filter({ hasText: 'Pucoins distribuídos' }),
  ).toContainText('9.990')
  await expect(
    page
      .locator('.teacher-stat-card')
      .filter({ hasText: 'Alunos reconhecidos' }),
  ).toContainText('35')
  await expect(
    page.getByText('120 reconhecimentos registrados no seu extrato.'),
  ).toBeVisible()
  expect(requests.at(-1)?.searchParams.get('size')).toBe('5')
  expect(requests.at(-1)?.searchParams.get('kind')).toBe('ENVIO')
})

test('falha em uma página oferece nova tentativa e não altera os filtros pedidos', async ({
  page,
}) => {
  await setup(page)
  let failing = true
  await page.route(
    (url) => url.pathname === '/api/conta/extrato',
    (route) => {
      const query = historyParams(route.request().url())
      return failing && query.page === 1
        ? route.fulfill({
            status: 503,
            json: { message: 'Página temporariamente indisponível.' },
          })
        : fulfillHistory(route, transactions)
    },
  )
  await page.goto('/aluno/extrato')
  await page.getByRole('button', { name: 'Próxima página' }).click()
  await expect(page.getByRole('alert')).toContainText(
    'Página temporariamente indisponível.',
  )
  failing = false
  await page.getByRole('button', { name: 'Tentar novamente' }).click()
  await expect(page.getByText('13–24 de 125')).toBeVisible()
})
