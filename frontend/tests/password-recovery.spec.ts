import { expect, test, type Page } from '@playwright/test'
import { student } from './gamification-fixture'

const token = 'TestOnlyResetToken_ABCDEFGHIJKLMNOPQRSTUVWXYZ123'
const resetPath = `/redefinir-senha#token=${token}`

async function assertNoOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true)
}

test.beforeEach(async ({ page }) => {
  await page.route('**/api/auth/session', (route) =>
    route.fulfill({ json: null }),
  )
  await page.route('**/api/auth/csrf', (route) => route.fulfill({ json: {} }))
})

test.describe('recuperação conectada', () => {
  test.beforeEach(({ page }, info) => {
    test.skip(info.project.name !== 'api', 'Requer os endpoints conectados.')
    page.on('pageerror', (error) => {
      throw error
    })
  })

  for (const width of [390, 820, 1440]) {
    test(`solicitação e nova senha em ${width}px, nos dois temas, sem token na URL ou no armazenamento`, async ({
      page,
    }, info) => {
      await page.setViewportSize({ width, height: 1000 })
      await page.emulateMedia({ reducedMotion: 'reduce' })
      const outgoing: { url: string; referrer: string | undefined }[] = []
      const messages: string[] = []
      page.on('request', (request) =>
        outgoing.push({
          url: request.url(),
          referrer: request.headers().referer,
        }),
      )
      page.on('console', (message) => messages.push(message.text()))
      await page.route('**/api/auth/recuperar-senha', (route) =>
        route.fulfill({
          status: 202,
          json: { message: 'Solicitação recebida.' },
        }),
      )
      let resetBody: unknown
      await page.route('**/api/auth/redefinir-senha', (route) => {
        resetBody = route.request().postDataJSON()
        return route.fulfill({ status: 204 })
      })
      await page.goto('/login')
      await page.getByRole('link', { name: 'Esqueci minha senha' }).click()
      await expect(
        page.getByRole('heading', { name: 'Recupere seu acesso.' }),
      ).toBeVisible()
      await page.getByLabel('E-mail do cadastro').fill('mariana@example.test')
      await assertNoOverflow(page)
      await page.screenshot({
        path: info.outputPath('solicitar-claro.png'),
        fullPage: true,
      })
      await page.getByRole('button', { name: 'Ativar modo escuro' }).click()
      await page.screenshot({
        path: info.outputPath('solicitar-escuro.png'),
        fullPage: true,
      })
      await page
        .getByRole('button', { name: 'Enviar link de recuperação' })
        .click()
      await expect(
        page.getByRole('status').filter({ hasText: 'Confira seu e-mail' }),
      ).toBeFocused()
      await expect(
        page.getByText(/Se houver uma conta ativa com esse e-mail/),
      ).toBeVisible()
      await page.goto(resetPath)
      await expect(page).toHaveURL(/\/redefinir-senha$/)
      await expect(page.getByLabel('Nova senha', { exact: true })).toBeVisible()
      await page.screenshot({
        path: info.outputPath('nova-senha-escuro.png'),
        fullPage: true,
      })
      await page.getByRole('button', { name: 'Ativar modo claro' }).click()
      await assertNoOverflow(page)
      await page.screenshot({
        path: info.outputPath('nova-senha-claro.png'),
        fullPage: true,
      })
      await page
        .getByLabel('Nova senha', { exact: true })
        .fill('SenhaDeTeste123')
      await page.getByLabel('Confirmar nova senha').fill('SenhaDeTeste123')
      await page.getByRole('button', { name: 'Salvar nova senha' }).click()
      await expect(
        page.getByRole('heading', { name: 'Senha atualizada.' }),
      ).toBeVisible()
      expect(resetBody).toEqual({ token, password: 'SenhaDeTeste123' })
      await page.getByRole('link', { name: 'Entrar com a nova senha' }).click()
      await expect(page).toHaveURL(/\/login$/)
      expect(
        outgoing.every(
          (request) =>
            !`${request.url}${request.referrer || ''}`.includes(token),
        ),
      ).toBe(true)
      expect(messages.every((message) => !message.includes(token))).toBe(true)
      expect(
        await page.evaluate(() =>
          JSON.stringify({ ...localStorage, ...sessionStorage }),
        ),
      ).not.toContain(token)
    })
  }

  test('valida e-mail, mantém resposta genérica e oferece reenvio após 60 segundos', async ({
    page,
  }) => {
    const emails: string[] = []
    await page.route('**/api/auth/recuperar-senha', (route) => {
      emails.push(route.request().postDataJSON().email)
      return route.fulfill({ status: 202, json: { message: 'Recebido.' } })
    })
    await page.goto('/recuperar-senha')
    await page
      .getByRole('button', { name: 'Enviar link de recuperação' })
      .click()
    await expect(page.getByLabel('E-mail do cadastro')).toBeFocused()
    await expect(page.getByRole('alert')).toContainText('Informe o e-mail')
    await page.getByLabel('E-mail do cadastro').fill('email-invalido')
    await page.keyboard.press('Enter')
    await expect(page.getByRole('alert')).toContainText(
      'Informe um e-mail válido',
    )
    expect(emails).toHaveLength(0)
    await page.clock.install()
    await page
      .getByLabel('E-mail do cadastro')
      .fill('  inexistente@example.test  ')
    await page.keyboard.press('Enter')
    await expect(page.getByText(/Se houver uma conta ativa/)).toBeVisible()
    const resend = page.getByRole('button', { name: 'Reenviar link' })
    await expect(resend).toBeDisabled()
    await page.clock.fastForward(61000)
    await expect(resend).toBeEnabled()
    await resend.click()
    await expect(resend).toBeDisabled()
    expect(emails).toEqual([
      'inexistente@example.test',
      'inexistente@example.test',
    ])
  })

  test('falha ao solicitar preserva o e-mail e permite tentar novamente', async ({
    page,
  }) => {
    let failed = true
    await page.route('**/api/auth/recuperar-senha', (route) =>
      failed
        ? route.fulfill({
            status: 503,
            json: {
              message: 'Não foi possível solicitar agora. Tente novamente.',
            },
          })
        : route.fulfill({ status: 202, json: { message: 'Recebido.' } }),
    )
    await page.goto('/recuperar-senha')
    await page.getByLabel('E-mail do cadastro').fill('mariana@example.test')
    await page
      .getByRole('button', { name: 'Enviar link de recuperação' })
      .click()
    await expect(page.getByRole('alert')).toContainText('Tente novamente')
    await expect(page.getByLabel('E-mail do cadastro')).toHaveValue(
      'mariana@example.test',
    )
    await expect(page.getByText('Confira seu e-mail')).toHaveCount(0)
    failed = false
    await page
      .getByRole('button', { name: 'Enviar link de recuperação' })
      .click()
    await expect(page.getByText('Confira seu e-mail')).toBeVisible()
  })

  test('link ausente, malformado ou recarregado orienta a solicitar outro sem chamar a API', async ({
    page,
  }) => {
    let attempts = 0
    await page.route('**/api/auth/redefinir-senha', (route) => {
      attempts++
      return route.fulfill({ status: 204 })
    })
    for (const path of [
      '/redefinir-senha',
      '/redefinir-senha#token=invalido',
    ]) {
      await page.goto(path)
      await expect(
        page.getByRole('heading', { name: 'Link indisponível.' }),
      ).toBeVisible()
      await expect(page.getByLabel('Nova senha', { exact: true })).toHaveCount(
        0,
      )
      await expect(page).toHaveURL(/\/redefinir-senha$/)
    }
    await page.goto(resetPath)
    await expect(page.getByLabel('Nova senha', { exact: true })).toBeVisible()
    await page.reload()
    await expect(
      page.getByRole('heading', { name: 'Link indisponível.' }),
    ).toBeVisible()
    expect(attempts).toBe(0)
    await page.getByRole('link', { name: 'Solicitar novo link' }).click()
    await expect(page.getByLabel('E-mail do cadastro')).toBeVisible()
  })

  test('links inválidos, expirados e utilizados mostram a mesma recuperação acessível', async ({
    page,
  }) => {
    for (const message of [
      'Link inválido.',
      'Link expirado.',
      'Link já utilizado.',
    ]) {
      await page.route('**/api/auth/redefinir-senha', (route) =>
        route.fulfill({ status: 400, json: { message } }),
      )
      await page.goto(resetPath)
      await page
        .getByLabel('Nova senha', { exact: true })
        .fill('SenhaDeTeste123')
      await page.getByLabel('Confirmar nova senha').fill('SenhaDeTeste123')
      await page.getByRole('button', { name: 'Salvar nova senha' }).click()
      await expect(
        page.getByRole('heading', { name: 'Link indisponível.' }),
      ).toBeVisible()
      await expect(page.getByRole('alert')).toContainText(
        'inválido, expirou ou já foi utilizado',
      )
      await expect(page.locator('.password-recovery-result')).toBeFocused()
      await expect(
        page.getByRole('link', { name: 'Solicitar novo link' }),
      ).toBeVisible()
      await expect(page.getByLabel('Nova senha', { exact: true })).toHaveCount(
        0,
      )
    }
  })

  test('senha e confirmação validam por teclado, exibição é opcional e falhas permitem repetir', async ({
    page,
  }) => {
    let attempts = 0
    let failed = true
    await page.route('**/api/auth/redefinir-senha', (route) => {
      attempts++
      return failed
        ? route.fulfill({
            status: 503,
            json: { message: 'Falha temporária. Tente novamente.' },
          })
        : route.fulfill({ status: 204 })
    })
    await page.goto(resetPath)
    await page.getByRole('button', { name: 'Salvar nova senha' }).click()
    const summary = page.getByRole('alert').filter({
      has: page.getByRole('heading', { name: 'Confira os campos abaixo' }),
    })
    await expect(summary).toBeFocused()
    await summary
      .getByRole('link', { name: 'Use pelo menos 8 caracteres.' })
      .click()
    await expect(page.getByLabel('Nova senha', { exact: true })).toBeFocused()
    await page.keyboard.insertText('SenhaDeTeste123')
    await page.getByLabel('Confirmar nova senha').fill('Diferente123')
    await page.keyboard.press('Enter')
    await expect(summary).toBeFocused()
    await expect(page.locator('#new-password-confirmation-error')).toHaveText(
      'As senhas não coincidem.',
    )
    expect(attempts).toBe(0)
    await page
      .getByRole('button', { name: 'Mostrar senha', exact: true })
      .first()
      .click()
    await expect(
      page.getByLabel('Nova senha', { exact: true }),
    ).toHaveAttribute('type', 'text')
    await page.getByRole('button', { name: 'Ocultar senha' }).click()
    await expect(
      page.getByLabel('Nova senha', { exact: true }),
    ).toHaveAttribute('type', 'password')
    await page.getByLabel('Confirmar nova senha').fill('SenhaDeTeste123')
    await page.keyboard.press('Enter')
    await expect(page.getByRole('alert')).toContainText('Falha temporária')
    await expect(page.getByLabel('Nova senha', { exact: true })).toHaveValue(
      'SenhaDeTeste123',
    )
    failed = false
    await page.getByRole('button', { name: 'Salvar nova senha' }).click()
    await expect(
      page.getByRole('heading', { name: 'Senha atualizada.' }),
    ).toBeVisible()
    expect(attempts).toBe(2)
  })

  test('permite recuperar com sessão existente e remove o snapshot antigo antes de entrar', async ({
    page,
  }) => {
    await page.route('**/api/auth/session', (route) =>
      route.fulfill({ json: student }),
    )
    await page.route('**/api/auth/redefinir-senha', (route) =>
      route.fulfill({ status: 204 }),
    )
    await page.goto('/recuperar-senha')
    await expect(page.getByLabel('E-mail do cadastro')).toBeVisible()
    await page.goto(resetPath)
    await expect(page.getByLabel('Nova senha', { exact: true })).toBeVisible()
    await page.getByLabel('Nova senha', { exact: true }).fill('SenhaDeTeste123')
    await page.getByLabel('Confirmar nova senha').fill('SenhaDeTeste123')
    await page.getByRole('button', { name: 'Salvar nova senha' }).click()
    await expect(
      page.getByRole('heading', { name: 'Senha atualizada.' }),
    ).toBeVisible()
    await page.getByRole('link', { name: 'Entrar com a nova senha' }).click()
    await expect(page).toHaveURL(/\/login$/)
    await expect(
      page.getByRole('button', { name: 'Entrar na minha conta' }),
    ).toBeVisible()
  })
})

test('demonstração explica a indisponibilidade sem simular envio ou redefinição', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'demo', 'Verifica a demonstração local.')
  let requests = 0
  await page.route('**/api/auth/{recuperar-senha,redefinir-senha}', (route) => {
    requests++
    return route.fulfill({ status: 204 })
  })
  await page.goto('/login')
  await page.getByRole('link', { name: 'Esqueci minha senha' }).click()
  await expect(page.getByText('Disponível no sistema conectado')).toBeVisible()
  await expect(
    page.getByText(
      /A demonstração não envia e-mails nem altera senhas por link/,
    ),
  ).toBeVisible()
  await expect(page.getByLabel('E-mail do cadastro')).toHaveCount(0)
  await page.goto(resetPath)
  await expect(page).toHaveURL(/\/redefinir-senha$/)
  await expect(page.getByText('Disponível no sistema conectado')).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Salvar nova senha' }),
  ).toHaveCount(0)
  expect(requests).toBe(0)
})
