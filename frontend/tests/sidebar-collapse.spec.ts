import { expect, test } from '@playwright/test'
import { mockGame } from './gamification-fixture'

for (const width of [820, 1440]) {
  test(`sidebar pode expandir e recolher pelo teclado, mantendo a preferência em ${width}px`, async ({
    page,
  }, testInfo) => {
    await mockGame(page)
    await page.route('**/api/gamificacao/notificacoes', (route) =>
      route.fulfill({
        json: [
          {
            id: 'pending',
            type: 'MISSION',
            title: 'Uma atualização',
            message: 'Nova atividade.',
            date: '2026-11-05T12:00:00Z',
            readAt: null,
            referenceId: null,
          },
        ],
      }),
    )
    await page.setViewportSize({ width, height: 1100 })
    await page.goto('/perfil')
    const sidebar = page.locator('.sidebar')
    const toggle = page.locator('.sidebar-toggle')
    const shell = page.locator('.app-shell')
    await expect(shell).toHaveAttribute(
      'data-sidebar-collapsed',
      String(width < 1280),
    )
    if (width < 1280) await toggle.click()
    await expect(toggle).toHaveAccessibleName('Recolher menu lateral')
    await expect(toggle).toHaveAttribute('aria-expanded', 'true')
    await expect(page.locator('.sidebar-user-info')).toBeVisible()
    expect((await sidebar.boundingBox())?.width).toBe(250)
    const expandedWorkspace = (await page.locator('.workspace').boundingBox())!
      .width
    for (const state of ['expanded', 'collapsed']) {
      if (state === 'collapsed') {
        await toggle.focus()
        await page.keyboard.press('Enter')
        await expect(toggle).toBeFocused()
        await expect(toggle).toHaveAccessibleName('Expandir menu lateral')
        await expect(toggle).toHaveAttribute('aria-expanded', 'false')
        await expect(page.locator('.sidebar-user-info')).toBeHidden()
        expect((await sidebar.boundingBox())?.width).toBe(78)
        expect(
          (await page.locator('.workspace').boundingBox())!.width,
        ).toBeGreaterThan(expandedWorkspace)
      }
      await expect(page.locator('.notification-count')).toBeVisible()
      await expect(page.locator('.sidebar-profile-avatar')).toBeVisible()
      for (const theme of ['light', 'dark']) {
        await page.evaluate((theme) => {
          localStorage.setItem('puclim.theme', theme)
          window.dispatchEvent(new Event('puclim:theme'))
        }, theme)
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBeTruthy()
        await sidebar.screenshot({
          path: testInfo.outputPath(`sidebar-${width}-${state}-${theme}.png`),
        })
      }
    }
    const notifications = page.getByRole('link', {
      name: 'Notificações, 1 não lida',
      exact: true,
    })
    await notifications.focus()
    await expect(notifications.locator('.nav-tooltip')).toBeVisible()
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/\/notificacoes$/)
    await expect(shell).toHaveAttribute('data-sidebar-collapsed', 'true')
    await page.reload()
    await expect(shell).toHaveAttribute('data-sidebar-collapsed', 'true')
    await toggle.focus()
    await page.keyboard.press('Space')
    await expect(toggle).toHaveAttribute('aria-expanded', 'true')
    await expect(toggle).toBeFocused()
    await page.reload()
    await expect(shell).toHaveAttribute('data-sidebar-collapsed', 'false')
    expect((await sidebar.boundingBox())?.width).toBe(250)
  })
}

test('layout automático acompanha a largura e o menu do celular preserva foco e navegação', async ({
  page,
}) => {
  await mockGame(page)
  await page.goto('/perfil')
  const shell = page.locator('.app-shell')
  await expect(shell).toHaveAttribute('data-sidebar-collapsed', 'false')
  await page.setViewportSize({ width: 820, height: 1000 })
  await expect(shell).toHaveAttribute('data-sidebar-collapsed', 'true')
  await page.setViewportSize({ width: 390, height: 844 })
  const menu = page.getByRole('button', { name: 'Abrir menu', exact: true })
  await menu.click()
  const dialog = page.getByRole('dialog', {
    name: 'Menu principal',
    exact: true,
  })
  await expect(dialog).toBeVisible()
  await expect(dialog.locator('.sidebar-toggle')).toBeHidden()
  await expect(dialog.locator('.sidebar-user-info')).toBeVisible()
  await expect(
    dialog
      .getByRole('link', { name: 'Notificações', exact: true })
      .locator('span')
      .first(),
  ).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(menu).toBeFocused()
  await menu.click()
  await page.getByRole('link', { name: 'Notificações', exact: true }).click()
  await expect(page).toHaveURL(/\/notificacoes$/)
  await expect(dialog).toHaveCount(0)
  await menu.click()
  await page.setViewportSize({ width: 1440, height: 1000 })
  await expect(dialog).toHaveCount(0)
  await expect(shell).toHaveAttribute('data-sidebar-collapsed', 'false')
  await expect(
    page.getByRole('button', { name: 'Recolher menu lateral', exact: true }),
  ).toBeVisible()
  expect(
    await page.evaluate(() => localStorage.getItem('puclim.sidebar.collapsed')),
  ).toBeNull()
})

test('preferência manual permanece ao redimensionar e não reduz o painel do celular', async ({
  page,
}) => {
  await mockGame(page)
  await page.addInitScript(() =>
    localStorage.setItem('puclim.sidebar.collapsed', 'true'),
  )
  await page.goto('/perfil')
  await expect(page.locator('.app-shell')).toHaveAttribute(
    'data-sidebar-collapsed',
    'true',
  )
  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByRole('button', { name: 'Abrir menu', exact: true }).click()
  const dialog = page.getByRole('dialog', {
    name: 'Menu principal',
    exact: true,
  })
  await expect(dialog).toBeVisible()
  expect((await dialog.boundingBox())?.width).toBe(288)
  await expect(dialog.locator('.sidebar-user-info')).toBeVisible()
  await page.setViewportSize({ width: 820, height: 1000 })
  await expect(dialog).toHaveCount(0)
  await expect(page.locator('.sidebar-toggle')).toHaveAccessibleName(
    'Expandir menu lateral',
  )
  await page.setViewportSize({ width: 1440, height: 1000 })
  await expect(page.locator('.app-shell')).toHaveAttribute(
    'data-sidebar-collapsed',
    'true',
  )
})

test('recolher continua funcionando quando o navegador não permite salvar a preferência', async ({
  page,
}) => {
  await mockGame(page)
  await page.addInitScript(() => {
    const setItem = Storage.prototype.setItem
    Storage.prototype.setItem = function (key, value) {
      if (key === 'puclim.sidebar.collapsed')
        throw new Error('Armazenamento indisponível')
      return setItem.call(this, key, value)
    }
  })
  await page.goto('/perfil')
  await page
    .getByRole('button', { name: 'Recolher menu lateral', exact: true })
    .click()
  await expect(page.locator('.app-shell')).toHaveAttribute(
    'data-sidebar-collapsed',
    'true',
  )
  await page.getByRole('link', { name: 'Notificações', exact: true }).click()
  await expect(page).toHaveURL(/\/notificacoes$/)
  await expect(page.locator('.app-shell')).toHaveAttribute(
    'data-sidebar-collapsed',
    'true',
  )
})
