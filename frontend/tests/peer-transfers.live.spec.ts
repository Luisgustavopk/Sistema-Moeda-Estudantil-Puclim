import { expect, test, type Page } from '@playwright/test'
import { chooseOption } from './select-option'

const password = 'Seguro@2026'
let sequence = 0
function documentNumber(cnpj = false) {
  const length = cnpj ? 12 : 9
  const digits = String(Date.now() + sequence++)
    .slice(-length)
    .padStart(length, '0')
    .split('')
    .map(Number)
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
    const remainder = sum % 11
    digits.push(
      cnpj ? (remainder < 2 ? 0 : 11 - remainder) : ((sum * 10) % 11) % 10,
    )
  }
  return digits.join('')
}
interface Account {
  id: string
  login: string
  name: string
  balance: number
}
async function send<T>(
  page: Page,
  method: string,
  path: string,
  data?: unknown,
): Promise<T> {
  expect((await page.request.get('/api/auth/csrf')).ok()).toBeTruthy()
  const token = (await page.context().cookies()).find(
    (cookie) => cookie.name === 'XSRF-TOKEN',
  )!.value
  const response = await page.request.fetch(`/api${path}`, {
    method,
    data,
    headers: {
      'X-XSRF-TOKEN': decodeURIComponent(token),
      'Idempotency-Key': crypto.randomUUID(),
    },
  })
  expect(response.ok(), `${path}: ${await response.text()}`).toBeTruthy()
  return response.status() === 204
    ? (undefined as T)
    : ((await response.json()) as T)
}
async function login(page: Page, account: Account) {
  await page.goto('/login')
  await page.getByLabel('Login ou e-mail').fill(account.login)
  await page.getByLabel('Senha', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Entrar na minha conta' }).click()
  await expect(page).not.toHaveURL(/\/login$/)
}
async function logout(page: Page) {
  const openMenu = page.getByRole('button', { name: 'Abrir menu' })
  if (await openMenu.isVisible()) await openMenu.click()
  await page.getByRole('button', { name: 'Sair da conta' }).click()
  await expect(page).toHaveURL(/\/login$/)
}
async function seed(page: Page) {
  const suffix = `${Date.now().toString(36)}${sequence++}`
  const institution = await send<Account>(page, 'POST', '/empresas', {
    name: `Instituição Transferências ${suffix}`,
    login: `inst${suffix}`,
    email: `inst${suffix}@example.test`,
    password,
    cnpj: documentNumber(true),
    phone: '31999999999',
    description: 'Instituição de testes',
    partnerKind: 'ENSINO',
  })
  await send(page, 'POST', '/auth/login', {
    login: institution.login,
    password,
  })
  const teacherLogin = `prof${suffix}`
  const imported = await send<{ access: { temporaryPassword: string }[] }>(
    page,
    'POST',
    '/instituicao/professores/importar',
    {
      rows: [
        {
          line: 1,
          name: `Professor Ponte ${suffix}`,
          login: teacherLogin,
          email: `${teacherLogin}@example.test`,
          cpf: documentNumber(),
          department: 'Engenharia',
        },
      ],
    },
  )
  await send(page, 'POST', '/auth/logout')
  const teacher = await send<Account>(page, 'POST', '/auth/login', {
    login: teacherLogin,
    password: imported.access[0].temporaryPassword,
  })
  await send(page, 'PATCH', '/conta/senha', {
    currentPassword: imported.access[0].temporaryPassword,
    password,
  })
  await send(page, 'POST', '/auth/logout')
  const students: Account[] = []
  for (const name of ['Aluno Origem', 'Aluno Destino', 'Aluno Sem Vínculo']) {
    const login = `al${suffix}${sequence++}`
    students.push(
      await send<Account>(page, 'POST', '/alunos', {
        name: `${name} ${suffix}`,
        login,
        email: `${login}@example.test`,
        password,
        cpf: documentNumber(),
        address: 'Rua dos Testes, 123',
        course: 'Engenharia',
        institutionId: institution.id,
      }),
    )
  }
  return { teacher, students }
}

for (const width of [1440, 390]) {
  test(`transferência entre alunos com professor: vínculos, critérios, aprovação, rejeição e extrato (${width}px)`, async ({
    page,
  }, testInfo) => {
    test.setTimeout(120000)
    await page.setViewportSize({ width, height: 1000 })
    const {
      teacher,
      students: [sender, recipient, unlinked],
    } = await seed(page)
    const criteria =
      'A colaboração deve ser descrita e atender à atividade da disciplina.'
    await login(page, teacher)
    if (width === 390)
      await page.getByRole('button', { name: 'Abrir menu' }).click()
    await page.getByRole('link', { name: 'Entre alunos', exact: true }).click()
    await page
      .getByLabel('Critérios para aprovar transferências')
      .fill(criteria)
    await page.getByRole('button', { name: 'Publicar critérios' }).click()
    await expect(
      page.getByRole('button', { name: 'Publicar critérios' }),
    ).toBeDisabled()
    for (const student of [sender, recipient]) {
      await chooseOption(page.getByLabel('Aluno da instituição'), student.id)
      await page
        .getByRole('button', { name: 'Vincular aluno', exact: true })
        .click()
      await expect(
        page.getByRole('button', {
          name: `Remover vínculo de ${student.name}`,
        }),
      ).toBeVisible()
    }
    await send(page, 'POST', '/transferencias', {
      studentId: sender.id,
      amount: 100,
      reason: 'Reconhecimento da atividade',
    })
    await logout(page)
    await login(page, sender)
    if (width === 390)
      await page.getByRole('button', { name: 'Abrir menu' }).click()
    await page
      .getByRole('link', { name: 'Transferências', exact: true })
      .click()
    await expect(page.getByText(criteria, { exact: true })).toBeVisible()
    await page.getByLabel('Aluno que receberá').click()
    await expect(
      page.getByRole('option', { name: new RegExp(unlinked.name) }),
    ).toHaveCount(0)
    await expect(
      page.getByRole('option', { name: new RegExp(sender.name) }),
    ).toHaveCount(0)
    await page.getByRole('option', { name: new RegExp(recipient.name) }).click()
    await page.getByLabel('Quantidade de moedas').fill('40')
    await page
      .getByLabel('Motivo da transferência')
      .fill('Colaboração no projeto em grupo')
    await expect(
      page.getByRole('button', {
        name: 'Solicitar transferência',
        exact: true,
      }),
    ).toBeDisabled()
    await page.getByLabel('Li os critérios').check()
    await page
      .getByRole('button', { name: 'Solicitar transferência', exact: true })
      .click()
    await expect(page.locator('.peer-status')).toHaveText(
      'Aguardando aprovação',
    )
    expect((await send<Account>(page, 'GET', '/auth/session')).balance).toBe(
      100,
    )
    await page.screenshot({
      path: testInfo.outputPath(`student-${width}.png`),
      fullPage: true,
    })
    await logout(page)
    await login(page, teacher)
    await page.goto('/professor/transferencias-alunos')
    await expect(
      page.getByRole('button', { name: `Remover vínculo de ${sender.name}` }),
    ).toBeDisabled()
    await page
      .getByLabel('Parecer da análise')
      .fill('Atende aos critérios de colaboração.')
    await page
      .getByRole('button', { name: 'Aprovar transferência', exact: true })
      .click()
    await expect(page.locator('.peer-status')).toHaveText('Aprovada')
    await expect(
      page.locator('.peer-copy').filter({ hasText: 'Parecer do professor:' }),
    ).toContainText('Atende aos critérios')
    expect((await send<Account>(page, 'GET', '/auth/session')).balance).toBe(
      900,
    )
    await page.screenshot({
      path: testInfo.outputPath(`teacher-${width}.png`),
      fullPage: true,
    })
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBeTruthy()
    await logout(page)
    await login(page, recipient)
    await page.goto('/aluno/transferencias')
    await expect(page.locator('.peer-status')).toHaveText('Aprovada')
    expect((await send<Account>(page, 'GET', '/auth/session')).balance).toBe(40)
    await page.goto('/aluno/extrato')
    await chooseOption(
      page.getByLabel('Tipo de movimentação'),
      'TRANSF_ENTRADA',
    )
    await expect(
      page.getByText('Transferência de aluno', { exact: true }),
    ).toBeVisible()
    await expect(page.getByText(sender.name, { exact: false })).toBeVisible()
    await logout(page)
    await login(page, sender)
    await page.goto('/aluno/transferencias')
    await chooseOption(page.getByLabel('Aluno que receberá'), recipient.id)
    await page.getByLabel('Quantidade de moedas').fill('10')
    await page
      .getByLabel('Motivo da transferência')
      .fill('Outro pedido de colaboração')
    await page.getByLabel('Li os critérios').check()
    await page
      .getByRole('button', { name: 'Solicitar transferência', exact: true })
      .click()
    await expect(
      page.locator('.peer-status').filter({ hasText: 'Aguardando aprovação' }),
    ).toHaveCount(1)
    await logout(page)
    await login(page, teacher)
    await page.goto('/professor/transferencias-alunos')
    await page
      .getByLabel('Parecer da análise')
      .fill('O motivo não demonstra os critérios exigidos.')
    await page
      .getByRole('button', { name: 'Rejeitar transferência', exact: true })
      .click()
    await expect(
      page.locator('.peer-status').filter({ hasText: 'Rejeitada' }),
    ).toHaveCount(1)
    await logout(page)
    await login(page, sender)
    await page.goto('/aluno/transferencias')
    expect((await send<Account>(page, 'GET', '/auth/session')).balance).toBe(60)
    await expect(
      page.getByText('O motivo não demonstra os critérios exigidos.', {
        exact: false,
      }),
    ).toBeVisible()
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBeTruthy()
  })
}
