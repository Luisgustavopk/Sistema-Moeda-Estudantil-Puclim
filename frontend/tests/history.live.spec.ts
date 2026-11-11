import {
  expect,
  test,
  type APIRequestContext,
  type Page,
} from '@playwright/test'
import { readFile } from 'node:fs/promises'
import type {
  Account,
  Coupon,
  CouponPage,
  ImportResult,
  StatementPage,
} from '../src/shared/types/domain'

const password = 'TesteHist@2026'
let sequence = 0
function documentNumber(cnpj = false) {
  const seed = String(Date.now() + sequence++).slice(-9)
  const digits = (cnpj ? `${seed}001` : seed).split('').map(Number)
  for (let round = 0; round < 2; round++) {
    let sum = 0
    if (cnpj) {
      let weight = 2
      for (let i = digits.length - 1; i >= 0; i--) {
        sum += digits[i] * weight
        weight = weight === 9 ? 2 : weight + 1
      }
    } else
      digits.forEach((digit, i) => {
        sum += digit * (digits.length + 1 - i)
      })
    digits.push(
      cnpj ? (sum % 11 < 2 ? 0 : 11 - (sum % 11)) : ((sum * 10) % 11) % 10,
    )
  }
  return digits.join('')
}
async function call<T>(
  context: APIRequestContext,
  method: string,
  path: string,
  data?: unknown,
): Promise<T> {
  await context.get('/api/auth/csrf')
  const csrf = (await context.storageState()).cookies.find(
    (cookie) => cookie.name === 'XSRF-TOKEN',
  )!.value
  const response = await context.fetch(`/api${path}`, {
    method,
    data,
    headers: {
      'X-XSRF-TOKEN': decodeURIComponent(csrf),
      'Idempotency-Key': crypto.randomUUID(),
    },
  })
  expect(response.ok(), `${path}: ${await response.text()}`).toBeTruthy()
  return response.status() === 204
    ? (undefined as T)
    : ((await response.json()) as T)
}
async function login(page: Page, name: string) {
  await page.goto('/login')
  await page.getByLabel('Login ou e-mail').fill(name)
  await page.getByLabel('Senha', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Entrar na minha conta' }).click()
  await expect(page).not.toHaveURL(/\/login$/)
}

test('históricos reais paginam, filtram, exportam e corrigem a última página após utilizar cupom', async ({
  page,
  request,
}, info) => {
  test.setTimeout(120000)
  const suffix = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`
  const partner = async (kind: string) => {
    const login = `${kind.toLowerCase()}${suffix}`
    const account = await call<Account>(request, 'POST', '/empresas', {
      name: `Histórico ${kind} ${suffix}`,
      login,
      email: `${login}@example.test`,
      password,
      cnpj: documentNumber(true),
      phone: '31999999999',
      description: 'Organização exclusiva do teste de paginação',
      partnerKind: kind,
    })
    return { ...account, login }
  }
  const institution = await partner('ENSINO')
  await call(request, 'POST', '/auth/login', {
    login: institution.login,
    password,
  })
  const teacherLogin = `prof${suffix}`
  const imported = await call<ImportResult>(
    request,
    'POST',
    '/instituicao/professores/importar',
    {
      rows: [
        {
          line: 1,
          name: `Professor Histórico ${suffix}`,
          cpf: documentNumber(),
          department: 'Computação',
          login: teacherLogin,
          email: `${teacherLogin}@example.test`,
        },
      ],
    },
  )
  const temporary = imported.access[0].temporaryPassword
  await call(request, 'POST', '/auth/login', {
    login: teacherLogin,
    password: temporary,
  })
  await call(request, 'PATCH', '/conta/senha', {
    currentPassword: temporary,
    password,
  })
  const studentLogin = `aluno${suffix}`
  const student = await call<Account>(request, 'POST', '/alunos', {
    name: `Aluno Histórico ${suffix}`,
    login: studentLogin,
    email: `${studentLogin}@example.test`,
    password,
    cpf: documentNumber(),
    address: 'Rua dos Testes, 123',
    course: 'Computação',
    institutionId: institution.id,
  })
  for (let i = 0; i < 15; i++)
    await call(request, 'POST', '/transferencias', {
      studentId: student.id,
      amount: 10,
      reason: `Histórico lote ${String(i).padStart(2, '0')}`,
    })
  const company = await partner('EMPRESA')
  await call(request, 'POST', '/auth/login', { login: company.login, password })
  const png = await page.evaluate(() => {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 64
    canvas.getContext('2d')!.fillRect(0, 0, 64, 64)
    return canvas.toDataURL('image/png').split(',')[1]
  })
  await request.get('/api/auth/csrf')
  const csrf = (await request.storageState()).cookies.find(
    (cookie) => cookie.name === 'XSRF-TOKEN',
  )!.value
  const upload = await request.post('/api/uploads/imagens', {
    headers: { 'X-XSRF-TOKEN': decodeURIComponent(csrf) },
    multipart: {
      file: {
        name: 'teste.png',
        mimeType: 'image/png',
        buffer: Buffer.from(png, 'base64'),
      },
    },
  })
  expect(upload.status()).toBe(201)
  const advantage = await call<{ id: string }>(request, 'POST', '/vantagens', {
    name: `Vantagem Histórico ${suffix}`,
    description: 'Resgate exclusivo de teste',
    photo: (await upload.json()).url,
    category: 'Descontos',
    cost: 1,
    active: true,
  })
  await call(request, 'POST', '/auth/login', { login: studentLogin, password })
  for (let i = 0; i < 13; i++)
    await call<Coupon>(
      request,
      'POST',
      `/vantagens/${advantage.id}/resgates`,
      {},
    )
  const snapshot = await call<StatementPage>(request, 'GET', '/conta/extrato')
  expect(snapshot.total).toBe(28)
  expect(snapshot.items).toHaveLength(12)
  expect(snapshot.summary).toMatchObject({ incoming: 150, outgoing: 13 })
  await login(page, studentLogin)
  await expect(
    page.locator('.stat-card').filter({ hasText: 'Cupons disponíveis' }),
  ).toContainText('13')
  await page.goto('/aluno/extrato')
  await expect(page.getByText('1–12 de 28')).toBeVisible()
  await page.getByRole('button', { name: 'Próxima página' }).click()
  await expect(page.getByText('13–24 de 28')).toBeVisible()
  await page.getByRole('combobox', { name: 'Tipo de movimentação' }).click()
  await page
    .getByRole('option', { name: 'Reconhecimentos', exact: true })
    .click()
  await expect(page.getByText('1–12 de 15')).toBeVisible()
  await page
    .getByRole('textbox', { name: 'Buscar movimentação' })
    .fill('Histórico lote 14')
  await expect(page.locator('main .row')).toHaveCount(1)
  const downloadEvent = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Baixar extrato' }).click()
  const downloaded = await downloadEvent
  expect(
    (await readFile((await downloaded.path())!, 'utf8')).trim().split('\r\n'),
  ).toHaveLength(2)
  await page.screenshot({
    path: info.outputPath('extrato-api-real.png'),
    fullPage: true,
  })
  await page.goto('/aluno/cupons')
  await expect(page.locator('.coupon-card')).toHaveCount(12)
  await page.getByRole('button', { name: 'Próxima página' }).click()
  await expect(page.locator('.coupon-card')).toHaveCount(1)
  await page.getByRole('button', { name: 'Sair da conta' }).click()
  await login(page, company.login)
  await page.setViewportSize({ width: 390, height: 1000 })
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
  await dialog
    .getByRole('button', { name: 'Confirmar utilização', exact: true })
    .click()
  await expect(dialog).toHaveCount(0)
  await expect(page.getByLabel('Código do cupom')).toBeFocused()
  await expect(
    page.getByRole('button', { name: 'Conferir', exact: true }),
  ).toHaveCount(12)
  expect(
    (await call<CouponPage>(request, 'GET', '/cupons?status=UTILIZADO')).total,
  ).toBe(1)
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true)
  await page.screenshot({
    path: info.outputPath('cupons-api-real-mobile.png'),
    fullPage: true,
  })
})
