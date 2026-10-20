import { expect, test } from '@playwright/test'

const student = {
  id: 'server-student',
  role: 'ALUNO',
  name: 'Aluno da API',
  email: 'api@exemplo.com',
  login: 'api',
  balance: 200,
  active: true,
  course: 'Software',
  institutionId: 'institution',
}

test('uma resposta de sessão atrasada não restaura a conta após logout', async ({
  page,
}) => {
  let authenticated = false
  let hold = false
  let waiting = false
  let release = () => undefined as void
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  await page.route(
    (url) => url.pathname.startsWith('/api/'),
    async (route) => {
      const path = new URL(route.request().url()).pathname
      if (path === '/api/gamificacao/perfil')
        return route.fulfill({
          status: 503,
          json: { message: 'Progresso temporariamente indisponível.' },
        })
      if (path === '/api/auth/login') {
        authenticated = true
        return route.fulfill({ json: student })
      }
      if (path === '/api/auth/logout') {
        authenticated = false
        return route.fulfill({ status: 204 })
      }
      if (path === '/api/auth/session') {
        const snapshot = authenticated ? student : null
        if (hold) {
          waiting = true
          await gate
        }
        return route.fulfill({ json: snapshot })
      }
      return route.fulfill({ json: [] })
    },
  )
  await page.goto('/login')
  await page.getByLabel('Login ou e-mail').fill('api')
  await page.getByLabel('Senha', { exact: true }).fill('SenhaApi@2026')
  await page.getByRole('button', { name: 'Entrar na minha conta' }).click()
  await expect(page.getByRole('heading', { name: 'Olá, Aluno!' })).toBeVisible()
  hold = true
  await page.evaluate(async () => {
    const { queryClient } = await import('/src/shared/lib/query-client.ts')
    void queryClient.invalidateQueries({ queryKey: ['session'] })
  })
  await expect.poll(() => waiting).toBeTruthy()
  await page.getByRole('button', { name: 'Sair da conta' }).click()
  await expect(page).toHaveURL(/\/login$/)
  const response = page.waitForResponse(
    (value) => new URL(value.url()).pathname === '/api/auth/session',
  )
  release()
  await response
  await page.waitForLoadState('networkidle')
  await expect(
    page.getByRole('button', { name: 'Entrar na minha conta' }),
  ).toBeVisible()
  await expect(page).toHaveURL(/\/login$/)
})
test('modo API exibe erro e permite repetir a consulta sem recorrer à demonstração', async ({
  page,
}) => {
  let authenticated = false
  let fail = true
  await page.route(
    (url) => url.pathname.startsWith('/api/'),
    async (route) => {
      const path = new URL(route.request().url()).pathname
      if (path === '/api/gamificacao/perfil')
        return route.fulfill({
          status: 503,
          json: { message: 'Progresso temporariamente indisponível.' },
        })
      if (path === '/api/auth/login') {
        authenticated = true
        return route.fulfill({ json: student })
      }
      if (path === '/api/auth/session')
        return route.fulfill({ json: authenticated ? student : null })
      if (path === '/api/conta/extrato')
        return fail
          ? route.fulfill({
              status: 503,
              json: { message: 'O extrato está temporariamente indisponível.' },
            })
          : route.fulfill({ json: [] })
      return route.fulfill({ json: [] })
    },
  )
  await page.goto('/login')
  await expect(page.getByText('Credenciais de demonstração')).toHaveCount(0)
  await page.getByLabel('Login ou e-mail').fill('api')
  await page.getByLabel('Senha', { exact: true }).fill('SenhaApi@2026')
  await page.getByRole('button', { name: 'Entrar na minha conta' }).click()
  await expect(page.getByRole('heading', { name: 'Olá, Aluno!' })).toBeVisible()
  await page.goto('/aluno/extrato')
  await expect(page.getByRole('alert')).toContainText(
    'O extrato está temporariamente indisponível.',
  )
  fail = false
  await page.getByRole('button', { name: 'Tentar novamente' }).click()
  await expect(
    page.getByRole('heading', { name: 'Nada por aqui neste período' }),
  ).toBeVisible()
  await expect(page.getByRole('alert')).toHaveCount(0)
  expect(
    await page.evaluate(() => localStorage.getItem('puclim.demo.v1')),
  ).toBeNull()
})

test('sessão não autenticada da API redireciona para o login', async ({
  page,
}) => {
  await page.route('**/api/auth/session', (route) =>
    route.fulfill({ status: 401, json: { message: 'Não autenticado.' } }),
  )
  await page.goto('/aluno/catalogo')
  await expect(page).toHaveURL(/\/login$/)
  await expect(
    page.getByRole('button', { name: 'Entrar na minha conta' }),
  ).toBeVisible()
})
