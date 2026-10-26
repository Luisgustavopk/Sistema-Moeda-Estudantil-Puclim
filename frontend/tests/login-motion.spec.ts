import { expect, test } from '@playwright/test'

declare global {
  interface Window {
    coinAudio: { starts: number; stops: number }
  }
}

test.beforeEach(async ({ page }) => {
  await page.route('**/api/auth/session', (route) =>
    route.fulfill({ json: null }),
  )
  await page.route('**/api/instituicoes', (route) =>
    route.fulfill({ json: [] }),
  )
  await page.addInitScript(() => {
    const state = { starts: 0, stops: 0 }
    Object.assign(window, { coinAudio: state })
    const start = OscillatorNode.prototype.start
    const stop = OscillatorNode.prototype.stop
    OscillatorNode.prototype.start = function (...args) {
      state.starts++
      return start.apply(this, args)
    }
    OscillatorNode.prototype.stop = function (...args) {
      state.stops++
      return stop.apply(this, args)
    }
  })
})

test('moeda gira por clique e teclado, toca após o gesto e respeita silêncio', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/login')
  const audioStarts = () => page.evaluate(() => window.coinAudio.starts)
  expect(await audioStarts()).toBe(0)
  const coin = page.getByRole('button', { name: 'Girar moeda e ouvir seu som' })
  await expect(coin.locator('.login-coin-front > svg')).toHaveAttribute(
    'data-coin-face',
    'logo',
  )
  await expect(coin.locator('.login-coin-back > svg')).toHaveAttribute(
    'data-coin-face',
    'crown',
  )
  await expect(coin.locator('.login-coin-model')).toHaveCSS('transform', 'none')
  await coin.click()
  await expect.poll(audioStarts).toBe(3)
  await expect(coin).toHaveAttribute('aria-busy', 'true')
  const model = coin.locator('.login-coin-model')
  const frames = await model.evaluate(async (element) => {
    const before = getComputedStyle(element).transform
    for (let i = 0; i < 4; i++) await new Promise(requestAnimationFrame)
    return [before, getComputedStyle(element).transform]
  })
  expect(frames[0]).not.toBe(frames[1])
  await coin.click()
  await expect.poll(audioStarts).toBe(6)
  await coin.focus()
  await page.keyboard.press('Space')
  await expect.poll(audioStarts).toBe(9)
  await page.getByRole('button', { name: 'Silenciar efeitos sonoros' }).click()
  await page
    .getByRole('button', { name: 'Girar moeda com som silenciado' })
    .click()
  expect(await audioStarts()).toBe(9)
  await expect(page.getByRole('status').first()).toContainText('silenciado')
  await expect(coin).toHaveCount(0)
  await page.reload()
  await expect(
    page.getByRole('button', { name: 'Ativar efeitos sonoros' }),
  ).toBeVisible()
})

test('arraste gira nos dois eixos com mouse e toque, continua ao soltar e pode ser interrompido', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/login')
  const coin = page.getByRole('button', { name: 'Girar moeda e ouvir seu som' })
  const model = coin.locator('.login-coin-model')
  const bounds = (await coin.boundingBox())!
  const x = bounds.x + bounds.width / 2
  const y = bounds.y + bounds.height / 2
  await page.mouse.move(x, y)
  await page.mouse.down()
  await expect(coin).toHaveAttribute('data-dragging', 'true')
  expect(await page.evaluate(() => window.coinAudio.starts)).toBe(0)
  await page.mouse.move(x + 50, y + 60, { steps: 8 })
  await expect.poll(() => page.evaluate(() => window.coinAudio.starts)).toBe(3)
  const pose = await model.evaluate((element) => element.style.transform)
  expect(pose).toMatch(/rotateX\(-[\d.]+deg\) rotateY\([\d.]+deg\)/)
  await page.mouse.up()
  await expect(coin).not.toHaveAttribute('data-dragging', 'true')
  expect(
    await model.evaluate((element) => element.getAnimations().length),
  ).toBe(1)
  expect(await page.evaluate(() => window.coinAudio.starts)).toBe(3)
  await page.mouse.move(x, y)
  await page.mouse.down()
  expect(
    await model.evaluate((element) => element.getAnimations().length),
  ).toBe(0)
  await page.mouse.move(x - 40, y - 50, { steps: 8 })
  await page.mouse.up()
  await expect(coin).not.toHaveAttribute('aria-busy', 'true')

  await page.setViewportSize({ width: 390, height: 1000 })
  await page.getByRole('button', { name: 'Silenciar efeitos sonoros' }).click()
  const touchBounds = (await page.locator('.login-coin-button').boundingBox())!
  const tx = touchBounds.x + touchBounds.width / 2
  const ty = touchBounds.y + touchBounds.height / 2
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: tx, y: ty }],
  })
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [{ x: tx - 40, y: ty + 30 }],
  })
  await expect(page.locator('.login-coin-button')).toHaveAttribute(
    'data-dragging',
    'true',
  )
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchEnd',
    touchPoints: [],
  })
  await expect(page.locator('.login-coin-button')).not.toHaveAttribute(
    'aria-busy',
    'true',
  )
  await cdp.detach()
})

test('restaurar posição interrompe o giro, retorna à logo e funciona por teclado sem som', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/login')
  const coin = page.locator('.login-coin-button')
  const model = coin.locator('.login-coin-model')
  const reset = page.getByRole('button', { name: 'Restaurar posição da moeda' })
  await coin.click()
  await expect(coin).toHaveAttribute('aria-busy', 'true')
  await reset.click()
  await expect(coin).not.toHaveAttribute('aria-busy', 'true')
  expect(await model.evaluate((node) => node.style.transform)).toBe(
    'rotateX(0deg) rotateY(0deg)',
  )
  await expect(page.getByRole('status').first()).toContainText(
    'posição inicial',
  )
  const starts = await page.evaluate(() => window.coinAudio.starts)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await reset.focus()
  await page.keyboard.press('Enter')
  await expect(reset).toBeFocused()
  await expect(coin).not.toHaveAttribute('aria-busy', 'true')
  expect(await model.evaluate((node) => node.style.transform)).toBe(
    'rotateX(0deg) rotateY(0deg)',
  )
  expect(await page.evaluate(() => window.coinAudio.starts)).toBe(starts)
})

test('ambiente pode pausar e movimento reduzido mantém a interação sem rotação', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/login')
  await page.getByRole('button', { name: 'Pausar animações' }).click()
  const orbit = page.locator('.login-circulation')
  await expect(orbit).toHaveCSS('animation-play-state', 'paused')
  await expect(page.locator('.login-line-flow').first()).toHaveCSS(
    'animation-play-state',
    'paused',
  )
  await page.getByRole('button', { name: 'Retomar animações' }).click()
  await expect(orbit).toHaveCSS('animation-play-state', 'running')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect(orbit).toHaveCSS('animation-name', 'none')
  await expect(
    page.getByRole('button', { name: 'Pausar animações' }),
  ).toBeHidden()
  await page.getByRole('button', { name: 'Silenciar efeitos sonoros' }).click()
  const coin = page.getByRole('button', {
    name: 'Girar moeda com som silenciado',
  })
  await coin.click()
  expect(
    await coin
      .locator('.login-coin-model')
      .evaluate((element) =>
        element
          .getAnimations()
          .every((animation) =>
            (animation.effect as KeyframeEffect)
              .getKeyframes()
              .every((frame) => !frame.transform),
          ),
      ),
  ).toBe(true)
  await expect(page.getByLabel('Login ou e-mail')).toBeVisible()
})

test('composição integrada preserva formulário e moeda em todas as larguras e temas', async ({
  page,
}, info) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/login/')
  await expect(page.locator('.auth-story')).toHaveCount(0)
  for (const theme of ['light', 'dark']) {
    if (theme === 'dark')
      await page.getByRole('button', { name: 'Ativar modo escuro' }).click()
    for (const width of [320, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 1000 })
      await expect(page.locator('h1')).toHaveCount(1)
      await expect(page.getByLabel('Login ou e-mail')).toBeVisible()
      await expect(page.getByLabel('Senha', { exact: true })).toBeVisible()
      const loginField = (await page
        .getByLabel('Login ou e-mail')
        .boundingBox())!
      const passwordField = (await page
        .getByLabel('Senha', { exact: true })
        .boundingBox())!
      expect(passwordField.y).toBeGreaterThan(loginField.y + loginField.height)
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true)
      const coin = await page.locator('.login-coin-front').boundingBox()
      expect(coin!.x).toBeGreaterThanOrEqual(0)
      expect(coin!.x + coin!.width).toBeLessThanOrEqual(width)
      const panel = (await page.locator('.login-panel').boundingBox())!
      const scene = (await page.locator('.login-intro').boundingBox())!
      if (width >= 768) {
        expect(scene.x).toBeGreaterThanOrEqual(panel.x + panel.width + 24)
        expect(
          Math.abs(scene.y + scene.height / 2 - panel.y - panel.height / 2),
        ).toBeLessThan(2)
      } else {
        expect(scene.y + scene.height).toBeLessThanOrEqual(panel.y)
      }
      if ([390, 768, 1440].includes(width))
        await page.screenshot({
          path: info.outputPath(`login-${theme}-${width}.png`),
          fullPage: true,
          animations: 'disabled',
        })
    }
  }
  await page.getByRole('button', { name: 'Entrar na minha conta' }).click()
  await expect(page.getByRole('alert')).toHaveCount(2)
  await expect(page.getByLabel('Login ou e-mail')).toBeFocused()
  await expect(page.getByLabel('Login ou e-mail')).toHaveAttribute(
    'aria-describedby',
    'login-error',
  )
  await page.getByRole('link', { name: 'Crie sua conta' }).click()
  await expect(page).toHaveURL(/\/cadastro\/aluno$/)
  await expect(page.locator('.login-experience')).toHaveCount(0)
  expect(errors).toEqual([])
})
