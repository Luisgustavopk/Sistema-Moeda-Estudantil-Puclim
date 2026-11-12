import { expect, test } from '@playwright/test'
import { mockGame, profile } from './gamification-fixture'
import {
  basicDemoRewards,
  type ProfileReward,
} from '../src/features/gamificacao/profile-rewards'

const frames: ProfileReward[] = [
  {
    id: 'lightning',
    kind: 'FRAME',
    name: 'Núcleo elétrico',
    requirement: 'Alcance o nível 4',
    requiredLevel: 4,
    badgeId: null,
    unlocked: true,
    visual: {
      icon: 'Zap',
      palette: 'TEAL',
      variant: 'PLAIN',
      avatarShape: 'CIRCLE',
      motion: 'LIGHTNING',
      cycleMs: 8000,
    },
  },
  {
    id: 'black-hole',
    kind: 'FRAME',
    name: 'Horizonte de eventos',
    requirement: 'Alcance o nível 5',
    requiredLevel: 5,
    badgeId: null,
    unlocked: true,
    visual: {
      icon: 'Orbit',
      palette: 'COSMOS',
      variant: 'PLAIN',
      avatarShape: 'CIRCLE',
      motion: 'BLACK_HOLE',
      cycleMs: 16000,
    },
  },
]
const catalog = [...basicDemoRewards(profile), ...frames]

for (const width of [390, 820, 1440]) {
  test(`molduras elementais: prévia, pausa, temas, persistência e movimento reduzido em ${width}px`, async ({
    page,
  }, info) => {
    await mockGame(page, 'ALUNO', catalog, {
      ...profile,
      level: 5,
      totalReceived: 1500,
      levelStart: 1500,
      nextLevelAt: null,
      progressPercent: 100,
    })
    page.on('pageerror', (error) => {
      throw error
    })
    await page.setViewportSize({ width, height: 1000 })
    await page.goto('/perfil/editar')
    await page.getByRole('button', { name: 'Molduras', exact: true }).click()
    const gallery = page.getByRole('group', {
      name: 'Moldura: opções e requisitos',
    })
    for (const reward of frames) {
      const option = page.getByRole('button', {
        name: `Moldura: ${reward.name}`,
        exact: true,
      })
      await option.focus()
      await page.keyboard.press('Enter')
      await expect(option).toHaveAttribute('aria-pressed', 'true')
      const frame = page.locator('.editor-preview .public-avatar')
      await frame.scrollIntoViewIfNeeded()
      await expect(frame).toHaveAttribute('data-motion-playing', 'true')
      await expect(frame).toHaveAttribute('data-motion', reward.visual.motion!)
      const layer = frame.locator('.frame-motion-layer').first()
      await expect
        .poll(() =>
          layer.evaluate((el) => getComputedStyle(el).animationPlayState),
        )
        .toBe('running')
      const initial = await layer.evaluate(
        (el) => getComputedStyle(el).transform,
      )
      await expect
        .poll(() => layer.evaluate((el) => getComputedStyle(el).transform))
        .not.toBe(initial)
      await page
        .getByRole('button', { name: 'Pausar efeito da moldura', exact: true })
        .click()
      await expect(frame).toHaveAttribute('data-motion-playing', 'false')
      for (const theme of ['light', 'dark']) {
        await page.evaluate((theme) => {
          localStorage.setItem('puclim.theme', theme)
          window.dispatchEvent(new Event('puclim:theme'))
        }, theme)
        await page.locator('.editor-preview .public-profile-hero').screenshot({
          path: info.outputPath(`${reward.id}-${width}-${theme}.png`),
        })
      }
      expect(
        await frame
          .locator('.frame-motion-layer')
          .evaluateAll((elements) =>
            elements.every(
              (el) => getComputedStyle(el).animationPlayState === 'paused',
            ),
          ),
      ).toBe(true)
      expect(
        await gallery
          .locator('.frame-motion-layer')
          .evaluateAll((elements) =>
            elements.every(
              (el) => getComputedStyle(el).animationPlayState === 'paused',
            ),
          ),
      ).toBe(true)
      await page
        .getByRole('button', { name: 'Ativar efeito da moldura', exact: true })
        .click()
    }
    await page
      .getByRole('button', { name: 'Salvar perfil', exact: true })
      .click()
    await expect(page.locator('.sidebar-profile-avatar')).toHaveAttribute(
      'data-motion',
      'BLACK_HOLE',
    )
    await page.reload()
    const frame = page.locator('.editor-preview .public-avatar')
    await expect(frame).toHaveAttribute('data-frame', 'black-hole')
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await frame.scrollIntoViewIfNeeded()
    await expect(
      page.getByText('Efeito estático: movimento reduzido ativado.'),
    ).toBeVisible()
    expect(
      await frame
        .locator('.frame-motion-layer')
        .evaluateAll((elements) =>
          elements.every((el) => getComputedStyle(el).animationName === 'none'),
        ),
    ).toBe(true)
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true)
  })
}

test('molduras bloqueadas mostram o nível necessário e não podem ser selecionadas pelo teclado', async ({
  page,
}) => {
  await mockGame(page, 'ALUNO', [
    ...basicDemoRewards(profile),
    ...frames.map((r) => ({ ...r, unlocked: false })),
  ])
  await page.goto('/perfil/editar')
  await page.getByRole('button', { name: 'Molduras', exact: true }).click()
  for (const reward of frames) {
    const option = page.getByRole('button', {
      name: `Moldura: ${reward.name}`,
      exact: true,
    })
    await expect(option).toContainText(reward.requirement)
    await expect(option).toHaveAttribute('aria-disabled', 'true')
    await option.focus()
    await page.keyboard.press('Enter')
    await expect(option).toHaveAttribute('aria-pressed', 'false')
  }
  await expect(page.locator('.editor-preview .public-avatar')).toHaveAttribute(
    'data-frame',
    'classic',
  )
})
