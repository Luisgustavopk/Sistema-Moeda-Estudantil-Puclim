import { expect, test } from '@playwright/test'
import { chooseOption } from './select-option'
import { mockGame } from './gamification-fixture'

test.beforeEach(async ({ page }) => {
  await page.route('**/api/auth/session', (route) =>
    route.fulfill({ json: null }),
  )
  await page.route('**/api/auth/csrf', (route) => route.fulfill({ json: {} }))
  await page.route('**/api/instituicoes', (route) =>
    route.fulfill({
      json: [{ id: 'institution', name: 'Instituição de teste' }],
    }),
  )
})

const brandName = 'Puclim, voltar para entrar'
const promptName = 'Descartar este cadastro?'

test('marca no login volta à landing page', async ({ page, baseURL }) => {
  for (const path of ['/login', '/login/']) {
    await page.goto(path)
    await page.getByRole('link', { name: 'Puclim, voltar ao início' }).click()
    await expect(page).toHaveURL(`${baseURL}/`)
    await expect(
      page.getByRole('heading', { level: 1, name: /Seu mérito/ }),
    ).toBeVisible()
  }
})

test('marca nos cadastros abre login e cadastros vazios permitem mudar de tipo sem aviso', async ({
  page,
}) => {
  for (const path of ['/cadastro/aluno', '/cadastro/empresa']) {
    await page.goto(path)
    await page.getByRole('link', { name: brandName }).click()
    await expect(page).toHaveURL(/\/login$/)
    await expect(page.getByLabel('Login ou e-mail')).toBeVisible()
    await expect(page.getByRole('dialog')).toHaveCount(0)
  }
  await page.goto('/cadastro/aluno')
  const navigation = page.getByRole('navigation', { name: 'Tipo de cadastro' })
  await navigation.getByRole('link', { name: /Sou uma organização/ }).click()
  await expect(page).toHaveURL(/\/cadastro\/empresa$/)
  await expect(
    navigation.getByRole('link', { name: /Sou uma organização/ }),
  ).toHaveAttribute('aria-current', 'page')
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

for (const kind of ['aluno', 'empresa'] as const) {
  test(`cadastro de ${kind} preserva os dados ao cancelar e descarta somente após confirmar`, async ({
    page,
  }) => {
    await page.goto(`/cadastro/${kind}`)
    const field = page.getByLabel(
      kind === 'aluno' ? 'Nome completo' : 'Nome da organização',
    )
    await field.fill('Cadastro de teste')
    await page.getByRole('link', { name: brandName }).click()
    const dialog = page.getByRole('dialog', { name: promptName })
    await expect(dialog).toBeVisible()
    await expect(dialog).toContainText(
      'todos os dados preenchidos neste cadastro serão perdidos',
    )
    await expect(
      dialog.getByRole('button', { name: 'Continuar preenchendo' }),
    ).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(dialog).toHaveCount(0)
    await expect(field).toHaveValue('Cadastro de teste')
    await expect(page.getByRole('link', { name: brandName })).toBeFocused()
    await page
      .getByRole('link', { name: 'Voltar para entrar', exact: true })
      .click()
    await dialog.getByRole('button', { name: 'Continuar preenchendo' }).click()
    await expect(field).toHaveValue('Cadastro de teste')
    await page.getByRole('link', { name: brandName }).click()
    await dialog.getByRole('button', { name: 'Descartar e sair' }).click()
    await expect(page).toHaveURL(/\/login$/)
    await page.getByRole('link', { name: 'Crie sua conta' }).click()
    await expect(page.getByLabel('Nome completo')).toHaveValue('')
  })
}

test('trocar o tipo de cadastro pede descarte e mantém a seleção anterior ao cancelar', async ({
  page,
}) => {
  await page.goto('/cadastro/aluno')
  await page.getByLabel('Senha', { exact: true }).fill('SenhaDeTeste123')
  const navigation = page.getByRole('navigation', { name: 'Tipo de cadastro' })
  const student = navigation.getByRole('link', { name: /Sou aluno/ })
  const organization = navigation.getByRole('link', {
    name: /Sou uma organização/,
  })
  await student.click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await organization.click()
  const dialog = page.getByRole('dialog', { name: promptName })
  await expect(dialog).toBeVisible()
  await expect(student).toHaveAttribute('aria-current', 'page')
  await dialog.getByRole('button', { name: 'Continuar preenchendo' }).click()
  await expect(page.getByLabel('Senha', { exact: true })).toHaveValue(
    'SenhaDeTeste123',
  )
  await organization.click()
  await dialog.getByRole('button', { name: 'Descartar e sair' }).click()
  await expect(page).toHaveURL(/\/cadastro\/empresa$/)
  await expect(page.getByLabel('Senha', { exact: true })).toHaveValue('')
  await expect(organization).toHaveAttribute('aria-current', 'page')
})

test('Voltar do navegador avisa antes de abandonar o cadastro e Avançar abre um formulário vazio', async ({
  page,
}) => {
  await page.goto('/login')
  await page.getByRole('link', { name: 'Crie sua conta' }).click()
  await page.getByLabel('Nome completo').fill('Cadastro de teste')
  await page.goBack()
  const dialog = page.getByRole('dialog', { name: promptName })
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: 'Continuar preenchendo' }).click()
  await expect(page).toHaveURL(/\/cadastro\/aluno$/)
  await expect(page.getByLabel('Nome completo')).toHaveValue(
    'Cadastro de teste',
  )
  await page.goBack()
  await dialog.getByRole('button', { name: 'Descartar e sair' }).click()
  await expect(page).toHaveURL(/\/login$/)
  await page.goForward()
  await expect(page.getByLabel('Nome completo')).toHaveValue('')
})

test('limpar o preenchimento e restaurar a opção padrão remove o aviso de saída', async ({
  page,
}) => {
  await page.goto('/cadastro/aluno')
  await page.getByLabel('Nome completo').fill('Texto temporário')
  await page.getByLabel('Nome completo').fill('')
  await page.getByRole('link', { name: brandName }).click()
  await expect(page).toHaveURL(/\/login$/)
  await page.goto('/cadastro/empresa')
  await chooseOption(page.getByLabel('Tipo de organização'), 'ENSINO')
  await page.getByRole('link', { name: brandName }).click()
  await page.getByRole('button', { name: 'Continuar preenchendo' }).click()
  await chooseOption(page.getByLabel('Tipo de organização'), 'EMPRESA')
  await page.getByRole('link', { name: brandName }).click()
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

test('recarregar um cadastro preenchido usa o aviso nativo e cancelar mantém os dados', async ({
  page,
}) => {
  await page.goto('/cadastro/aluno')
  await page.getByLabel('Nome completo').fill('Texto temporário')
  await page.evaluate(() => {
    document.documentElement.dataset.registrationDocument = 'original'
  })
  const cdp = await page.context().newCDPSession(page)
  const confirmation = page.waitForEvent('dialog')
  const reload = cdp.send('Page.reload')
  const dialog = await confirmation
  expect(dialog.type()).toBe('beforeunload')
  await dialog.dismiss()
  await reload
  await expect(page.locator('html')).toHaveAttribute(
    'data-registration-document',
    'original',
  )
  await expect(page.getByLabel('Nome completo')).toHaveValue('Texto temporário')
  await page.getByLabel('Nome completo').fill('')
  await page.reload()
  await expect(page.getByLabel('Nome completo')).toHaveValue('')
  await cdp.detach()
})

test('indicador acompanha a troca, respeita teclado, pausa e movimento reduzido', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/cadastro/aluno')
  const navigation = page.getByRole('navigation', { name: 'Tipo de cadastro' })
  await navigation.evaluate((node) => {
    node.addEventListener('transitionrun', (event) => {
      if ((event as TransitionEvent).propertyName === 'transform')
        node.setAttribute('data-transition-ran', 'true')
    })
  })
  await navigation.getByRole('link', { name: /Sou uma organização/ }).click()
  await expect(page).toHaveURL(/\/cadastro\/empresa$/)
  await expect(navigation).toHaveAttribute('data-transition-ran', 'true')
  await expect
    .poll(() =>
      navigation.evaluate(
        (node) => getComputedStyle(node, '::before').transform,
      ),
    )
    .not.toBe('matrix(1, 0, 0, 1, 0, 0)')
  await page.keyboard.press('Shift+Tab')
  await expect(
    navigation.getByRole('link', { name: /Sou aluno/ }),
  ).toBeFocused()
  expect(
    await navigation.evaluate(
      (node) => getComputedStyle(node, '::before').transitionDuration,
    ),
  ).toBe('0s')
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/\/cadastro\/aluno$/)
  await page.getByRole('button', { name: 'Pausar animações' }).click()
  expect(
    await navigation.evaluate(
      (node) => getComputedStyle(node, '::before').transitionDuration,
    ),
  ).toBe('0s')
  await page.getByRole('button', { name: 'Retomar animações' }).click()
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await navigation.getByRole('link', { name: /Sou uma organização/ }).click()
  expect(
    await navigation.evaluate(
      (node) => getComputedStyle(node, '::before').transitionDuration,
    ),
  ).toBe('0s')
})

test('cadastro salvo segue para autenticação sem pedir descarte e falhas preservam o preenchimento', async ({
  page,
}) => {
  let saved = false
  let received: Record<string, unknown> | undefined
  await page.route('**/api/empresas', async (route) => {
    received = route.request().postDataJSON()
    if (!saved)
      await route.fulfill({
        status: 500,
        json: { message: 'Falha de teste ao cadastrar.' },
      })
    else await route.fulfill({ status: 201, json: { id: 'partner' } })
  })
  await page.route('**/api/auth/login', async (route) => {
    await route.fulfill({
      status: 503,
      json: { message: 'Cadastro salvo. Falha de teste na autenticação.' },
    })
  })
  await page.goto('/cadastro/empresa')
  await page.getByLabel('Nome da organização').fill('Organização de teste')
  await page.getByLabel('CNPJ').fill('11.222.333/0001-81')
  await page.getByLabel('Telefone com DDD').fill('31999999999')
  await page.getByLabel('E-mail de contato').fill('cadastro@example.test')
  await page.getByLabel('Login', { exact: true }).fill('organizacao.teste')
  await page.getByLabel('Senha', { exact: true }).fill('SenhaDeTeste123')
  await page.getByLabel('Confirmar senha').fill('SenhaDeTeste123')
  await page
    .getByRole('button', { name: 'Cadastrar minha organização' })
    .click()
  await expect(page.getByRole('alert')).toContainText(
    'Falha de teste ao cadastrar.',
  )
  await expect(page.getByLabel('Nome da organização')).toHaveValue(
    'Organização de teste',
  )
  await page.getByRole('link', { name: brandName }).click()
  await page.getByRole('button', { name: 'Continuar preenchendo' }).click()
  saved = true
  await page
    .getByRole('button', { name: 'Cadastrar minha organização' })
    .click()
  await expect(page.getByRole('alert')).toContainText('Cadastro salvo.')
  expect(received).not.toHaveProperty('confirmation')
  await page.getByRole('link', { name: brandName }).click()
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

test('criar conta de aluno autentica e abre o painel sem pedir descarte', async ({
  page,
}) => {
  await page.route('**/api/alunos', async (route) => {
    await mockGame(page)
    await route.fulfill({ status: 201, json: { id: 'student' } })
  })
  await page.goto('/cadastro/aluno')
  await page.getByLabel('Nome completo').fill('Mariana Costa')
  await page.getByLabel('E-mail', { exact: true }).fill('mariana@example.test')
  await page.getByLabel('Login', { exact: true }).fill('mariana')
  await page.getByLabel('CPF').fill('529.982.247-25')
  await page.getByLabel('Endereço completo').fill('Rua de Teste, 123, Centro')
  await chooseOption(page.getByLabel('Instituição de ensino'), 'institution')
  await page.getByLabel('Curso', { exact: true }).fill('Engenharia de Software')
  await page.getByLabel('Senha', { exact: true }).fill('SenhaDeTeste123')
  await page.getByLabel('Confirmar senha').fill('SenhaDeTeste123')
  await page.getByRole('button', { name: 'Criar minha conta' }).click()
  await expect(page).toHaveURL(/\/aluno$/)
  await expect(
    page.getByRole('heading', { name: 'Olá, Mariana!' }),
  ).toBeVisible()
  await expect(page.getByRole('dialog')).toHaveCount(0)
})
