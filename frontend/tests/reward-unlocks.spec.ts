import { expect, test, type Page } from '@playwright/test'
import {
  mockGame,
  profile,
  publicProfileFixture,
  ranks,
  student,
} from './gamification-fixture'
import type { ProfileCustomization } from '../src/features/gamificacao/profile-customization'
import {
  basicDemoRewards,
  type ProfileReward,
} from '../src/features/gamificacao/profile-rewards'

const title = {
  id: 'solidarity-title',
  kind: 'TITLE',
  name: 'Guardião solidário',
  requirement: 'Conquiste Primeira doação.',
  requiredLevel: null,
  badgeId: 'FIRST_DONATION',
  unlocked: true,
  visual: { icon: 'Heart', palette: 'FOREST', variant: 'PLAIN' },
} satisfies ProfileReward
const frame = {
  id: 'orbit-frame',
  kind: 'FRAME',
  name: 'Órbita do campus',
  requirement: 'Alcance o nível 3',
  requiredLevel: 3,
  badgeId: null,
  unlocked: true,
  visual: {
    icon: 'Sparkles',
    palette: 'GOLD',
    variant: 'DOUBLE',
    motion: 'ORBIT',
    cycleMs: 4000,
  },
} satisfies ProfileReward
const lockedTitle = {
  ...title,
  id: 'legend-title',
  name: 'Lenda do semestre',
  requirement: 'Conquiste Destaque · Ouro.',
  badgeId: 'TOP3_GOLD',
  unlocked: false,
} satisfies ProfileReward
const catalog = [...basicDemoRewards(profile), title, frame, lockedTitle]
const key = (reward: Pick<ProfileReward, 'kind' | 'id'>) =>
  `${reward.kind}/${reward.id}`

async function setup(
  page: Page,
  {
    pending = [title],
    equipFailures = 0,
    acknowledgementFailures = 0,
  }: {
    pending?: ProfileReward[]
    equipFailures?: number
    acknowledgementFailures?: number
  } = {},
) {
  await mockGame(page, 'ALUNO', catalog)
  const unseen = new Set(pending.map(key))
  const acknowledgements: string[] = []
  const equips: { kind: ProfileReward['kind']; id: string }[] = []
  const saves: ProfileCustomization[] = []
  let settings: ProfileCustomization = {
    displayName: 'Mari da comunidade',
    bio: 'Compartilhar conhecimento faz parte da minha trajetória.',
    showRealName: false,
    avatar: 'graduate',
    frame: 'classic',
    banner: 'cream',
    title: null,
    titleName: null,
    featuredBadgeIds: ['FIRST_COIN', 'FIRST_REDEMPTION'],
    favoriteBadgeId: 'FIRST_COIN',
    visibility: 'institution',
    showStats: false,
    showActivity: false,
    uploadPolicy: {
      gifRequiredLevel: 5,
      gifUnlocked: false,
      maxBytes: 2097152,
      gifMaxDimension: 512,
      gifMaxFrames: 100,
    },
  }
  const initial = structuredClone(settings)
  function resolveAppearance(input: ProfileCustomization) {
    return {
      ...input,
      titleName:
        catalog.find((r) => r.kind === 'TITLE' && r.id === input.title)?.name ||
        null,
      visuals: {
        avatar:
          catalog.find((r) => r.kind === 'AVATAR' && r.id === input.avatar)
            ?.visual || null,
        frame:
          catalog.find((r) => r.kind === 'FRAME' && r.id === input.frame)
            ?.visual || null,
        banner:
          catalog.find((r) => r.kind === 'BANNER' && r.id === input.banner)
            ?.visual || null,
      },
    }
  }
  settings = resolveAppearance(settings)
  await page.route('**/api/gamificacao/perfil/desbloqueios', (route) =>
    route.fulfill({
      json: catalog.map((reward) => ({
        ...reward,
        newlyUnlocked: unseen.has(key(reward)),
        unlockedAt: reward.unlocked ? '2026-11-09T12:00:00Z' : null,
      })),
    }),
  )
  await page.route(
    '**/api/gamificacao/perfil/desbloqueios/*/*/visualizado',
    (route) => {
      expect(route.request().method()).toBe('POST')
      const match = new URL(route.request().url()).pathname.match(
        /desbloqueios\/(\w+)\/([^/]+)\/visualizado$/,
      )!
      const rewardKey = `${match[1]}/${decodeURIComponent(match[2])}`
      acknowledgements.push(rewardKey)
      if (acknowledgementFailures-- > 0)
        return route.fulfill({
          status: 503,
          json: { message: 'Não foi possível registrar a visualização.' },
        })
      unseen.delete(rewardKey)
      return route.fulfill({ status: 204 })
    },
  )
  await page.route(
    '**/api/gamificacao/perfil/personalizacao/recompensa',
    (route) => {
      expect(route.request().method()).toBe('PATCH')
      const input = route.request().postDataJSON() as (typeof equips)[number]
      expect(Object.keys(input).sort()).toEqual(['id', 'kind'])
      equips.push(input)
      if (equipFailures-- > 0)
        return route.fulfill({
          status: 503,
          json: { message: 'Não foi possível equipar a recompensa.' },
        })
      const reward = catalog.find(
        (r) => r.kind === input.kind && r.id === input.id,
      )
      if (!reward?.unlocked)
        return route.fulfill({
          status: 400,
          json: { message: reward?.requirement || 'Recompensa inválida.' },
        })
      const field = {
        AVATAR: 'avatar',
        FRAME: 'frame',
        BANNER: 'banner',
        TITLE: 'title',
      }[input.kind]
      settings = resolveAppearance({ ...settings, [field]: input.id })
      return route.fulfill({ json: settings })
    },
  )
  await page.route('**/api/gamificacao/perfil/personalizacao', (route) => {
    if (route.request().method() === 'PUT') {
      const input = route.request().postDataJSON() as ProfileCustomization
      saves.push(input)
      settings = resolveAppearance({
        ...input,
        uploadPolicy: settings.uploadPolicy,
      })
    }
    return route.fulfill({ json: settings })
  })
  await page.route('**/api/gamificacao/perfis/student', (route) =>
    route.fulfill({ json: publicProfileFixture(profile, settings) }),
  )
  await page.route('**/api/gamificacao/ranking?*', (route) => {
    const index = Number(
      new URL(route.request().url()).searchParams.get('page') || 0,
    )
    const rows = ranks.map((row) => ({
      ...row,
      ...(row.studentId === student.id
        ? { name: settings.displayName, titleName: settings.titleName }
        : {}),
    }))
    return route.fulfill({
      json: {
        content: rows.slice(index * 20, (index + 1) * 20),
        own: rows[23],
        page: index,
        size: 20,
        total: rows.length,
        semester: '2026-2',
        type: 'MOEDAS',
      },
    })
  })
  return {
    initial,
    settings: () => settings,
    unseen,
    equips,
    acknowledgements,
    saves,
  }
}

function unlockPanel(page: Page) {
  return page.getByRole('region', { name: 'Nova personalização', exact: true })
}

for (const width of [390, 820, 1440]) {
  test(`desbloqueio mostra prévia e equipa título preservando as demais escolhas em ${width}px`, async ({
    page,
  }, info) => {
    const mock = await setup(page)
    await page.setViewportSize({ width, height: 1000 })
    await page.goto('/perfil')
    const panel = unlockPanel(page)
    await expect(panel).toBeVisible()
    await expect(panel).toContainText(title.name)
    await expect(page.locator('.account-identity .profile-title')).toHaveCount(
      0,
    )
    for (const theme of ['light', 'dark']) {
      await page.evaluate((theme) => {
        localStorage.setItem('puclim.theme', theme)
        window.dispatchEvent(new Event('puclim:theme'))
      }, theme)
      await panel.screenshot({
        path: info.outputPath(`reward-unlock-${width}-${theme}.png`),
      })
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true)
      const bounds = (await panel.boundingBox())!
      expect(bounds.x).toBeGreaterThanOrEqual(0)
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(width)
    }
    await panel.getByRole('button', { name: 'Ver prévia', exact: true }).focus()
    await page.keyboard.press('Enter')
    const preview = page.getByRole('dialog', {
      name: 'Prévia da recompensa',
      exact: true,
    })
    await expect(preview).toBeVisible()
    await expect(preview.locator('.profile-title')).toContainText(title.name)
    await expect(preview.locator('.profile-cover')).toHaveAttribute(
      'data-banner',
      mock.initial.banner,
    )
    await expect(preview.locator('.profile-framed-avatar')).toHaveAttribute(
      'data-frame',
      mock.initial.frame,
    )
    await preview.screenshot({
      path: info.outputPath(`reward-preview-${width}.png`),
    })
    expect(mock.settings().title).toBeNull()
    expect(mock.equips).toHaveLength(0)
    await preview
      .getByRole('button', { name: 'Equipar agora', exact: true })
      .click()
    await expect(preview).toBeHidden()
    await expect(panel).toBeHidden()
    await expect(
      page.locator('.account-identity .profile-title'),
    ).toContainText(title.name)
    expect(mock.equips).toEqual([{ kind: 'TITLE', id: title.id }])
    expect(mock.acknowledgements).toEqual([key(title)])
    expect(mock.saves).toHaveLength(0)
    expect(mock.settings()).toMatchObject({
      ...mock.initial,
      title: title.id,
      titleName: title.name,
    })
    if (width === 390)
      await page
        .getByRole('button', { name: 'Abrir menu', exact: true })
        .click()
    await expect(page.locator('.sidebar-profile-title')).toContainText(
      title.name,
    )
    if (width === 390) await page.keyboard.press('Escape')
    await page.reload()
    await expect(
      page.locator('.account-identity .profile-title'),
    ).toContainText(title.name)
    await expect(panel).toBeHidden()
  })
}

test('fila permite equipar e adiar sem repetir os desbloqueios após recarregar', async ({
  page,
}) => {
  const mock = await setup(page, { pending: [title, frame] })
  await page.goto('/perfil')
  const panel = unlockPanel(page)
  await expect(panel).toContainText(title.name)
  await panel
    .getByRole('button', { name: 'Equipar agora', exact: true })
    .click()
  await expect(panel).toContainText(frame.name)
  await panel.getByRole('button', { name: 'Depois', exact: true }).click()
  await expect(panel).toBeHidden()
  expect(mock.equips).toEqual([{ kind: 'TITLE', id: title.id }])
  expect(mock.acknowledgements).toEqual([key(title), key(frame)])
  expect(mock.settings().frame).toBe('classic')
  await page.reload()
  await expect(
    page.getByRole('heading', { name: 'Minha conta', exact: true }),
  ).toBeVisible()
  await expect(panel).toBeHidden()
})

test('erro ao equipar mantém a prévia e permite nova tentativa sem reconhecer o desbloqueio', async ({
  page,
}) => {
  const mock = await setup(page, { equipFailures: 1 })
  await page.goto('/perfil')
  const panel = unlockPanel(page)
  await panel.getByRole('button', { name: 'Ver prévia', exact: true }).click()
  const preview = page.getByRole('dialog', { name: 'Prévia da recompensa' })
  await preview
    .getByRole('button', { name: 'Equipar agora', exact: true })
    .click()
  await expect(preview.getByRole('alert')).toContainText(
    'Não foi possível equipar a recompensa.',
  )
  expect(mock.settings().title).toBeNull()
  expect(mock.acknowledgements).toHaveLength(0)
  await preview
    .getByRole('button', { name: 'Equipar agora', exact: true })
    .click()
  await expect(preview).toBeHidden()
  await expect(panel).toBeHidden()
  expect(mock.equips).toHaveLength(2)
  expect(mock.acknowledgements).toEqual([key(title)])
  expect(mock.settings().title).toBe(title.id)
})

test('erro ao reconhecer uma recompensa equipada não repete a atualização do perfil', async ({
  page,
}) => {
  const mock = await setup(page, { acknowledgementFailures: 1 })
  await page.goto('/perfil')
  const panel = unlockPanel(page)
  await panel
    .getByRole('button', { name: 'Equipar agora', exact: true })
    .click()
  await expect(panel.getByRole('alert')).toContainText(
    'Não foi possível registrar a visualização.',
  )
  expect(mock.settings().title).toBe(title.id)
  expect(mock.equips).toHaveLength(1)
  await panel.getByRole('button', { name: 'Depois', exact: true }).click()
  await expect(panel).toBeHidden()
  expect(mock.equips).toHaveLength(1)
  expect(mock.acknowledgements).toEqual([key(title), key(title)])
  await page.reload()
  await expect(page.locator('.account-identity .profile-title')).toContainText(
    title.name,
  )
  await expect(panel).toBeHidden()
})

test('títulos respeitam requisitos, persistem nas identidades e podem ser removidos', async ({
  page,
}) => {
  const mock = await setup(page, { pending: [] })
  await page.goto('/perfil/editar')
  await page.getByRole('button', { name: 'Títulos', exact: true }).click()
  const locked = page.getByRole('button', {
    name: `Título: ${lockedTitle.name}`,
    exact: true,
  })
  await expect(locked).toHaveAttribute('aria-disabled', 'true')
  await locked.focus()
  await page.keyboard.press('Enter')
  await expect(locked).toHaveAttribute('aria-pressed', 'false')
  await expect(page.locator('.editor-preview .profile-title')).toHaveCount(0)
  await page
    .getByRole('button', { name: `Título: ${title.name}`, exact: true })
    .click()
  await expect(page.locator('.editor-preview .profile-title')).toContainText(
    title.name,
  )
  expect(mock.settings().title).toBeNull()
  await page.getByRole('button', { name: 'Salvar perfil', exact: true }).click()
  await expect(
    page.getByText('Perfil salvo. Sua personalização foi atualizada.', {
      exact: false,
    }),
  ).toBeVisible()
  expect(mock.saves.at(-1)?.title).toBe(title.id)
  await page.reload()
  await page.getByRole('button', { name: 'Títulos', exact: true }).click()
  await expect(
    page.getByRole('button', { name: `Título: ${title.name}`, exact: true }),
  ).toHaveAttribute('aria-pressed', 'true')
  await page
    .getByRole('link', { name: 'Ver perfil público', exact: true })
    .click()
  await expect(
    page.locator('.profile-showcase:not(.is-preview) .profile-title'),
  ).toContainText(title.name)
  await page.goto('/ranking')
  await page.getByRole('button', { name: 'Próxima', exact: true }).click()
  await expect(page.locator('.ranking-self .profile-title')).toContainText(
    title.name,
  )
  await page.goto('/perfil')
  await expect(page.locator('.account-identity .profile-title')).toContainText(
    title.name,
  )
  await expect(page.locator('.sidebar-profile-title')).toContainText(title.name)
  await page.goto('/perfil/editar')
  await page.getByRole('button', { name: 'Títulos', exact: true }).click()
  await page
    .getByRole('button', { name: 'Título: Sem título', exact: true })
    .click()
  await expect(page.locator('.editor-preview .profile-title')).toHaveCount(0)
  await page.getByRole('button', { name: 'Salvar perfil', exact: true }).click()
  await expect(
    page.getByText('Perfil salvo. Sua personalização foi atualizada.', {
      exact: false,
    }),
  ).toBeVisible()
  expect(mock.saves.at(-1)?.title).toBeNull()
  await page.reload()
  await expect(page.locator('.editor-preview .profile-title')).toHaveCount(0)
  await expect(page.locator('.sidebar-profile-title')).toHaveCount(0)
})

test('aviso aguarda a edição do perfil e outros diálogos sem reconhecer a recompensa', async ({
  page,
}) => {
  const mock = await setup(page)
  await page.goto('/perfil/editar')
  await expect(
    page.getByRole('heading', { name: 'Editar perfil', exact: true }),
  ).toBeVisible()
  await expect(unlockPanel(page)).toBeHidden()
  await page
    .getByRole('link', { name: 'Ver perfil público', exact: true })
    .click()
  await expect(unlockPanel(page)).toBeVisible()
  await page.goto('/perfil')
  await expect(unlockPanel(page)).toBeVisible()
  await page
    .getByRole('button', { name: 'Excluir minha conta', exact: true })
    .click()
  const dialog = page.getByRole('dialog', {
    name: 'Excluir sua conta?',
    exact: true,
  })
  await expect(dialog).toBeVisible()
  await expect(unlockPanel(page)).toBeHidden()
  expect(mock.acknowledgements).toHaveLength(0)
  await dialog
    .getByRole('button', { name: 'Manter minha conta', exact: true })
    .click()
  await expect(unlockPanel(page)).toBeVisible()
  expect(mock.unseen.has(key(title))).toBe(true)
})

async function trackUnlockAudio(page: Page, muted: boolean) {
  await page.addInitScript((muted) => {
    localStorage.setItem('puclim.confirmation-sounds', muted ? 'off' : 'on')
    const audio = { starts: 0 }
    Object.assign(window, { rewardUnlockAudio: audio })
    const start = OscillatorNode.prototype.start
    OscillatorNode.prototype.start = function (...args) {
      audio.starts++
      return start.apply(this, args)
    }
  }, muted)
}
const audioStarts = (page: Page) =>
  page.evaluate(
    () =>
      (window as unknown as Window & { rewardUnlockAudio: { starts: number } })
        .rewardUnlockAudio.starts,
  )

test('desbloqueio respeita silêncio e movimento reduzido sem impedir prévia e uso', async ({
  page,
}) => {
  await trackUnlockAudio(page, true)
  await setup(page)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/perfil/editar')
  await page
    .getByRole('link', { name: 'Ver perfil público', exact: true })
    .click()
  const panel = unlockPanel(page)
  await expect(panel).toBeVisible()
  expect(
    await panel.evaluate((element) =>
      element
        .getAnimations({ subtree: true })
        .some((animation) =>
          (animation.effect as KeyframeEffect)
            .getKeyframes()
            .some((frame) => frame.transform && frame.transform !== 'none'),
        ),
    ),
  ).toBe(false)
  expect(await audioStarts(page)).toBe(0)
  await panel.getByRole('button', { name: 'Ver prévia', exact: true }).click()
  const preview = page.getByRole('dialog', { name: 'Prévia da recompensa' })
  await expect(preview.locator('.profile-title')).toContainText(title.name)
  await preview
    .getByRole('button', { name: 'Equipar agora', exact: true })
    .click()
  await expect(preview).toBeHidden()
  await expect(panel).toBeHidden()
  expect(await audioStarts(page)).toBe(0)
})

test('desbloqueio toca o efeito após um gesto quando os sons estão habilitados', async ({
  page,
}) => {
  await trackUnlockAudio(page, false)
  await setup(page)
  await page.goto('/perfil/editar')
  await expect(
    page.getByRole('heading', { name: 'Editar perfil', exact: true }),
  ).toBeVisible()
  expect(await audioStarts(page)).toBe(0)
  await page
    .getByRole('link', { name: 'Ver perfil público', exact: true })
    .click()
  await expect(unlockPanel(page)).toBeVisible()
  await expect.poll(() => audioStarts(page)).toBeGreaterThan(0)
})

test('aba oculta mantém o desbloqueio pendente e silencioso até voltar à tela', async ({
  page,
}) => {
  await trackUnlockAudio(page, false)
  const mock = await setup(page)
  await page.goto('/perfil/editar')
  await expect(
    page.getByRole('heading', { name: 'Editar perfil', exact: true }),
  ).toBeVisible()
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      value: true,
    })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await page
    .getByRole('link', { name: 'Ver perfil público', exact: true })
    .click()
  const panel = unlockPanel(page)
  await expect(panel).toBeVisible()
  await expect(panel).toHaveAttribute('data-celebrating', 'false')
  await page.evaluate(async () => {
    await new Promise(requestAnimationFrame)
    await new Promise(requestAnimationFrame)
  })
  expect(await audioStarts(page)).toBe(0)
  expect(mock.acknowledgements).toHaveLength(0)
  expect(mock.unseen.has(key(title))).toBe(true)
  await page.evaluate(() => {
    delete (document as unknown as Record<string, unknown>).hidden
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await expect(panel).toBeVisible()
  await expect(panel).toContainText(title.name)
  await expect.poll(() => audioStarts(page)).toBeGreaterThan(0)
  expect(mock.acknowledgements).toHaveLength(0)
  await panel.getByRole('button', { name: 'Depois', exact: true }).click()
  await expect(panel).toBeHidden()
  expect(mock.acknowledgements).toEqual([key(title)])
})
