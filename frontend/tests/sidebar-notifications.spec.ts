import { expect, test, type Page } from '@playwright/test'
import { mockGame } from './gamification-fixture'
import type { Notice } from '../src/features/gamificacao/types'

function notice(id: string, readAt: string | null = null): Notice {
  return {
    id,
    type: 'MISSION',
    title: `Atividade ${id}`,
    message: 'Sua participação recebeu uma atualização.',
    date: '2026-11-05T12:00:00Z',
    readAt,
    referenceId: null,
  }
}

async function mockInbox(page: Page, notices: Notice[], role = 'ALUNO') {
  await mockGame(page, role)
  await page.route('**/api/gamificacao/notificacoes**', (route) => {
    if (route.request().method() === 'POST') {
      const id = new URL(route.request().url()).pathname.split('/').at(-2)
      notices.find((item) => item.id === id)!.readAt = '2026-11-05T13:00:00Z'
      return route.fulfill({ status: 204 })
    }
    return route.fulfill({ json: notices })
  })
}

for (const width of [390, 820, 1440]) {
  test(`sidebar indica apenas não lidas e atualiza após a leitura em ${width}px`, async ({
    page,
  }, testInfo) => {
    await mockInbox(page, [
      notice('1'),
      notice('2'),
      notice('3', '2026-11-05T12:30:00Z'),
    ])
    await page.setViewportSize({ width, height: 1000 })
    await page.goto('/perfil')
    if (width < 768)
      await page
        .getByRole('button', { name: 'Abrir menu', exact: true })
        .click()
    const link = page.locator('.sidebar a[href="/notificacoes"]')
    const badge = link.locator('.notification-count')
    await expect(link).toHaveAccessibleName('Notificações, 2 não lidas')
    await expect(badge).toHaveText('2')
    await expect(badge).toBeVisible()
    for (const theme of ['light', 'dark']) {
      await page.evaluate((theme) => {
        localStorage.setItem('puclim.theme', theme)
        window.dispatchEvent(new Event('puclim:theme'))
      }, theme)
      await link.focus()
      await expect(link).toBeFocused()
      await link.screenshot({
        path: testInfo.outputPath(`notifications-${width}-${theme}.png`),
      })
      const contrast = await badge.evaluate((element) => {
        const style = getComputedStyle(element)
        const luminance = (color: string) => {
          const rgb = color
            .match(/[\d.]+/g)!
            .slice(0, 3)
            .map((value) => {
              const channel = Number(value) / 255
              return channel <= 0.04045
                ? channel / 12.92
                : ((channel + 0.055) / 1.055) ** 2.4
            })
          return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722
        }
        const foreground = luminance(style.color)
        const background = luminance(style.backgroundColor)
        return (
          (Math.max(foreground, background) + 0.05) /
          (Math.min(foreground, background) + 0.05)
        )
      })
      expect(contrast).toBeGreaterThanOrEqual(4.5)
    }
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/\/notificacoes$/)
    await expect(page.locator('.notice-item')).toHaveCount(3)
    await expect(badge).toHaveText('2')
    await page
      .getByRole('button', { name: 'Marcar como lida', exact: true })
      .first()
      .click()
    await expect(badge).toHaveText('1')
    if (width < 768)
      await page
        .getByRole('button', { name: 'Abrir menu', exact: true })
        .click()
    await expect(link).toHaveAccessibleName('Notificações, 1 não lida')
    if (width < 768) await page.keyboard.press('Escape')
    await page
      .getByRole('button', { name: 'Marcar como lida', exact: true })
      .click()
    await expect(badge).toHaveCount(0)
    if (width < 768)
      await page
        .getByRole('button', { name: 'Abrir menu', exact: true })
        .click()
    await expect(link).toHaveAccessibleName('Notificações')
    await page.reload()
    await expect(page.locator('.notice-item')).toHaveCount(3)
    await expect(badge).toHaveCount(0)
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy()
  })
}

for (const role of ['ALUNO', 'PROFESSOR', 'EMPRESA']) {
  test(`sidebar recebe novas notificações pela consulta periódica para ${role}`, async ({
    page,
  }) => {
    const notices: Notice[] = [notice('1', '2026-11-05T12:30:00Z')]
    await mockInbox(page, notices, role)
    await page.clock.install()
    const initialInbox = page.waitForResponse('**/api/gamificacao/notificacoes')
    await page.goto('/perfil')
    await initialInbox
    await expect(
      page.getByRole('link', { name: 'Notificações', exact: true }),
    ).toBeVisible()
    await expect(page.locator('.notification-count')).toHaveCount(0)
    notices.push(notice('2'))
    await page.clock.fastForward(15001)
    await expect(page.locator('.notification-count')).toHaveText('1')
    await expect(
      page.getByRole('link', { name: 'Notificações, 1 não lida', exact: true }),
    ).toBeVisible()
  })
}

test('contador limita a exibição a 99+ e mantém o total acessível', async ({
  page,
}) => {
  await mockInbox(
    page,
    Array.from({ length: 125 }, (_, index) => notice(String(index))),
  )
  await page.setViewportSize({ width: 820, height: 1000 })
  await page.goto('/perfil')
  await expect(page.locator('.notification-count')).toHaveText('99+')
  await expect(
    page.getByRole('link', {
      name: 'Notificações, 125 não lidas',
      exact: true,
    }),
  ).toBeVisible()
})

test('falha ao marcar como lida mantém a pendência na sidebar', async ({
  page,
}) => {
  await mockInbox(page, [notice('1')])
  await page.route('**/api/gamificacao/notificacoes/1/ler', (route) =>
    route.fulfill({
      status: 503,
      json: { message: 'Não foi possível registrar a leitura.' },
    }),
  )
  await page.goto('/notificacoes')
  await expect(page.locator('.notification-count')).toHaveText('1')
  await page
    .getByRole('button', { name: 'Marcar como lida', exact: true })
    .click()
  await expect(page.locator('.inbox-panel').getByRole('alert')).toContainText(
    'Não foi possível registrar a leitura.',
  )
  await expect(page.locator('.notification-count')).toHaveText('1')
})
