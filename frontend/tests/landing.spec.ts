import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.route('**/api/auth/session', (route) =>
    route.fulfill({ json: null }),
  )
  await page.route('**/api/instituicoes', (route) =>
    route.fulfill({ json: [] }),
  )
})

test('landing tem identidade própria e preserva os acessos', async ({
  page,
}) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Seu mérito.Em movimento.',
  )
  await expect(page.locator('.login-coin-button')).toHaveCount(0)
  await expect(
    page.locator('.lp-orbital-hero .lp-signal-bars > span'),
  ).toHaveCount(5)
  await page
    .locator('.lp-hero-cta')
    .getByRole('link', { name: 'Criar minha conta' })
    .click()
  await expect(page).toHaveURL(/\/cadastro\/aluno$/)
  await expect(page.getByLabel('Nome completo')).toBeVisible()
  await page.goto('/')
  await page.getByRole('link', { name: 'Entrar', exact: true }).click()
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByLabel('Login ou e-mail')).toBeVisible()
})

test('perfis funcionam com teclado e mantêm seus destinos', async ({
  page,
}) => {
  await page.goto('/')
  const students = page.getByRole('tab', { name: 'Estudantes', exact: true })
  await students.focus()
  await page.keyboard.press('ArrowRight')
  await expect(
    page.getByRole('tab', { name: 'Professores', exact: true }),
  ).toBeFocused()
  await expect(page.locator('#perfil-conteudo a')).toHaveAttribute(
    'href',
    '/login',
  )
  await page.keyboard.press('End')
  await expect(
    page.getByRole('tab', { name: 'Instituições', exact: true }),
  ).toBeFocused()
  await expect(page.locator('#perfil-conteudo')).toContainText(
    'Instituição de ensino',
  )
  await expect(page.locator('#perfil-conteudo a')).toHaveAttribute(
    'href',
    '/cadastro/empresa',
  )
  await page.getByRole('tab', { name: 'Empresas', exact: true }).click()
  await expect(page.locator('#perfil-conteudo a')).toHaveAttribute(
    'href',
    '/cadastro/empresa',
  )
  await page.getByRole('tab', { name: 'Estudantes', exact: true }).click()
  await expect(page.locator('#perfil-conteudo a')).toHaveAttribute(
    'href',
    '/cadastro/aluno',
  )
})

test('demonstração explica as três etapas e permite seleção e pausa', async ({
  page,
}) => {
  await page.clock.install()
  await page.goto('/')
  await page.locator('.lp-demo-canvas').scrollIntoViewIfNeeded()
  await page.clock.runFor(10000)
  await expect(page.locator('.lp-demo')).toHaveAttribute(
    'data-running',
    'false',
  )
  await expect(page.locator('.lp-demo')).toHaveAttribute('data-stage', '0')
  await page.getByRole('button', { name: 'Reproduzir demonstração' }).click()
  await expect(page.locator('.lp-demo')).toHaveAttribute('data-running', 'true')
  await page.clock.runFor(4100)
  await expect(page.locator('.lp-demo')).toHaveAttribute('data-stage', '1')
  await page.getByRole('button', { name: 'Pausar demonstração' }).click()
  const stage = await page.locator('.lp-demo').getAttribute('data-stage')
  await page.clock.runFor(10000)
  await expect(page.locator('.lp-demo')).toHaveAttribute('data-stage', stage!)
  await page.getByRole('tab', { name: 'Aproveitar', exact: true }).click()
  await expect(page.locator('#etapa-conteudo')).toContainText(
    'O mérito encontra possibilidades.',
  )
  await expect(page.locator('.lp-scene-redemption')).toHaveAttribute(
    'data-active',
    'true',
  )
  await page.getByRole('tab', { name: 'Aproveitar', exact: true }).focus()
  await page.keyboard.press('Home')
  await expect(
    page.getByRole('tab', { name: 'Reconhecer', exact: true }),
  ).toBeFocused()
  await expect(page.locator('.lp-demo')).toHaveAttribute('data-stage', '0')
  await page.getByRole('button', { name: 'Reproduzir demonstração' }).click()
  await page.locator('#inicio').scrollIntoViewIfNeeded()
  await page.clock.runFor(1000)
  await expect(page.locator('.lp-demo')).toHaveAttribute(
    'data-running',
    'false',
  )
  const offscreen = await page.locator('.lp-demo').getAttribute('data-stage')
  await page.clock.runFor(10000)
  await expect(page.locator('.lp-demo')).toHaveAttribute(
    'data-stage',
    offscreen!,
  )
  await page.getByRole('button', { name: 'Pausar animações' }).click()
  await page.locator('.lp-demo-canvas').scrollIntoViewIfNeeded()
  await page.clock.runFor(5000)
  await expect(page.locator('.lp-demo')).toHaveAttribute(
    'data-running',
    'false',
  )
  await page.getByRole('tab', { name: 'Aproveitar', exact: true }).click()
  await expect(page.locator('.lp-scene-redemption')).toHaveCSS('opacity', '1')
  await expect(
    page.getByRole('button', { name: 'Simular resgate' }),
  ).toBeVisible()
})

test('menu móvel prende o foco, fecha por Escape e mantém as âncoras', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await page.getByRole('button', { name: 'Pausar animações' }).click()
  const trigger = page.getByRole('button', { name: 'Abrir menu', exact: true })
  await trigger.click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.keyboard.press('Shift+Tab')
  await expect(
    page.getByRole('dialog').getByRole('link', { name: 'Criar minha conta' }),
  ).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await expect(trigger).toBeFocused()
  await trigger.click()
  await page
    .getByRole('navigation', { name: 'Navegação no celular' })
    .getByRole('link', { name: 'Possibilidades' })
    .click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await expect(page).toHaveURL(/#possibilidades$/)
  await expect(page.locator('#possibilidades')).toBeInViewport()
})

test('movimento reduzido mantém conteúdo visível e demonstração manual', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Pausar animações' }),
  ).not.toBeVisible()
  await page.locator('.lp-demo-canvas').scrollIntoViewIfNeeded()
  await expect(page.locator('.lp-demo')).toHaveAttribute(
    'data-running',
    'false',
  )
  await page.getByRole('tab', { name: 'Aproveitar', exact: true }).click()
  await expect(page.locator('.lp-scene-redemption')).toHaveCSS('opacity', '1')
  expect(
    await page
      .locator('.lp-scene-redemption')
      .evaluate((e) => e.getAnimations({ subtree: true }).length),
  ).toBe(0)
  await expect(
    page.locator('.lp-scene-redemption .lp-demo-ticket'),
  ).toBeVisible()
})

test('temas, preferências e respostas continuam acessíveis', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Ativar modo escuro' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect(page.locator('.puclim-landing')).toHaveCSS(
    'background-color',
    'rgb(16, 45, 51)',
  )
  const sound = page.getByRole('button', {
    name: /Silenciar efeitos sonoros|Ativar efeitos sonoros/,
  })
  const before = await sound.getAttribute('aria-pressed')
  await sound.click()
  await expect(sound).toHaveAttribute(
    'aria-pressed',
    before === 'true' ? 'false' : 'true',
  )
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect(sound).toHaveAttribute(
    'aria-pressed',
    before === 'true' ? 'false' : 'true',
  )
  const question = page.locator('summary', {
    hasText: 'As moedas são dinheiro?',
  })
  await question.focus()
  await page.keyboard.press('Enter')
  await expect(page.locator('details[open]')).toContainText('moedas virtuais')
})

test('reconhecimento e resgate simulados validam os campos e não enviam transações', async ({
  page,
}) => {
  const writes: string[] = []
  page.on('request', (request) => {
    if (request.url().includes('/api/') && request.method() !== 'GET')
      writes.push(request.url())
  })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  await page.getByLabel('Quantidade de moedas').fill('0')
  await page.getByRole('button', { name: 'Simular reconhecimento' }).click()
  await expect(page.getByRole('alert')).toHaveText(
    'Informe uma quantidade inteira maior que zero.',
  )
  await page.getByLabel('Quantidade de moedas').fill('80')
  await page.getByLabel('Motivo do reconhecimento').fill('')
  await page.getByRole('button', { name: 'Simular reconhecimento' }).click()
  await expect(page.getByRole('alert')).toHaveText(
    'Conte o motivo do reconhecimento.',
  )
  await page
    .getByLabel('Motivo do reconhecimento')
    .fill('Pela contribuição na pesquisa em grupo.')
  await page.getByRole('button', { name: 'Simular reconhecimento' }).click()
  await expect(page.locator('.lp-demo')).toHaveAttribute('data-stage', '1')
  await expect(page.locator('.lp-balance-number')).toHaveText('80')
  await expect(page.locator('.lp-recognition-slip')).toContainText(
    'Pela contribuição na pesquisa em grupo.',
  )
  await page.getByRole('tab', { name: 'Aproveitar', exact: true }).click()
  await page.getByRole('button', { name: 'Simular resgate' }).click()
  await expect(page.locator('.lp-demo-ticket')).toContainText(
    'Saldo do exemplo: 20 moedas.',
  )
  await expect(page.getByRole('status')).toContainText('não tem validade')
  expect(writes).toEqual([])
})

test('as quatro capturas do produto podem ser exploradas por teclado', async ({
  page,
}) => {
  await page.goto('/')
  const tab = page.getByRole('tab', { name: 'Meu espaço', exact: true })
  await tab.focus()
  await page.keyboard.press('End')
  await expect(
    page.getByRole('tab', { name: 'Reconhecimento', exact: true }),
  ).toBeFocused()
  await expect(
    page.locator('.lp-product-images img[data-active="true"]'),
  ).toHaveAttribute('src', '/images/landing/recognize.webp')
  await page.keyboard.press('Home')
  await page.keyboard.press('ArrowRight')
  await expect(
    page.getByRole('tab', { name: 'Catálogo', exact: true }),
  ).toBeFocused()
  await expect(
    page.locator('.lp-product-images img[data-active="true"]'),
  ).toHaveAttribute('src', '/images/landing/catalog.webp')
  await expect(page.locator('#tela-produto')).toContainText(
    'dados de demonstração',
  )
  const [capture] = await Promise.all([
    page.waitForEvent('popup'),
    page.getByRole('link', { name: 'Ver captura completa' }).click(),
  ])
  await capture.waitForLoadState('load')
  await expect(capture).toHaveURL(/\/images\/landing\/catalog\.webp$/)
  expect(
    await capture
      .locator('img')
      .evaluate((image) => (image as HTMLImageElement).naturalWidth),
  ).toBeGreaterThan(0)
  await capture.close()
})

test('jornada e produto compartilham reconhecimento, saldo e resgate sem transações reais', async ({
  page,
}) => {
  const writes: string[] = []
  page.on('request', (request) => {
    if (request.url().includes('/api/') && request.method() !== 'GET')
      writes.push(request.url())
  })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  await page.getByLabel('Quantidade de moedas').fill('80')
  await page
    .getByLabel('Motivo do reconhecimento')
    .fill('Pela colaboração na pesquisa.')
  await page
    .getByRole('button', { name: 'Simular reconhecimento', exact: true })
    .click()
  await expect(
    page.getByRole('tab', { name: 'Conquistar', exact: true }),
  ).toBeFocused()
  await expect(page.locator('.lp-live-amount > strong')).toHaveText('80')
  await expect(page.locator('.lp-live-receipt')).toContainText(
    'Pela colaboração na pesquisa.',
  )
  await page
    .getByRole('button', { name: 'Explorar vantagens', exact: true })
    .click()
  await expect(
    page.getByRole('tab', { name: 'Catálogo', exact: true }),
  ).toBeFocused()
  await page
    .getByRole('button', { name: 'Simular troca por esta vantagem' })
    .click()
  await expect(
    page.getByRole('tab', { name: 'Meus cupons', exact: true }),
  ).toBeFocused()
  await expect(page.locator('.lp-live-coupon-copy')).toContainText(
    'de 80 para 20 moedas',
  )
  await expect(page.locator('.lp-live-coupon')).toContainText('Sem validade')
  await page.getByRole('tab', { name: 'Aproveitar', exact: true }).click()
  await expect(page.locator('.lp-demo-ticket')).toContainText(
    'Saldo do exemplo: 20 moedas.',
  )
  await page.getByRole('tab', { name: 'Meu espaço', exact: true }).click()
  await expect(page.locator('.lp-live-amount > strong')).toHaveText('20')
  await page
    .getByRole('button', { name: 'Restaurar dados da demonstração' })
    .click()
  await expect(page.locator('.lp-live-amount > strong')).toHaveText('60')
  expect(writes).toEqual([])
})
