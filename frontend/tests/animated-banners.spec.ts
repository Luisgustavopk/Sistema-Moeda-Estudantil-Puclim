import { expect, test } from '@playwright/test'
import { mockGame, profile } from './gamification-fixture'
import {
  basicDemoRewards,
  type ProfileReward,
} from '../src/features/gamificacao/profile-rewards'

const earnedProfile = {
  ...profile,
  level: 5,
  totalReceived: 1500,
  nextLevelAt: null,
  levelStart: 1500,
  progressPercent: 100,
  maximumLevel: true,
}
const banners: ProfileReward[] = [
  {
    id: 'aurora',
    kind: 'BANNER',
    name: 'Aurora do campus',
    requirement: 'Alcance o nível 3',
    requiredLevel: 3,
    badgeId: null,
    unlocked: true,
    visual: {
      icon: 'Sparkles',
      palette: 'TEAL',
      variant: 'PLAIN',
      bannerMotion: 'AURORA',
      cycleMs: 14000,
    },
  },
  {
    id: 'meteors',
    kind: 'BANNER',
    name: 'Chuva de meteoros',
    requirement: 'Conquiste Constância · Ouro: 30 dias consecutivos.',
    requiredLevel: null,
    badgeId: 'STREAK_GOLD',
    unlocked: true,
    visual: {
      icon: 'Rocket',
      palette: 'COSMOS',
      variant: 'PLAIN',
      bannerMotion: 'METEORS',
      cycleMs: 12000,
    },
  },
  {
    id: 'golden-waves',
    kind: 'BANNER',
    name: 'Ondas douradas',
    requirement: 'Alcance o nível 5',
    requiredLevel: 5,
    badgeId: null,
    unlocked: true,
    visual: {
      icon: 'Waves',
      palette: 'GOLD',
      variant: 'PLAIN',
      bannerMotion: 'WAVES',
      cycleMs: 16000,
    },
  },
  {
    id: 'future',
    kind: 'BANNER',
    name: 'Aurora do destaque',
    requirement: 'Conquiste Destaque · Ouro.',
    requiredLevel: null,
    badgeId: 'TOP3_GOLD',
    unlocked: false,
    visual: {
      icon: 'Trophy',
      palette: 'GOLD',
      variant: 'PLAIN',
      bannerMotion: 'AURORA',
      cycleMs: 14000,
    },
  },
]
const catalog = [
  ...basicDemoRewards(profile),
  ...banners,
  {
    id: 'crown',
    kind: 'FRAME',
    name: 'Coroa de teste',
    requirement: 'Alcance o nível 5',
    requiredLevel: 5,
    badgeId: null,
    unlocked: true,
    visual: {
      icon: 'Crown',
      palette: 'GOLD',
      variant: 'DOUBLE',
      motion: 'CROWN',
      cycleMs: 2400,
    },
  } as ProfileReward,
]

for (const width of [390, 820, 1440]) {
  test(`fundos animados preservam galeria estática, pausa e seleção salva em ${width}px`, async ({
    page,
  }, testInfo) => {
    await mockGame(page, 'ALUNO', catalog, earnedProfile)
    await page.setViewportSize({ width, height: 1000 })
    await page.goto('/perfil/editar')
    await page
      .getByRole('button', { name: 'Fundo do perfil', exact: true })
      .click()
    const locked = page.getByRole('button', {
      name: 'Fundo: Aurora do destaque',
      exact: true,
    })
    await expect(locked).toHaveAttribute('aria-disabled', 'true')
    await locked.focus()
    await page.keyboard.press('Enter')
    await expect(locked).toHaveAttribute('aria-pressed', 'false')
    await expect(
      page.locator(
        '.reward-cover-art .profile-cover[data-motion-playing="true"]',
      ),
    ).toHaveCount(0)
    const cover = page.locator('.editor-preview .profile-cover')
    for (const [id, name, motion] of [
      ['aurora', 'Aurora do campus', 'AURORA'],
      ['meteors', 'Chuva de meteoros', 'METEORS'],
      ['golden-waves', 'Ondas douradas', 'WAVES'],
    ]) {
      await page
        .getByRole('button', { name: `Fundo: ${name}`, exact: true })
        .click()
      await cover.scrollIntoViewIfNeeded()
      await expect(cover).toHaveAttribute('data-banner', id)
      await expect(cover).toHaveAttribute('data-banner-motion', motion)
      await expect(cover).toHaveAttribute('data-motion-playing', 'true')
      const animated = cover
        .locator('.cover-aurora-band, .cover-meteor, .cover-wave')
        .first()
      await expect
        .poll(() =>
          animated.evaluate(
            (element) => getComputedStyle(element).animationPlayState,
          ),
        )
        .toBe('running')
      await page
        .getByRole('button', { name: 'Pausar animação do fundo', exact: true })
        .click()
      await expect(cover).toHaveAttribute('data-motion-playing', 'false')
      expect(
        await animated.evaluate(
          (element) => getComputedStyle(element).animationPlayState,
        ),
      ).toBe('paused')
      for (const theme of ['light', 'dark']) {
        await page.evaluate((theme) => {
          localStorage.setItem('puclim.theme', theme)
          window.dispatchEvent(new Event('puclim:theme'))
        }, theme)
        await page.locator('.editor-preview .public-profile-hero').screenshot({
          path: testInfo.outputPath(`${id}-${width}-${theme}.png`),
        })
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBeTruthy()
      }
      await page
        .getByRole('button', { name: 'Ativar animação do fundo', exact: true })
        .click()
    }
    await page
      .getByRole('button', { name: 'Salvar perfil', exact: true })
      .click()
    await expect(
      page.getByText('Perfil salvo. Sua personalização foi atualizada.', {
        exact: false,
      }),
    ).toBeVisible()
    await page.reload()
    await expect(cover).toHaveAttribute('data-banner-motion', 'WAVES')
    await page
      .getByRole('link', { name: 'Ver perfil público', exact: true })
      .click()
    const publicCover = page.locator(
      '.profile-showcase:not(.is-preview) .public-profile-hero > .profile-cover',
    )
    await expect(publicCover).toHaveAttribute('data-banner', 'golden-waves')
    await expect(publicCover).toHaveAttribute('data-banner-motion', 'WAVES')
    await publicCover.scrollIntoViewIfNeeded()
    await expect(publicCover).toHaveAttribute('data-motion-playing', 'true')
    await page
      .getByRole('button', { name: 'Pausar animação do fundo', exact: true })
      .focus()
    await page.keyboard.press('Enter')
    await expect(publicCover).toHaveAttribute('data-motion-playing', 'false')
  })
}

test('movimento reduzido mantém todos os fundos estáticos e o controle pausa fundo e moldura juntos', async ({
  page,
}) => {
  await mockGame(page, 'ALUNO', catalog, earnedProfile)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/perfil/editar')
  await page
    .getByRole('button', { name: 'Fundo do perfil', exact: true })
    .click()
  const cover = page.locator('.editor-preview .profile-cover')
  for (const name of [
    'Aurora do campus',
    'Chuva de meteoros',
    'Ondas douradas',
  ]) {
    await page
      .getByRole('button', { name: `Fundo: ${name}`, exact: true })
      .click()
    await cover.scrollIntoViewIfNeeded()
    await expect(cover).toHaveAttribute('data-motion-playing', 'false')
    expect(
      await cover
        .locator('.cover-aurora-band, .cover-meteor, .cover-wave')
        .first()
        .evaluate((element) => getComputedStyle(element).animationName),
    ).toBe('none')
    await expect(
      page.getByText('Efeito estático: movimento reduzido ativado.'),
    ).toBeVisible()
  }
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.getByRole('button', { name: 'Molduras', exact: true }).click()
  await page
    .getByRole('button', { name: 'Moldura: Coroa de teste', exact: true })
    .click()
  await cover.scrollIntoViewIfNeeded()
  await expect(
    page.getByRole('button', {
      name: 'Pausar animações do perfil',
      exact: true,
    }),
  ).toBeVisible()
  await page
    .getByRole('button', { name: 'Pausar animações do perfil', exact: true })
    .click()
  await expect(cover).toHaveAttribute('data-motion-playing', 'false')
  await expect(
    page.locator('.editor-preview .profile-framed-avatar'),
  ).toHaveAttribute('data-motion-playing', 'false')
})

test('o fundo pausa fora da tela e quando a aba fica oculta', async ({
  page,
}) => {
  await mockGame(page, 'ALUNO', catalog, earnedProfile)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/perfil/editar')
  await page
    .getByRole('button', { name: 'Fundo do perfil', exact: true })
    .click()
  await page
    .getByRole('button', { name: 'Fundo: Aurora do campus', exact: true })
    .click()
  const cover = page.locator('.editor-preview .profile-cover')
  await cover.scrollIntoViewIfNeeded()
  await expect(cover).toHaveAttribute('data-motion-playing', 'true')
  await page
    .getByRole('heading', { name: 'Editar perfil', exact: true })
    .scrollIntoViewIfNeeded()
  await expect(cover).toHaveAttribute('data-motion-playing', 'false')
  await cover.scrollIntoViewIfNeeded()
  await expect(cover).toHaveAttribute('data-motion-playing', 'true')
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      value: true,
    })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await expect(cover).toHaveAttribute('data-motion-playing', 'false')
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      value: false,
    })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await expect(cover).toHaveAttribute('data-motion-playing', 'true')
})
