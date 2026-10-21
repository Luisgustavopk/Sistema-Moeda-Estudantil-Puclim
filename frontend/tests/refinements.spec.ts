import { expect, test, type Page } from '@playwright/test'
import { mockDesignReview } from './design-round1-fixture'
import { profile, ranks, mockGame } from './gamification-fixture'
import { chooseOption } from './select-option'
declare global {
  interface Window {
    confirmationStarts: number[]
  }
}

for (const width of [360, 768, 1440]) {
  test(`ranking preserva retratos e dimensiona iniciais e fotos em ${width}`, async ({
    page,
  }, info) => {
    await mockGame(page)
    await page.setViewportSize({ width, height: 1000 })
    await page.addInitScript(() => localStorage.setItem('puclim.theme', 'dark'))
    const photo = '/api/gamificacao/perfil/avatar/ranking-photo'
    await page.route(
      (url) => url.pathname === photo,
      (route) =>
        route.fulfill({
          contentType: 'image/svg+xml',
          body: '<svg xmlns="http://www.w3.org/2000/svg" width="160" height="120"><path fill="#0f4c5c" d="M0 0h160v120H0z"/><circle cx="80" cy="45" r="24" fill="#e8b896"/><path fill="#d1a21c" d="M20 120a60 50 0 0 1 120 0"/></svg>',
        }),
    )
    const avatars = ['portrait', 'initials', photo, 'graduate', undefined]
    await page.route(
      (url) => url.pathname === '/api/gamificacao/ranking',
      (route) =>
        route.fulfill({
          json: {
            content: ranks.slice(0, 20).map((row, index) => ({
              ...row,
              avatar: avatars[index % avatars.length],
            })),
            page: 0,
            size: 20,
            total: ranks.length,
            own: ranks[23],
            semester: '2026-2',
            type: 'MOEDAS',
          },
        }),
    )
    await page.goto('/ranking')
    const rows = page.locator('.ranking-row')
    await expect(rows).toHaveCount(20)
    await expect(rows.nth(0).locator('svg.avatar')).toBeVisible()
    await expect(rows.nth(4).locator('svg.avatar')).toBeVisible()
    await expect(rows.nth(1).locator('.profile-initials')).toHaveText('LS')
    await expect(rows.nth(2).locator('img.avatar')).toHaveAttribute(
      'src',
      photo,
    )
    expect(
      await rows
        .nth(2)
        .locator('img')
        .evaluate((el) => (el as HTMLImageElement).naturalWidth),
    ).toBeGreaterThan(0)
    for (const avatar of await page.locator('.ranking-list-avatar > *').all()) {
      const bounds = await avatar.boundingBox()
      expect(bounds!.width).toBe(44)
      expect(bounds!.height).toBe(44)
    }
    expect(
      await rows
        .nth(1)
        .locator('.profile-initials')
        .evaluate((el) => parseFloat(getComputedStyle(el).fontSize)),
    ).toBeLessThanOrEqual(16)
    expect(
      (await rows.nth(3).locator('.profile-initials > svg').boundingBox())!
        .width,
    ).toBe(24)
    for (let position = 1; position <= 3; position++) {
      const avatar = page.locator(`.podium-${position} .rank-avatar > *`)
      const bounds = await avatar.boundingBox()
      const size =
        width < 768 ? (position === 1 ? 46 : 40) : position === 1 ? 76 : 58
      expect(bounds!.width).toBe(size)
      expect(bounds!.height).toBe(size)
    }
    await page.screenshot({
      path: info.outputPath(`ranking-${width}.png`),
      fullPage: true,
      animations: 'disabled',
    })
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy()
    await rows.first().click()
    await expect(page).toHaveURL(/\/perfis\/student-0$/)
    await expect(page.locator('.public-display-name')).toBeVisible()
  })
}

async function finishQuiz(page: Page) {
  await page.goto('/aluno/quiz')
  await page.getByRole('button', { name: 'Iniciar quiz de hoje' }).click()
  for (let i = 0; i < 5; i++) {
    await page.getByRole('radio').first().check()
    await page
      .getByRole('button', {
        name: i === 4 ? 'Concluir quiz' : 'Próxima pergunta',
      })
      .click()
  }
  await expect(
    page.getByRole('dialog', { name: 'Quiz concluído', exact: true }),
  ).toBeVisible()
  await expect(page.getByRole('dialog').getByRole('link')).toHaveCount(0)
}
// Compara quadros efetivos: ter apenas uma regra @keyframes não garante movimento.
async function motionFrames(locator: import('@playwright/test').Locator) {
  return locator.evaluate(async (element) => {
    const sample = () => {
      const style = getComputedStyle(element)
      return [style.transform, style.opacity].join('|')
    }
    const first = sample()
    const start = performance.now()
    await new Promise<void>((resolve) => {
      const next = () =>
        performance.now() - start >= 280
          ? resolve()
          : requestAnimationFrame(next)
      requestAnimationFrame(next)
    })
    return [first, sample()]
  })
}
for (const theme of ['light', 'dark']) {
  test(`raridades com acentos e caixa livre mantêm cor, ornamentos e filtro em ${theme}`, async ({
    page,
  }, info) => {
    await mockGame(page)
    await page.addInitScript(
      (value) => localStorage.setItem('puclim.theme', value),
      theme,
    )
    const variants = [' fácil ', 'Comum', 'rArA', 'Épica', 'Lendária']
    await page.route(
      (url) => url.pathname === '/api/gamificacao/perfil',
      (route) =>
        route.fulfill({
          json: {
            ...profile,
            badges: profile.badges.flatMap((badge, index) =>
              [badge.rarity, variants[index]].map((rarity, variant) => ({
                ...badge,
                id: `${badge.id}-${variant}`,
                name: `${badge.name} ${variant}`,
                rarity,
                icon: 'Award',
                progress: badge.target,
                unlockedAt: '2026-10-20T12:00:00Z',
              })),
            ),
          },
        }),
    )
    await page.goto('/aluno/conquistas')
    await expect(page.locator('.achievement-card')).toHaveCount(10)
    const colors: string[] = []
    for (const rarity of ['facil', 'comum', 'rara', 'epica', 'lendaria']) {
      const medals = page.locator(`.achievement-card [data-rarity="${rarity}"]`)
      await expect(medals).toHaveCount(2)
      const styles = await medals.evaluateAll((elements) =>
        elements.map((el) => ({
          color: getComputedStyle(el).color,
          border: getComputedStyle(el).borderRadius,
          ornaments: el.querySelectorAll('.medal-ornaments').length,
        })),
      )
      expect(styles[0]).toEqual(styles[1])
      colors.push(styles[0].color)
      if (['rara', 'epica', 'lendaria'].includes(rarity))
        expect(styles[0].ornaments).toBe(1)
    }
    expect(new Set(colors).size).toBe(5)
    await page.screenshot({
      path: info.outputPath('raridades-legadas.png'),
      fullPage: true,
      animations: 'disabled',
    })
    await chooseOption(
      page.getByRole('combobox', { name: 'Raridade', exact: true }),
      'EPICA',
    )
    await expect(page.locator('.achievement-card')).toHaveCount(2)
    await expect(
      page.locator('.achievement-card [data-rarity="epica"]'),
    ).toHaveCount(2)
  })
}
test('fogo da constância se move de fato e continua legível nas três larguras', async ({
  page,
}, info) => {
  await mockGame(page)
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.addInitScript(() => localStorage.setItem('puclim.theme', 'dark'))
  await page.goto('/aluno/quiz')
  const flame = page.locator('.quiz-consistency .streak-flame')
  for (const width of [360, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 })
    await flame.scrollIntoViewIfNeeded()
    await expect(flame).not.toHaveAttribute('data-motion-paused', '')
    const frames = await motionFrames(flame.locator('.flame-outer'))
    expect(frames[0]).not.toBe(frames[1])
    const core = await motionFrames(flame.locator('.flame-core'))
    expect(core[0]).not.toBe(core[1])
    await page
      .locator('.quiz-consistency')
      .screenshot({ path: info.outputPath(`fogo-${width}.png`) })
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy()
  }
  await page.emulateMedia({ reducedMotion: 'reduce' })
  expect((await motionFrames(flame.locator('.flame-outer')))[0]).toBe('none|1')
  expect(
    await flame
      .locator('i')
      .first()
      .evaluate((el) => getComputedStyle(el).display),
  ).toBe('none')
})
for (const mode of ['mute', 'unavailable']) {
  test(`ondas se propagam no envio mesmo com áudio ${mode}`, async ({
    page,
  }, info) => {
    await mockGame(page)
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    if (mode === 'unavailable')
      await page.setViewportSize({ width: 360, height: 800 })
    if (mode === 'mute')
      await page.addInitScript(() =>
        localStorage.setItem('puclim.confirmation-sounds', 'off'),
      )
    else await page.route('**/sounds/*.mp3', (route) => route.abort())
    await finishQuiz(page)
    const feedback = page.locator('dialog .confirmation-feedback')
    await expect(feedback).toContainText('Quiz enviado')
    await expect(feedback).not.toHaveClass(/is-playing/)
    await expect(feedback.locator('.sound-wave')).toHaveCount(3)
    const wave = feedback.locator('.sound-wave').first()
    const frames = await motionFrames(wave)
    expect(frames[0]).not.toBe(frames[1])
    const bounds = await feedback.locator('.sound-wavefronts').boundingBox()
    expect(bounds!.width).toBeGreaterThanOrEqual(200)
    expect(bounds!.x).toBeGreaterThanOrEqual(0)
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(
      page.viewportSize()!.width,
    )
    await page.screenshot({ path: info.outputPath('onda-em-movimento.png') })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    expect(
      await wave.evaluate((el) => getComputedStyle(el).animationName),
    ).toBe('none')
    await expect(feedback).toHaveCount(0, { timeout: 5000 })
  })
}
test('personalização integrada salva na API e permanece após recarregar', async ({
  page,
}) => {
  await mockDesignReview(page)
  await page.goto('/perfil/editar')
  await page
    .getByLabel('Nome de exibição', { exact: true })
    .fill('Mari do campus')
  await page
    .getByLabel('Resumo', { exact: true })
    .fill('Construindo conhecimento em comunidade.')
  const saved = page.waitForRequest(
    (request) =>
      request.method() === 'PUT' &&
      request.url().endsWith('/perfil/personalizacao'),
  )
  await page.getByRole('button', { name: 'Salvar perfil', exact: true }).click()
  expect((await saved).postDataJSON().displayName).toBe('Mari do campus')
  await expect(
    page.getByText('Perfil salvo. Sua personalização foi atualizada.'),
  ).toBeVisible()
  await page.reload()
  await expect(
    page.getByLabel('Nome de exibição', { exact: true }),
  ).toHaveValue('Mari do campus')
  await page
    .getByRole('link', { name: 'Ver perfil público', exact: true })
    .click()
  await expect(page.locator('.public-display-name')).toHaveText(
    'Mari do campus',
  )
  await expect(page.locator('.profile-bio')).toContainText('comunidade')
})
test('select arredondado opera por teclado, mantém valor no Escape e integra formulário', async ({
  page,
}) => {
  await mockDesignReview(page)
  await page.goto('/perfil/editar')
  await page.getByRole('button', { name: 'Privacidade', exact: true }).click()
  const trigger = page.getByRole('combobox', { name: 'Quem pode ver o perfil' })
  await trigger.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('listbox')).toBeVisible()
  expect(
    await page
      .locator('.select-menu')
      .evaluate((el) => parseFloat(getComputedStyle(el).borderRadius)),
  ).toBeGreaterThanOrEqual(12)
  await page.keyboard.press('End')
  await page.keyboard.press('Escape')
  await expect(trigger).toContainText('Alunos e professores autenticados')
  await expect(trigger).toBeFocused()
  await chooseOption(trigger, 'private')
  const saved = page.waitForRequest(
    (r) => r.method() === 'PUT' && r.url().endsWith('/personalizacao'),
  )
  await page.getByRole('button', { name: 'Salvar perfil', exact: true }).click()
  expect((await saved).postDataJSON().visibility).toBe('private')
})
test('som real toca uma vez no envio, não toca ao consultar resultado e respeita preferência', async ({
  page,
}) => {
  await mockGame(page)
  await page.addInitScript(() => {
    const original = AudioBufferSourceNode.prototype.start
    const events: number[] = []
    Object.assign(window, { confirmationStarts: events })
    AudioBufferSourceNode.prototype.start = function (
      ...args: Parameters<typeof original>
    ) {
      events.push(this.buffer?.duration || 0)
      return original.apply(this, args)
    }
  })
  await finishQuiz(page)
  await expect
    .poll(() => page.evaluate(() => window.confirmationStarts.length))
    .toBe(1)
  await expect(page.locator('dialog .confirmation-feedback')).toContainText(
    'Quiz enviado',
  )
  const duration = await page.evaluate(() => window.confirmationStarts[0])
  expect(duration).toBeGreaterThan(0.5)
  expect(duration).toBeLessThan(3.5)
  await page.reload()
  await expect(
    page.getByText('Seu estudo de hoje está concluído'),
  ).toBeVisible()
  expect(await page.evaluate(() => window.confirmationStarts.length)).toBe(0)
  await page.goto('/perfil')
  await page.getByLabel('Sons de confirmação', { exact: true }).uncheck()
  await page.reload()
  await expect(
    page.getByLabel('Sons de confirmação', { exact: true }),
  ).not.toBeChecked()
})
test('movimento reduzido mantém fogo e medalhas estáticos e cinco raridades distintas', async ({
  page,
}) => {
  await mockDesignReview(page)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.route(
    (url) => url.pathname === '/api/gamificacao/perfil',
    (route) =>
      route.fulfill({
        json: {
          ...profile,
          badges: profile.badges.map((b) => ({
            ...b,
            unlockedAt: '2026-10-20T12:00:00Z',
            progress: b.target,
          })),
        },
      }),
  )
  await page.goto('/aluno/conquistas')
  await expect(page.locator('.achievement-card')).toHaveCount(5)
  const colors = await page
    .locator('.achievement-card .merit-medal')
    .evaluateAll((elements) => elements.map((el) => getComputedStyle(el).color))
  expect(new Set(colors).size).toBe(5)
  await page.goto('/aluno/quiz')
  await expect(page.locator('.is-burning').first()).toBeVisible()
  expect(
    await page
      .locator('.is-burning > svg')
      .first()
      .evaluate((el) => getComputedStyle(el).animationName),
  ).toBe('none')
})
test('resgates alternam os sons, silêncio é respeitado e falha não celebra', async ({
  page,
}) => {
  await mockGame(page)
  await page.addInitScript(() => {
    const original = AudioBufferSourceNode.prototype.start
    window.confirmationStarts = []
    AudioBufferSourceNode.prototype.start = function (
      ...args: Parameters<typeof original>
    ) {
      window.confirmationStarts.push(this.buffer?.duration || 0)
      return original.apply(this, args)
    }
  })
  await page.route(
    (url) => url.pathname === '/api/vantagens',
    (route) =>
      route.fulfill({
        json: [
          {
            id: 'adv',
            name: 'Uma pausa no campus',
            description: 'Um café para acompanhar o estudo.',
            companyName: 'Cantina Central',
            companyId: 'company',
            cost: 10,
            active: true,
            category: 'Alimentação',
            photo:
              'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"%3E%3Crect width="64" height="64" fill="%230f4c5c"/%3E%3C/svg%3E',
          },
        ],
      }),
  )
  let count = 0,
    fail = false
  await page.route(
    (url) => url.pathname === '/api/vantagens/adv/resgates',
    (route) =>
      fail
        ? route.fulfill({
            status: 500,
            json: { message: 'Resgate indisponível' },
          })
        : route.fulfill({
            json: {
              id: `coupon-${++count}`,
              code: `PUCLIM-${count}`,
              advantageName: 'Uma pausa no campus',
              companyName: 'Cantina Central',
              cost: 10,
              status: 'ATIVO',
              date: '2026-10-21T12:00:00Z',
            },
          }),
  )
  await page.goto('/aluno/catalogo')
  const redeem = async () => {
    await page
      .getByRole('button', { name: 'Ver detalhes', exact: true })
      .first()
      .click()
    await page
      .getByRole('button', { name: 'Quero resgatar', exact: true })
      .click()
    await page
      .getByRole('button', { name: 'Confirmar resgate', exact: true })
      .click()
  }
  for (let i = 1; i <= 2; i++) {
    await redeem()
    await expect(page.getByRole('dialog')).toContainText(
      'Sua conquista virou vantagem!',
    )
    await expect
      .poll(() => page.evaluate(() => window.confirmationStarts.length))
      .toBe(i)
    await expect(page.locator('dialog .sound-wave')).toHaveCount(3)
    await page
      .getByRole('button', { name: 'Fechar janela', exact: true })
      .click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
  }
  const starts = await page.evaluate(() => window.confirmationStarts)
  expect(starts[0]).not.toBe(starts[1])
  await page.getByRole('link', { name: 'Minha conta', exact: true }).click()
  await page.getByLabel('Sons de confirmação', { exact: true }).uncheck()
  await page.getByRole('link', { name: 'Vantagens', exact: true }).click()
  await redeem()
  await expect(page.getByRole('dialog')).toContainText(
    'Sua conquista virou vantagem!',
  )
  await expect(page.locator('.confirmation-feedback')).toContainText(
    'Vantagem resgatada',
  )
  await expect(page.locator('.confirmation-feedback')).not.toHaveClass(
    /is-playing/,
  )
  expect(await page.evaluate(() => window.confirmationStarts.length)).toBe(2)
  await page.getByRole('button', { name: 'Fechar janela', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.locator('.confirmation-feedback')).toHaveCount(0)
  fail = true
  await redeem()
  await expect(page.getByRole('dialog')).toContainText('Resgate indisponível')
  await expect(page.locator('.confirmation-feedback')).toHaveCount(0)
  expect(await page.evaluate(() => window.confirmationStarts.length)).toBe(2)
})
test('avatar recortado é enviado antes das preferências e a prévia usa o asset salvo', async ({
  page,
}) => {
  await mockGame(page)
  await page.route(
    (url) => url.pathname === '/api/gamificacao/perfil/avatar',
    (route) =>
      route.fulfill({
        status: 201,
        json: {
          assetId: 'avatar',
          url: '/api/gamificacao/perfil/avatar/avatar',
          width: 256,
          height: 256,
        },
      }),
  )
  await page.goto('/perfil/editar')
  await page.getByRole('button', { name: 'Avatar', exact: true }).click()
  const png = await page.evaluate(() => {
    const c = document.createElement('canvas')
    c.width = 128
    c.height = 128
    c.getContext('2d')!.fillRect(0, 0, 128, 128)
    return c.toDataURL('image/png').split(',')[1]
  })
  await page.route(
    (url) => url.pathname === '/api/gamificacao/perfil/avatar/avatar',
    (route) =>
      route.fulfill({
        contentType: 'image/png',
        body: Buffer.from(png, 'base64'),
      }),
  )
  await page.getByLabel('Enviar avatar', { exact: false }).setInputFiles({
    name: 'avatar.png',
    mimeType: 'image/png',
    buffer: Buffer.from(png, 'base64'),
  })
  await page.getByRole('button', { name: 'Usar recorte', exact: true }).click()
  const uploaded = page.waitForRequest(
    (r) => r.url().endsWith('/perfil/avatar') && r.method() === 'POST',
  )
  const saved = page.waitForRequest(
    (r) => r.url().endsWith('/personalizacao') && r.method() === 'PUT',
  )
  await page.getByRole('button', { name: 'Salvar perfil', exact: true }).click()
  expect((await uploaded).headers()['content-type']).toContain(
    'multipart/form-data',
  )
  expect((await saved).postDataJSON().avatar).toBe(
    '/api/gamificacao/perfil/avatar/avatar',
  )
  await expect(page.locator('.editor-preview img.avatar')).toHaveAttribute(
    'src',
    '/api/gamificacao/perfil/avatar/avatar',
  )
})
for (const width of [360, 1440])
  for (const theme of ['light', 'dark']) {
    test(`refinamento visual ${width} ${theme}`, async ({ page }, info) => {
      await mockDesignReview(page)
      await page.setViewportSize({ width, height: 1000 })
      await page.route(
        (url) => url.pathname === '/api/instituicoes',
        (route) =>
          route.fulfill({
            json: [
              { id: 'institution', name: 'PUC Minas' },
              { id: 'example', name: 'Centro Universitário Exemplo' },
              { id: 'ufmg', name: 'UFMG' },
            ],
          }),
      )
      await page.addInitScript(
        (theme) => localStorage.setItem('puclim.theme', theme),
        theme,
      )
      const errors: string[] = []
      page.on('pageerror', (e) => errors.push(e.message))
      await page.goto('/ranking')
      await page
        .getByRole('combobox', { name: 'Instituição do ranking', exact: true })
        .click()
      await expect(page.getByRole('listbox')).toBeVisible()
      await page.screenshot({
        path: info.outputPath('dropdown.png'),
        animations: 'disabled',
      })
      await page.keyboard.press('Escape')
      await page.screenshot({
        path: info.outputPath('podio.png'),
        fullPage: true,
        animations: 'disabled',
      })
      await page.goto('/aluno/conquistas')
      await expect(page.locator('.achievement-card').first()).toBeVisible()
      await page.screenshot({
        path: info.outputPath('badges.png'),
        fullPage: true,
        animations: 'disabled',
      })
      await page.route(
        (url) => url.pathname === '/api/gamificacao/perfil',
        (route) =>
          route.fulfill({
            json: {
              ...profile,
              badges: profile.badges.map((b) => ({
                ...b,
                unlockedAt: '2026-10-20T12:00:00Z',
                progress: b.target,
              })),
            },
          }),
      )
      await page.reload()
      await expect(page.locator('.achievement-card')).toHaveCount(5)
      await page.screenshot({
        path: info.outputPath('badges-desbloqueadas.png'),
        fullPage: true,
        animations: 'disabled',
      })
      await page
        .locator('.achievement-card')
        .filter({ hasText: 'Destaque do semestre' })
        .click()
      await page.screenshot({
        path: info.outputPath('badge-lendaria.png'),
        animations: 'disabled',
      })
      await page.keyboard.press('Escape')
      await expect(page.getByRole('dialog')).toHaveCount(0)
      await page.goto('/aluno/quiz')
      await page
        .getByRole('button', { name: 'Ver resultado', exact: false })
        .first()
        .click()
      const dialog = page.getByRole('dialog')
      await expect(dialog).toBeVisible()
      await dialog.evaluate((el) =>
        Promise.all(el.getAnimations().map((a) => a.finished)),
      )
      const bounds = await dialog.boundingBox()
      if (width === 1440) expect(bounds!.width).toBeGreaterThanOrEqual(800)
      else expect(bounds!.width).toBeLessThanOrEqual(width)
      await page.screenshot({
        path: info.outputPath('resultado.png'),
        animations: 'disabled',
      })
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBeTruthy()
      expect(errors).toEqual([])
    })
  }
