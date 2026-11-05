import { expect, test } from '@playwright/test'
import { mockGame, profile } from './gamification-fixture'
import {
  basicDemoRewards,
  type ProfileReward,
} from '../src/features/gamificacao/profile-rewards'
import type { Badge } from '../src/features/gamificacao/types'

const catalog: ProfileReward[] = [
  ...basicDemoRewards(profile),
  {
    id: 'campus-avatar',
    kind: 'AVATAR',
    name: 'Arte do avatar',
    requirement: 'Alcance o nível 2',
    requiredLevel: 2,
    badgeId: null,
    unlocked: true,
    visual: {
      icon: null,
      palette: 'TEAL',
      variant: 'PLAIN',
      assetUrl: '/images/rewards/test-avatar.png',
    },
  },
  {
    id: 'campus-orbit',
    kind: 'FRAME',
    name: 'Órbita do campus',
    requirement: 'Alcance o nível 2',
    requiredLevel: 2,
    badgeId: null,
    unlocked: true,
    visual: {
      icon: 'Sparkles',
      palette: 'TEAL',
      variant: 'PLAIN',
      motion: 'ORBIT',
      cycleMs: 4000,
    },
  },
  {
    id: 'campus-crown',
    kind: 'FRAME',
    name: 'Coroa do campus',
    requirement: 'Alcance o nível 3',
    requiredLevel: 3,
    badgeId: null,
    unlocked: true,
    visual: {
      icon: 'Crown',
      palette: 'GOLD',
      variant: 'DOUBLE',
      motion: 'CROWN',
      cycleMs: 2400,
    },
  },
  {
    id: 'campus-artwork',
    kind: 'FRAME',
    name: 'Arte do campus',
    requirement: 'Alcance o nível 2',
    requiredLevel: 2,
    badgeId: null,
    unlocked: true,
    visual: {
      icon: null,
      palette: 'TEAL',
      variant: 'PLAIN',
      assetUrl: '/images/rewards/test-art.png',
      avatarInset: 15,
      avatarShape: 'CIRCLE',
    },
  },
  {
    id: 'campus-locked',
    kind: 'FRAME',
    name: 'Moldura futura',
    requirement: 'Alcance o nível 5',
    requiredLevel: 5,
    badgeId: null,
    unlocked: false,
    visual: { icon: 'Trophy', palette: 'GOLD', variant: 'DOUBLE' },
  },
]

const first = profile.badges[0]
const recognition: Badge[] = [
  { ...first, family: 'RECOGNITION', tier: 'BRONZE' },
  {
    ...first,
    id: 'COINS_SILVER',
    name: 'Reconhecimento · Prata',
    target: 100,
    progress: 100,
    family: 'RECOGNITION',
    tier: 'SILVER',
  },
  {
    ...first,
    id: 'COINS_GOLD',
    name: 'Reconhecimento · Ouro',
    target: 1000,
    progress: 430,
    unlockedAt: null,
    family: 'RECOGNITION',
    tier: 'GOLD',
  },
]

test('medalhas mostram as três etapas e os requisitos verificáveis', async ({
  page,
}) => {
  await mockGame(page, 'ALUNO', catalog)
  await page.route('**/api/gamificacao/perfil', (route) =>
    route.fulfill({ json: { ...profile, badges: recognition } }),
  )
  await page.goto('/aluno/conquistas')
  await expect(
    page.getByRole('heading', { name: 'Reconhecimento', exact: true }),
  ).toBeVisible()
  await expect(page.getByText('2 de 3 etapas conquistadas')).toBeVisible()
  await expect(page.locator('.merit-medal[data-tier="bronze"]')).toBeVisible()
  await expect(page.locator('.merit-medal[data-tier="silver"]')).toBeVisible()
  await page
    .getByRole('button', { name: 'Ver conquista: Reconhecimento · Ouro' })
    .click()
  await expect(page.getByRole('dialog')).toContainText('Moedas recebidas: 1000')
  await expect(
    page.getByRole('progressbar', { name: 'Progresso da conquista' }),
  ).toHaveAttribute('value', '430')
})

for (const width of [390, 820, 1440]) {
  test(`catálogo dinâmico, pausa, coroa e arte personalizada em ${width}px`, async ({
    page,
  }, testInfo) => {
    await mockGame(page, 'ALUNO', catalog)
    await page.setViewportSize({ width, height: 1000 })
    const artworkPng = await page.evaluate(() => {
      const canvas = document.createElement('canvas')
      canvas.width = canvas.height = 128
      const context = canvas.getContext('2d')!
      context.strokeStyle = '#0f4c5c'
      context.lineWidth = 8
      context.strokeRect(4, 4, 120, 120)
      return canvas.toDataURL('image/png').split(',')[1]
    })
    await page.route('**/images/rewards/test-art.png', (route) =>
      route.fulfill({
        contentType: 'image/png',
        body: Buffer.from(artworkPng, 'base64'),
      }),
    )
    await page.goto('/perfil/editar')
    await page.getByRole('button', { name: 'Molduras', exact: true }).click()
    const locked = page.getByRole('button', {
      name: 'Moldura: Moldura futura',
      exact: true,
    })
    await expect(locked).toHaveAttribute('aria-disabled', 'true')
    await locked.focus()
    await page.keyboard.press('Enter')
    await expect(locked).toHaveAttribute('aria-pressed', 'false')
    await page
      .getByRole('button', { name: 'Moldura: Órbita do campus', exact: true })
      .click()
    const orbit = page.locator('.editor-preview .frame-orbit')
    await page
      .locator('.editor-preview .public-avatar')
      .scrollIntoViewIfNeeded()
    await expect(orbit).toBeVisible()
    await expect
      .poll(() =>
        orbit.evaluate((el) => getComputedStyle(el).animationPlayState),
      )
      .toBe('running')
    const start = await orbit.evaluate((el) => getComputedStyle(el).transform)
    await page.waitForTimeout(120)
    expect(
      await orbit.evaluate((el) => getComputedStyle(el).transform),
    ).not.toBe(start)
    await page
      .getByRole('button', { name: 'Pausar efeito da moldura', exact: true })
      .click()
    await expect
      .poll(() =>
        orbit.evaluate((el) => getComputedStyle(el).animationPlayState),
      )
      .toBe('paused')
    await page.screenshot({
      path: testInfo.outputPath(`orbit-paused-${width}.png`),
      fullPage: true,
    })
    await page
      .getByRole('button', { name: 'Ativar efeito da moldura', exact: true })
      .click()
    await page
      .getByRole('button', { name: 'Moldura: Coroa do campus', exact: true })
      .click()
    await expect(page.locator('.editor-preview .frame-crown')).toBeVisible()
    await page.screenshot({
      path: testInfo.outputPath(`crown-${width}.png`),
      fullPage: true,
    })
    await page
      .getByRole('button', { name: 'Moldura: Arte do campus', exact: true })
      .click()
    await expect(page.locator('.sidebar-profile-avatar')).toHaveAttribute(
      'data-frame',
      'classic',
    )
    await expect(
      page.locator('.editor-preview .frame-artwork'),
    ).toHaveAttribute('src', '/images/rewards/test-art.png')
    await expect
      .poll(() =>
        page
          .locator('.editor-preview .frame-artwork')
          .evaluate((el) => (el as HTMLImageElement).naturalWidth),
      )
      .toBe(128)
    await page
      .getByRole('button', { name: 'Salvar perfil', exact: true })
      .click()
    await expect(
      page.getByText('Perfil salvo. Sua personalização foi atualizada.', {
        exact: false,
      }),
    ).toBeVisible()
    await expect(page.locator('.sidebar-profile-avatar')).toHaveAttribute(
      'data-frame',
      'campus-artwork',
    )
    await page.reload()
    await expect(
      page.locator('.editor-preview [data-frame="campus-artwork"]'),
    ).toBeVisible()
    await expect(page.locator('.editor-preview .frame-artwork')).toBeVisible()
    await expect(
      page.locator('.sidebar-profile-avatar .frame-artwork'),
    ).toHaveAttribute('src', '/images/rewards/test-art.png')
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy()
  })
}

test('movimento reduzido mantém a moldura estática e a preferência é atualizada ao vivo', async ({
  page,
}) => {
  await mockGame(page, 'ALUNO', catalog)
  await page.goto('/perfil/editar')
  await page.getByRole('button', { name: 'Molduras', exact: true }).click()
  await page
    .getByRole('button', { name: 'Moldura: Órbita do campus', exact: true })
    .click()
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect(
    page.getByText('Efeito estático: movimento reduzido ativado.'),
  ).toBeVisible()
  expect(
    await page
      .locator('.editor-preview .frame-orbit')
      .evaluate((el) => getComputedStyle(el).animationName),
  ).toBe('none')
  await expect(
    page.getByRole('button', { name: 'Ativar efeito da moldura', exact: true }),
  ).toHaveCount(0)
})

for (const width of [390, 820, 1440]) {
  test(`sidebar reflete a moldura salva e preserva a navegação em ${width}px`, async ({
    page,
  }, testInfo) => {
    await mockGame(page, 'ALUNO', catalog)
    await page.setViewportSize({ width, height: 1000 })
    await page.goto('/perfil/editar')
    await page.getByRole('button', { name: 'Molduras', exact: true }).click()
    await page
      .getByRole('button', { name: 'Moldura: Coroa do campus', exact: true })
      .click()
    await page
      .getByRole('button', { name: 'Salvar perfil', exact: true })
      .click()
    await expect(page.locator('.sidebar-profile-avatar')).toHaveAttribute(
      'data-frame',
      'campus-crown',
    )
    await page.reload()
    if (width < 768)
      await page
        .getByRole('button', { name: 'Abrir menu', exact: true })
        .click()
    const avatar = page.locator('.sidebar-profile-avatar')
    await expect(avatar).toBeVisible()
    await expect(avatar.locator('.frame-crown')).toBeVisible()
    const bounds = await avatar.boundingBox()
    expect(bounds?.width).toBe(44)
    expect(bounds?.height).toBe(44)
    for (const theme of ['light', 'dark']) {
      await page.evaluate((theme) => {
        localStorage.setItem('puclim.theme', theme)
        window.dispatchEvent(new Event('puclim:theme'))
      }, theme)
      await page.locator('.sidebar-user').screenshot({
        path: testInfo.outputPath(`sidebar-${width}-${theme}.png`),
      })
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBeTruthy()
    }
    if (width === 1440) {
      const crown = avatar.locator('.frame-crown')
      expect(
        await crown.evaluate((el) => getComputedStyle(el).animationPlayState),
      ).toBe('paused')
      await page.locator('.sidebar-avatar').hover()
      await expect
        .poll(() =>
          crown.evaluate((el) => getComputedStyle(el).animationPlayState),
        )
        .toBe('running')
      await page
        .getByRole('heading', { name: 'Editar perfil', exact: true })
        .hover()
      await expect
        .poll(() =>
          crown.evaluate((el) => getComputedStyle(el).animationPlayState),
        )
        .toBe('paused')
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await page.locator('.sidebar-avatar').hover()
      expect(
        await crown.evaluate((el) => getComputedStyle(el).animationName),
      ).toBe('none')
    }
    await page
      .getByRole('link', { name: 'Abrir minha conta', exact: true })
      .click()
    await expect(page).toHaveURL(/\/perfil$/)
    if (width < 768)
      await expect(
        page.getByRole('dialog', { name: 'Menu principal' }),
      ).toHaveCount(0)
  })
}

test('sidebar preserva o avatar padrão quando a personalização está indisponível', async ({
  page,
}) => {
  await mockGame(page)
  await page.route('**/api/gamificacao/perfil/personalizacao', (route) =>
    route.fulfill({ status: 503, json: { message: 'Indisponível' } }),
  )
  await page.goto('/aluno/conquistas')
  await expect(page.locator('.sidebar-profile-avatar')).toHaveAttribute(
    'data-frame',
    'classic',
  )
  await expect(page.locator('.sidebar-profile-avatar svg.avatar')).toBeVisible()
  await expect(
    page.getByRole('link', { name: 'Abrir minha conta', exact: true }),
  ).toBeEnabled()
  await expect(
    page.getByRole('button', { name: 'Sair da conta', exact: true }),
  ).toBeEnabled()
})

test('falha no catálogo apresenta recuperação sem liberar recompensas locais', async ({
  page,
}) => {
  await mockGame(page)
  await page.route('**/api/gamificacao/perfil/desbloqueios', (route) =>
    route.fulfill({
      status: 503,
      json: { message: 'Catálogo temporariamente indisponível.' },
    }),
  )
  await page.goto('/perfil/editar')
  await page.getByRole('button', { name: 'Molduras', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText(
    'Catálogo temporariamente indisponível.',
  )
  await expect(page.locator('.reward-option')).toHaveCount(0)
  await expect(
    page.getByRole('button', { name: 'Tentar novamente', exact: false }),
  ).toBeVisible()
})

for (const width of [390, 820, 1440]) {
  test(`Minha conta acompanha o avatar do catálogo e a foto enviada em ${width}px`, async ({
    page,
  }, testInfo) => {
    await mockGame(page, 'ALUNO', catalog)
    await page.setViewportSize({ width, height: 1000 })
    const png = await page.evaluate(() => {
      const canvas = document.createElement('canvas')
      canvas.width = canvas.height = 128
      const context = canvas.getContext('2d')!
      context.fillStyle = '#0f4c5c'
      context.fillRect(0, 0, 128, 128)
      return canvas.toDataURL('image/png').split(',')[1]
    })
    await page.route('**/images/rewards/test-avatar.png', (route) =>
      route.fulfill({
        contentType: 'image/png',
        body: Buffer.from(png, 'base64'),
      }),
    )
    const uploadedUrl = '/api/gamificacao/perfil/avatar/test-photo'
    await page.route('**/api/gamificacao/perfil/avatar', (route) => {
      expect(route.request().method()).toBe('POST')
      expect(route.request().headers()['content-type']).toContain(
        'multipart/form-data',
      )
      return route.fulfill({ json: { url: uploadedUrl } })
    })
    await page.route(`**${uploadedUrl}`, (route) =>
      route.fulfill({
        contentType: 'image/png',
        body: Buffer.from(png, 'base64'),
      }),
    )
    const openAccount = async () => {
      if (width < 768)
        await page
          .getByRole('button', { name: 'Abrir menu', exact: true })
          .click()
      await page
        .getByRole('link', { name: 'Abrir minha conta', exact: true })
        .click()
      await expect(page).toHaveURL(/\/perfil$/)
    }
    await page.goto('/perfil/editar')
    await page.getByRole('button', { name: 'Avatar', exact: true }).click()
    await page
      .getByRole('button', { name: 'Avatar: Arte do avatar', exact: true })
      .click()
    await page
      .getByRole('button', { name: 'Salvar perfil', exact: true })
      .click()
    await expect(
      page.getByText('Perfil salvo. Sua personalização foi atualizada.', {
        exact: false,
      }),
    ).toBeVisible()
    await openAccount()
    await expect(page.locator('.account-avatar img')).toHaveAttribute(
      'src',
      '/images/rewards/test-avatar.png',
    )
    await page.goto('/perfil/editar')
    await page.getByRole('button', { name: 'Avatar', exact: true }).click()
    await page.getByLabel('Enviar avatar', { exact: false }).setInputFiles({
      name: 'foto.png',
      mimeType: 'image/png',
      buffer: Buffer.from(png, 'base64'),
    })
    await page
      .getByRole('button', { name: 'Usar recorte', exact: true })
      .click()
    await expect(page.locator('.editor-preview img.avatar')).toHaveAttribute(
      'src',
      /^data:image\/png/,
    )
    await page
      .getByRole('button', { name: 'Salvar perfil', exact: true })
      .click()
    await expect(
      page.locator('.sidebar-profile-avatar img.avatar'),
    ).toHaveAttribute('src', uploadedUrl)
    await openAccount()
    const accountPhoto = page.locator('.account-avatar img')
    await expect(accountPhoto).toHaveAttribute('src', uploadedUrl)
    await page.reload()
    await expect(accountPhoto).toHaveAttribute('src', uploadedUrl)
    await expect(accountPhoto).toBeVisible()
    expect(
      await accountPhoto.evaluate(
        (image) => (image as HTMLImageElement).naturalWidth,
      ),
    ).toBeGreaterThan(0)
    const bounds = await page.locator('.account-avatar').boundingBox()
    expect(bounds?.width).toBe(width < 768 ? 54 : 96)
    expect(bounds?.height).toBe(bounds?.width)
    for (const theme of ['light', 'dark']) {
      await page.evaluate((theme) => {
        localStorage.setItem('puclim.theme', theme)
        window.dispatchEvent(new Event('puclim:theme'))
      }, theme)
      await page.locator('.profile-summary').screenshot({
        path: testInfo.outputPath(`account-photo-${width}-${theme}.png`),
      })
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBeTruthy()
    }
  })
}
