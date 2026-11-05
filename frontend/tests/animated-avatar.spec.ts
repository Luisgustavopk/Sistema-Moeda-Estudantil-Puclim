import { expect, test, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { mockGame, profile, publicProfileFixture } from './gamification-fixture'
import type { ProfileCustomization } from '../src/features/gamificacao/profile-customization'

const gif = readFileSync(
  new URL('./fixtures/avatar-animated.gif', import.meta.url),
)
const gifUrl = '/api/gamificacao/perfil/avatar/animated.gif'
const uploadFile = { name: 'avatar.gif', mimeType: 'image/gif', buffer: gif }

async function setup(page: Page, level = 5) {
  await mockGame(page)
  const ownerProfile = {
    ...profile,
    level,
    ...(level === 5
      ? {
          totalReceived: 1500,
          levelStart: 1500,
          nextLevelAt: null,
          maximumLevel: true,
          progressPercent: 100,
        }
      : {}),
  }
  let settings: ProfileCustomization = {
    displayName: profile.name,
    bio: '',
    showRealName: false,
    avatar: 'portrait',
    frame: 'classic',
    banner: 'petroleum',
    featuredBadgeIds: [],
    favoriteBadgeId: null,
    visibility: 'all',
    showStats: true,
    showActivity: true,
    uploadPolicy: {
      gifRequiredLevel: 5,
      gifUnlocked: level >= 5,
      maxBytes: 2097152,
      gifMaxDimension: 512,
      gifMaxFrames: 100,
    },
  }
  let uploads = 0
  await page.route('**/api/gamificacao/perfil', (route) =>
    route.fulfill({ json: ownerProfile }),
  )
  await page.route('**/api/gamificacao/perfis/student', (route) =>
    route.fulfill({ json: publicProfileFixture(ownerProfile, settings) }),
  )
  await page.route('**/api/gamificacao/perfil/personalizacao', (route) => {
    if (route.request().method() === 'PUT')
      settings = {
        ...route.request().postDataJSON(),
        uploadPolicy: settings.uploadPolicy,
      }
    return route.fulfill({ json: settings })
  })
  await page.route('**/api/gamificacao/perfil/avatar', (route) => {
    uploads++
    expect(route.request().postDataBuffer()!.includes(gif)).toBeTruthy()
    expect(route.request().postDataBuffer()!.toString('latin1')).toContain(
      'filename="avatar.gif"',
    )
    return route.fulfill({
      status: 201,
      json: { url: gifUrl, assetId: 'animated', width: 64, height: 64 },
    })
  })
  const png = await page.evaluate(() => {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 256
    const context = canvas.getContext('2d')!
    context.fillStyle = '#0000ff'
    context.fillRect(0, 0, 256, 256)
    return canvas.toDataURL('image/png').split(',')[1]
  })
  await page.route(`**${gifUrl}*`, (route) => {
    const frozen =
      new URL(route.request().url()).searchParams.get('static') === 'true'
    return route.fulfill({
      contentType: frozen ? 'image/png' : 'image/gif',
      body: frozen ? Buffer.from(png, 'base64') : gif,
    })
  })
  return { uploads: () => uploads }
}

test('GIF informa o nível mínimo e bloqueia o envio no nível 4', async ({
  page,
}, testInfo) => {
  const mock = await setup(page, 4)
  await page.goto('/perfil/editar')
  await page.getByRole('button', { name: 'Avatar', exact: true }).click()
  await expect(
    page.getByText('GIF animado desbloqueia no nível 5. Seu nível atual é 4.'),
  ).toBeVisible()
  const input = page.getByLabel('Enviar avatar', { exact: false })
  await expect(input).not.toHaveAttribute('accept', /image\/gif/)
  await input.setInputFiles(uploadFile)
  await expect(page.getByRole('alert')).toContainText('Alcance o nível 5')
  await expect(
    page.getByRole('dialog', { name: 'Recortar avatar' }),
  ).toHaveCount(0)
  expect(mock.uploads()).toBe(0)
  await page
    .locator('.editor-panel')
    .screenshot({ path: testInfo.outputPath('gif-locked.png') })
})

for (const width of [390, 820, 1440]) {
  test(`GIF anima sem hover na sidebar e em Minha conta após salvar em ${width}px`, async ({
    page,
  }, testInfo) => {
    const mock = await setup(page)
    await page.setViewportSize({ width, height: 1000 })
    await page.goto('/perfil/editar')
    await page.getByRole('button', { name: 'Avatar', exact: true }).click()
    const input = page.getByLabel('Enviar avatar', { exact: false })
    await expect(input).toHaveAttribute('accept', /image\/gif/)
    await expect(
      page.getByText('GIF animado liberado no nível 5.', { exact: false }),
    ).toBeVisible()
    await input.setInputFiles(uploadFile)
    const preview = page.locator('.editor-preview img.avatar')
    await expect(preview).toHaveAttribute('src', /^data:image\/gif/)
    await expect(
      page.getByRole('dialog', { name: 'Recortar avatar' }),
    ).toHaveCount(0)
    await page
      .getByRole('button', { name: 'Pausar animações do perfil', exact: true })
      .click()
    await expect(preview).toHaveAttribute('src', /^data:image\/png/)
    await page
      .getByRole('button', { name: 'Ativar animações do perfil', exact: true })
      .click()
    await page
      .getByRole('button', { name: 'Salvar perfil', exact: true })
      .click()
    const sidebarPhoto = page.locator('.sidebar-profile-avatar img')
    if (width === 390)
      await page
        .getByRole('button', { name: 'Abrir menu', exact: true })
        .click()
    await page.mouse.move(0, 0)
    await expect(sidebarPhoto).toHaveAttribute('src', gifUrl)
    if (width === 390) {
      await page.keyboard.press('Escape')
      await expect(sidebarPhoto).toHaveAttribute('src', `${gifUrl}?static=true`)
    }
    expect(mock.uploads()).toBe(1)
    await page.goto('/perfil')
    const accountPhoto = page.locator('.account-avatar img')
    await page.mouse.move(0, 0)
    await expect(accountPhoto).toHaveAttribute('src', gifUrl)
    if (width === 1440) {
      for (const photo of [accountPhoto, sidebarPhoto]) {
        const firstFrame = await photo.screenshot()
        await expect
          .poll(
            async () =>
              Buffer.compare(await photo.screenshot(), firstFrame) !== 0,
          )
          .toBeTruthy()
      }
      await page.evaluate(() => {
        Object.defineProperty(document, 'hidden', {
          configurable: true,
          value: true,
        })
        document.dispatchEvent(new Event('visibilitychange'))
      })
      await expect(accountPhoto).toHaveAttribute('src', `${gifUrl}?static=true`)
      await expect(sidebarPhoto).toHaveAttribute('src', `${gifUrl}?static=true`)
      await page.evaluate(() => {
        delete (document as unknown as Record<string, unknown>).hidden
        document.dispatchEvent(new Event('visibilitychange'))
      })
      await expect(accountPhoto).toHaveAttribute('src', gifUrl)
      await expect(sidebarPhoto).toHaveAttribute('src', gifUrl)
    }
    await page
      .getByRole('link', { name: 'Ver perfil público', exact: true })
      .click()
    const publicPhoto = page.locator('.public-avatar img.avatar')
    await expect(publicPhoto).toHaveAttribute('src', gifUrl)
    if (width === 1440) {
      const firstFrame = await publicPhoto.screenshot()
      await expect
        .poll(
          async () =>
            Buffer.compare(await publicPhoto.screenshot(), firstFrame) !== 0,
        )
        .toBeTruthy()
    }
    for (const theme of ['light', 'dark']) {
      await page.evaluate((theme) => {
        localStorage.setItem('puclim.theme', theme)
        window.dispatchEvent(new Event('puclim:theme'))
      }, theme)
      await page
        .locator('.public-profile-hero')
        .screenshot({ path: testInfo.outputPath(`gif-${width}-${theme}.png`) })
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBeTruthy()
    }
    await page
      .getByRole('button', { name: 'Pausar animações do perfil', exact: true })
      .click()
    await expect(publicPhoto).toHaveAttribute('src', `${gifUrl}?static=true`)
    await page.reload()
    await expect(publicPhoto).toHaveAttribute('src', gifUrl)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await expect(publicPhoto).toHaveAttribute('src', `${gifUrl}?static=true`)
    await expect(
      page.getByText('Efeito estático: movimento reduzido ativado.'),
    ).toBeVisible()
    await expect(
      page.getByRole('button', {
        name: 'Ativar animações do perfil',
        exact: true,
      }),
    ).toHaveCount(0)
    if (width === 390)
      await page
        .getByRole('button', { name: 'Abrir menu', exact: true })
        .click()
    await expect(sidebarPhoto).toHaveAttribute('src', `${gifUrl}?static=true`)
    if (width === 390) await page.keyboard.press('Escape')
    await page.goto('/perfil')
    await expect(accountPhoto).toHaveAttribute('src', `${gifUrl}?static=true`)
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await expect(accountPhoto).toHaveAttribute('src', gifUrl)
  })
}

test('erro do servidor ao enviar GIF preserva o avatar salvo e a seleção para tentar novamente', async ({
  page,
}) => {
  await setup(page)
  await page.route('**/api/gamificacao/perfil/avatar', (route) =>
    route.fulfill({
      status: 400,
      json: {
        message: 'Alcance o nível 5 para usar um GIF animado como avatar.',
      },
    }),
  )
  await page.goto('/perfil/editar')
  await page.getByRole('button', { name: 'Avatar', exact: true }).click()
  await page
    .getByLabel('Enviar avatar', { exact: false })
    .setInputFiles(uploadFile)
  await page.getByRole('button', { name: 'Salvar perfil', exact: true }).click()
  await expect(
    page.getByText('Alcance o nível 5', { exact: false }).first(),
  ).toBeVisible()
  await expect(page.locator('.sidebar-profile-avatar svg.avatar')).toBeVisible()
  await expect(page.locator('.editor-preview img.avatar')).toHaveAttribute(
    'src',
    /^data:image\/gif/,
  )
  await expect(
    page.getByRole('button', { name: 'Salvar perfil', exact: true }),
  ).toBeEnabled()
})

test('GIF com dimensões excessivas é recusado antes de criar a prévia', async ({
  page,
}) => {
  const mock = await setup(page)
  await page.goto('/perfil/editar')
  await page.getByRole('button', { name: 'Avatar', exact: true }).click()
  const oversized = Buffer.from(gif)
  oversized.writeUInt16LE(513, 6)
  await page
    .getByLabel('Enviar avatar', { exact: false })
    .setInputFiles({ ...uploadFile, buffer: oversized })
  await expect(page.getByRole('alert')).toContainText(
    'Use um GIF entre 64 e 512 pixels por lado.',
  )
  expect(mock.uploads()).toBe(0)
})
