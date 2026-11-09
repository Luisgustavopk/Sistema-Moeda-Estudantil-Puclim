import {
  expect,
  test,
  type APIRequestContext,
  type Page,
} from '@playwright/test'

const password = 'Inicial@2026'
let documentSequence = 0
function documentNumber(cnpj = false) {
  const seed = String(Date.now() + documentSequence++).slice(-9)
  const digits = (cnpj ? `${seed}001` : seed).split('').map(Number)
  for (let round = 0; round < 2; round++) {
    let sum = 0
    if (cnpj) {
      let weight = 2
      for (let index = digits.length - 1; index >= 0; index--) {
        sum += digits[index] * weight
        weight = weight === 9 ? 2 : weight + 1
      }
      digits.push(sum % 11 < 2 ? 0 : 11 - (sum % 11))
    } else {
      digits.forEach((digit, index) => {
        sum += digit * (digits.length + 1 - index)
      })
      digits.push((sum * 10) % 11 === 10 ? 0 : (sum * 10) % 11)
    }
  }
  return digits.join('')
}

async function call(
  context: APIRequestContext,
  method: string,
  path: string,
  data?: unknown,
  status = 200,
  extraHeaders: Record<string, string> = {},
) {
  const csrf = await context.get('/api/auth/csrf')
  expect(csrf.ok()).toBe(true)
  const token = (await context.storageState()).cookies.find(
    (cookie) => cookie.name === 'XSRF-TOKEN',
  )?.value
  const response = await context.fetch(`/api${path}`, {
    method,
    data,
    headers: {
      ...(token ? { 'X-XSRF-TOKEN': decodeURIComponent(token) } : {}),
      ...extraHeaders,
    },
  })
  expect(response.status()).toBe(status)
  return status === 204 ? null : response.json()
}
async function registerPartner(context: APIRequestContext, kind = 'EMPRESA') {
  const suffix = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
  const login = `live.${suffix}`
  const email = `${login}@example.test`
  const account = await call(
    context,
    'POST',
    '/empresas',
    {
      name: `Parceiro ${suffix}`,
      email,
      login,
      password,
      cnpj: documentNumber(true),
      phone: '31999999999',
      description: 'Conta exclusiva de verificação em banco de teste',
      partnerKind: kind,
    },
    201,
  )
  return { ...account, login, email }
}
async function login(page: Page, user: string, secret = password) {
  await page.goto('/login')
  await page.getByLabel('Login ou e-mail').fill(user)
  await page.getByLabel('Senha', { exact: true }).fill(secret)
  await page
    .getByRole('button', { name: 'Entrar na minha conta', exact: true })
    .click()
  await expect(page).not.toHaveURL(/\/login$/)
}

test('e-mail real de recuperação redefine a senha, revoga sessão e impede reutilizar o link', async ({
  page,
  request,
}, info) => {
  const account = await registerPartner(request)
  await call(request, 'POST', '/auth/login', { login: account.login, password })
  const sentUrls: string[] = []
  page.on('request', (req) => {
    sentUrls.push(req.url(), req.headers().referer || '')
  })
  await page.goto('/login')
  await page
    .getByRole('link', { name: 'Esqueci minha senha', exact: true })
    .click()
  await page
    .getByLabel('E-mail do cadastro', { exact: true })
    .fill(account.email)
  await page
    .getByRole('button', { name: 'Enviar link de recuperação', exact: true })
    .click()
  await expect(
    page.getByText('Se houver uma conta ativa', { exact: false }).first(),
  ).toBeVisible()
  const mailpit = process.env.LIVE_MAILPIT_URL || 'http://127.0.0.1:8025'
  let messageId: string | undefined
  await expect
    .poll(
      async () => {
        const response = await request.get(`${mailpit}/api/v1/search`, {
          params: { query: `to:${account.email}` },
        })
        expect(response.ok()).toBe(true)
        const messages = await response.json()
        messageId = messages.messages?.find(
          (message: { Subject: string; ID: string }) =>
            /recuper|redefin/i.test(message.Subject),
        )?.ID
        return !!messageId
      },
      { timeout: 65000, intervals: [500, 1000, 2000] },
    )
    .toBe(true)
  const mail = await (
    await request.get(`${mailpit}/api/v1/message/${messageId}`)
  ).json()
  const match = (mail.Text as string).match(
    /https?:\/\/[^\s<>]+\/redefinir-senha#token=[A-Za-z0-9_-]+/,
  )
  expect(!!match).toBe(true)
  const link = new URL(match![0])
  await page.goto(`${link.pathname}${link.hash}`)
  await expect(page).toHaveURL(/\/redefinir-senha$/)
  const nextPassword = 'Atualizada@2026'
  await page.getByLabel('Nova senha', { exact: true }).fill(nextPassword)
  await page
    .getByLabel('Confirmar nova senha', { exact: true })
    .fill(nextPassword)
  await page
    .getByRole('button', { name: 'Salvar nova senha', exact: true })
    .click()
  await expect(
    page.getByRole('heading', { name: 'Senha atualizada.', exact: true }),
  ).toBeVisible()
  await page.screenshot({
    path: info.outputPath('real-password-reset-success.png'),
  })
  const previousSession = await request.get('/api/auth/session')
  expect(previousSession.status()).toBe(401)
  await call(
    request,
    'POST',
    '/auth/login',
    { login: account.login, password },
    401,
  )
  await page
    .getByRole('link', { name: 'Entrar com a nova senha', exact: true })
    .click()
  await login(page, account.login, nextPassword)
  await expect(page).toHaveURL(/\/empresa$/)
  const anonymous = await page.context().browser()!.newContext()
  try {
    const replay = await anonymous.newPage()
    await replay.goto(`${info.project.use.baseURL}${link.pathname}${link.hash}`)
    await replay
      .getByLabel('Nova senha', { exact: true })
      .fill('Reutilizada@2026')
    await replay
      .getByLabel('Confirmar nova senha', { exact: true })
      .fill('Reutilizada@2026')
    await replay
      .getByRole('button', { name: 'Salvar nova senha', exact: true })
      .click()
    await expect(
      replay.getByRole('heading', { name: 'Link indisponível.', exact: true }),
    ).toBeVisible()
  } finally {
    await anonymous.close()
  }
  expect(
    sentUrls.every(
      (url) => !url.includes('#token=') && !url.includes('?token='),
    ),
  ).toBe(true)
})

test('cupom real permite QR por imagem ou código e só utiliza após confirmação', async ({
  page,
  playwright,
  request,
}, info) => {
  const baseURL = info.project.use.baseURL as string
  const institution = await registerPartner(request, 'ENSINO')
  await call(request, 'POST', '/auth/login', {
    login: institution.login,
    password,
  })
  const suffix = Date.now().toString(36)
  const teacherLogin = `prof.${suffix}`
  const imported = await call(
    request,
    'POST',
    '/instituicao/professores/importar',
    {
      rows: [
        {
          line: 2,
          name: 'Professor do teste QR',
          cpf: documentNumber(),
          department: 'Computação',
          email: `${teacherLogin}@example.test`,
          login: teacherLogin,
        },
      ],
    },
  )
  const teacher = await playwright.request.newContext({ baseURL })
  const studentContext = await playwright.request.newContext({ baseURL })
  const companyContext = await playwright.request.newContext({ baseURL })
  try {
    await call(teacher, 'POST', '/auth/login', {
      login: teacherLogin,
      password: imported.access[0].temporaryPassword,
    })
    await call(teacher, 'PATCH', '/conta/senha', {
      currentPassword: imported.access[0].temporaryPassword,
      password,
    })
    const studentLogin = `aluno.${suffix}`
    const student = await call(
      studentContext,
      'POST',
      '/alunos',
      {
        name: 'Aluno do teste QR',
        email: `${studentLogin}@example.test`,
        login: studentLogin,
        password,
        cpf: documentNumber(),
        rg: 'MG123456',
        address: 'Rua de Teste, 123',
        course: 'Engenharia',
        institutionId: institution.id,
      },
      201,
    )
    await call(
      teacher,
      'POST',
      '/transferencias',
      {
        studentId: student.id,
        amount: 100,
        reason: 'Reconhecimento para validar cupom em teste',
      },
      200,
      { 'Idempotency-Key': crypto.randomUUID() },
    )
    const company = await registerPartner(companyContext)
    await call(companyContext, 'POST', '/auth/login', {
      login: company.login,
      password,
    })
    await page.goto('/login')
    const png = await page.evaluate(() => {
      const canvas = document.createElement('canvas')
      canvas.width = canvas.height = 64
      const context = canvas.getContext('2d')!
      context.fillStyle = '#0f4c5c'
      context.fillRect(0, 0, 64, 64)
      return canvas.toDataURL('image/png').split(',')[1]
    })
    await companyContext.get('/api/auth/csrf')
    const csrf = (await companyContext.storageState()).cookies.find(
      (cookie) => cookie.name === 'XSRF-TOKEN',
    )!
    const imageResponse = await companyContext.post('/api/uploads/imagens', {
      headers: { 'X-XSRF-TOKEN': decodeURIComponent(csrf.value) },
      multipart: {
        file: {
          name: 'teste.png',
          mimeType: 'image/png',
          buffer: Buffer.from(png, 'base64'),
        },
      },
    })
    expect(imageResponse.status()).toBe(201)
    const photo = (await imageResponse.json()).url
    const advantage = await call(
      companyContext,
      'POST',
      '/vantagens',
      {
        name: `Vantagem QR ${suffix}`,
        description: 'Vantagem exclusiva de teste',
        photo,
        category: 'Descontos',
        cost: 20,
        active: true,
      },
      201,
    )
    await call(studentContext, 'POST', '/auth/login', {
      login: studentLogin,
      password,
    })
    const coupon = await call(
      studentContext,
      'POST',
      `/vantagens/${advantage.id}/resgates`,
      {},
      200,
      { 'Idempotency-Key': crypto.randomUUID() },
    )
    await login(page, studentLogin)
    await page.goto('/aluno/cupons')
    await page
      .getByRole('button', { name: 'Mostrar QR Code', exact: true })
      .click()
    const presentation = page.getByRole('dialog', {
      name: 'Apresentar cupom',
      exact: true,
    })
    await expect(presentation.locator('.coupon-code')).toContainText(
      coupon.code,
    )
    const qr = await presentation.locator('.coupon-qr-art').screenshot()
    await presentation.screenshot({
      path: info.outputPath('real-coupon-qr.png'),
    })
    await page.keyboard.press('Escape')
    await page
      .getByRole('button', { name: 'Sair da conta', exact: true })
      .click()
    await expect(page).toHaveURL(/\/login$/)
    await login(page, company.login)
    await page.goto('/empresa/cupons')
    await page
      .getByLabel('Imagem do QR Code', { exact: true })
      .setInputFiles({ name: 'cupom.png', mimeType: 'image/png', buffer: qr })
    await expect(page.locator('.summary-box')).toContainText(advantage.name)
    await expect(
      page.getByLabel('Código do cupom', { exact: true }),
    ).toHaveValue(coupon.code)
    expect(
      (await call(companyContext, 'GET', `/cupons/${coupon.code}`)).status,
    ).toBe('VALIDO')
    await page
      .getByRole('button', { name: 'Confirmar utilização', exact: true })
      .click()
    const confirm = page.getByRole('dialog', {
      name: 'Confirmar utilização do cupom?',
      exact: true,
    })
    await confirm.getByRole('button', { name: 'Cancelar', exact: true }).click()
    expect(
      (await call(companyContext, 'GET', `/cupons/${coupon.code}`)).status,
    ).toBe('VALIDO')
    await page
      .getByLabel('Código do cupom', { exact: true })
      .fill(coupon.code.toLowerCase())
    await page
      .getByRole('button', { name: 'Conferir código', exact: true })
      .click()
    await expect(page.locator('.summary-box')).toContainText(advantage.name)
    await page
      .getByRole('button', { name: 'Confirmar utilização', exact: true })
      .click()
    await confirm
      .getByRole('button', { name: 'Confirmar utilização', exact: true })
      .click()
    await expect(confirm).toBeHidden()
    await expect(page.locator('.summary-box')).toContainText('Já utilizado')
    expect(
      (await call(companyContext, 'GET', `/cupons/${coupon.code}`)).status,
    ).toBe('UTILIZADO')
    await page.screenshot({
      path: info.outputPath('real-coupon-used-after-confirmation.png'),
    })
  } finally {
    await Promise.all([
      teacher.dispose(),
      studentContext.dispose(),
      companyContext.dispose(),
    ])
  }
})
