import { historyJson } from './history-fixture'
import { expect, test, type Page } from '@playwright/test'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { QRCodeSVG } from 'qrcode.react'
import { mockGame, student } from './gamification-fixture'
import type { Coupon } from '../src/shared/types/domain'

const code = 'A1234567-1234-4567-89AB-123456789ABC'
const otherCode = 'B1234567-1234-4567-89AB-123456789ABC'
const coupon: Coupon = {
  id: 'coupon',
  advantageId: 'advantage',
  code,
  studentId: student.id,
  studentName: student.name,
  companyId: 'company',
  companyName: 'Café do campus',
  advantageName: 'Café e pão de queijo',
  cost: 40,
  date: '2026-11-09T12:00:00Z',
  status: 'VALIDO',
}

async function setup(page: Page, role = 'EMPRESA', items: Coupon[] = []) {
  const checked: string[] = []
  const used: string[] = []
  await mockGame(page, role)
  await page.route('**/api/auth/session', (route) =>
    route.fulfill({
      json: historyJson(
        route,
        role === 'EMPRESA'
          ? { ...student, id: 'company', role, partnerKind: 'EMPRESA' }
          : student,
      ),
    }),
  )
  await page.route(
    (url) => url.pathname === '/api/cupons',
    (route) => route.fulfill({ json: historyJson(route, items) }),
  )
  await page.route('**/api/cupons/**', (route) => {
    const path = new URL(route.request().url()).pathname
    const value = decodeURIComponent(path.split('/')[3])
    if (path.endsWith('/utilizar')) {
      used.push(value)
      return route.fulfill({
        json: { ...coupon, code: value, status: 'UTILIZADO' },
      })
    }
    checked.push(value)
    return route.fulfill({ json: { ...coupon, code: value } })
  })
  return { checked, used }
}

async function qrImage(page: Page, value = code) {
  const svg = renderToStaticMarkup(
    createElement(QRCodeSVG, { value, size: 320, marginSize: 4 }),
  ).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ')
  const data = await page.evaluate(async (source) => {
    const image = new Image()
    const url = URL.createObjectURL(
      new Blob([source], { type: 'image/svg+xml' }),
    )
    image.src = url
    await image.decode()
    const canvas = document.createElement('canvas')
    canvas.width = image.width
    canvas.height = image.height
    canvas.getContext('2d')!.drawImage(image, 0, 0)
    URL.revokeObjectURL(url)
    return canvas.toDataURL('image/png').split(',')[1]
  }, svg)
  return {
    name: 'cupom.png',
    mimeType: 'image/png',
    buffer: Buffer.from(data, 'base64'),
  }
}

async function fakeCamera(page: Page, image?: string, delayed = false) {
  await page.addInitScript(
    ({ image, delayed }) => {
      const state = window as unknown as {
        cameraCalls: number
        stoppedTracks: number
        resolveCamera: () => void
      }
      state.cameraCalls = 0
      state.stoppedTracks = 0
      Object.defineProperty(navigator, 'mediaDevices', {
        configurable: true,
        value: {
          getUserMedia: async () => {
            state.cameraCalls += 1
            if (delayed)
              await new Promise<void>((resolve) => {
                state.resolveCamera = resolve
              })
            const canvas = document.createElement('canvas')
            canvas.width = 640
            canvas.height = 480
            const context = canvas.getContext('2d')!
            context.fillStyle = '#ffffff'
            context.fillRect(0, 0, 640, 480)
            if (image) {
              const source = new Image()
              source.src = `data:image/png;base64,${image}`
              await source.decode()
              context.drawImage(source, 160, 80, 320, 320)
            }
            const stream = canvas.captureStream(5)
            for (const track of stream.getTracks()) {
              const stop = track.stop.bind(track)
              track.stop = () => {
                state.stoppedTracks += 1
                stop()
              }
            }
            return stream
          },
        },
      })
    },
    { image, delayed },
  )
}

for (const width of [390, 820, 1440]) {
  test(`aluno apresenta QR legível com código alternativo em ${width}px`, async ({
    page,
  }, testInfo) => {
    await setup(page, 'ALUNO', [
      coupon,
      { ...coupon, id: 'used', code: otherCode, status: 'UTILIZADO' },
    ])
    await page.setViewportSize({ width, height: 1000 })
    await page.goto('/aluno/cupons')
    await expect(
      page.getByRole('button', { name: 'Mostrar QR Code' }),
    ).toHaveCount(1)
    await expect(
      page.locator('.coupon-card').filter({ hasText: code }),
    ).toContainText(code)
    await page.getByRole('button', { name: 'Mostrar QR Code' }).click()
    const modal = page.getByRole('dialog', { name: 'Apresentar cupom' })
    await expect(modal).toContainText(code)
    const qr = modal.locator('.coupon-qr-art')
    const png = await qr.screenshot()
    for (const theme of ['light', 'dark']) {
      await page.evaluate((theme) => {
        localStorage.setItem('puclim.theme', theme)
        window.dispatchEvent(new Event('puclim:theme'))
      }, theme)
      await modal.screenshot({
        path: testInfo.outputPath(`coupon-qr-${width}-${theme}.png`),
      })
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBeTruthy()
    }
    await page.keyboard.press('Escape')
    await expect(modal).toHaveCount(0)
    await expect(
      page.getByRole('button', { name: 'Mostrar QR Code' }),
    ).toBeFocused()
    // Read the rendered QR rather than merely checking that an SVG exists.
    const partner = await page.context().newPage()
    await partner.setViewportSize({ width, height: 1000 })
    await setup(partner)
    await partner.goto('/empresa/cupons')
    await partner
      .getByLabel('Imagem do QR Code')
      .setInputFiles({ name: 'cupom.png', mimeType: 'image/png', buffer: png })
    await expect(partner.locator('.coupon-checked-code')).toHaveText(code)
    await expect(
      partner.getByRole('button', {
        name: 'Confirmar utilização',
        exact: true,
      }),
    ).toBeVisible()
    for (const theme of ['light', 'dark']) {
      await partner.evaluate((theme) => {
        localStorage.setItem('puclim.theme', theme)
        window.dispatchEvent(new Event('puclim:theme'))
      }, theme)
      await partner.locator('.check-page').screenshot({
        path: testInfo.outputPath(`coupon-check-${width}-${theme}.png`),
      })
      expect(
        await partner.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBeTruthy()
      await partner
        .getByRole('button', { name: 'Escanear QR Code', exact: true })
        .click()
      const scanner = partner.getByRole('dialog', { name: 'Escanear QR Code' })
      await expect(
        scanner.getByRole('button', { name: 'Ativar câmera' }),
      ).toBeVisible()
      await scanner.screenshot({
        path: testInfo.outputPath(`coupon-camera-${width}-${theme}.png`),
      })
      await partner.keyboard.press('Escape')
      await expect(scanner).toHaveCount(0)
    }
    await partner.close()
  })
}

test('imagem QR confere sem consumir e confirmação utiliza uma única vez', async ({
  page,
}) => {
  const { checked, used } = await setup(page)
  await page.goto('/empresa/cupons')
  await page.getByLabel('Imagem do QR Code').setInputFiles(await qrImage(page))
  await expect(page.getByLabel('Código do cupom')).toHaveValue(code)
  await expect(page.locator('.coupon-checked-code')).toHaveText(code)
  expect(checked).toEqual([code])
  expect(used).toEqual([])
  await page
    .getByRole('button', { name: 'Confirmar utilização', exact: true })
    .click()
  const modal = page.getByRole('dialog', {
    name: 'Confirmar utilização do cupom?',
  })
  await expect(modal).toContainText(code)
  expect(used).toEqual([])
  await modal
    .getByRole('button', { name: 'Confirmar utilização', exact: true })
    .click()
  await expect(modal).toHaveCount(0)
  await expect(page.locator('.summary-box')).toContainText('Já utilizado')
  expect(used).toEqual([code])
})

test('QR com URL e imagem inválida preservam alternativa manual sem abrir destinos', async ({
  page,
}) => {
  const { checked, used } = await setup(page)
  await page.goto('/empresa/cupons')
  await page
    .getByLabel('Imagem do QR Code')
    .setInputFiles(await qrImage(page, 'https://example.invalid/consume'))
  await expect(page.getByRole('alert')).toContainText(
    'não contém um código de cupom Puclim',
  )
  expect(checked).toEqual([])
  expect(used).toEqual([])
  await expect(page).toHaveURL(/\/empresa\/cupons$/)
  await page.getByLabel('Imagem do QR Code').setInputFiles({
    name: 'invalida.png',
    mimeType: 'image/png',
    buffer: Buffer.from('not an image'),
  })
  await expect(page.getByRole('alert')).toContainText(
    'Não foi possível abrir esta imagem',
  )
  await page.getByLabel('Código do cupom').fill('pcl-7k2q-4821')
  await page
    .getByRole('button', { name: 'Conferir código', exact: true })
    .click()
  await expect(page.locator('.coupon-checked-code')).toHaveText('PCL-7K2Q-4821')
})

for (const status of ['UTILIZADO', 'DOADO'] as const) {
  test(`QR de cupom ${status} exibe estado sem permitir utilização`, async ({
    page,
  }) => {
    const { used } = await setup(page)
    await page.route(`**/api/cupons/${code}`, (route) =>
      route.fulfill({ json: { ...coupon, status } }),
    )
    await page.goto('/empresa/cupons')
    await page
      .getByLabel('Imagem do QR Code')
      .setInputFiles(await qrImage(page))
    await expect(page.locator('.coupon-checked-code')).toHaveText(code)
    await expect(page.locator('.summary-box')).toContainText(
      status === 'DOADO' ? 'Doado' : 'Já utilizado',
    )
    await expect(
      page.getByRole('button', { name: 'Confirmar utilização', exact: true }),
    ).toHaveCount(0)
    expect(used).toEqual([])
  })
}

test('QR de outra empresa exibe recusa da API sem oferecer utilização', async ({
  page,
}) => {
  const { used } = await setup(page)
  await page.route(`**/api/cupons/${code}`, (route) =>
    route.fulfill({
      status: 403,
      json: { message: 'Este cupom pertence a outra empresa.' },
    }),
  )
  await page.goto('/empresa/cupons')
  await page.getByLabel('Imagem do QR Code').setInputFiles(await qrImage(page))
  await expect(page.getByRole('alert')).toContainText(
    'Este cupom pertence a outra empresa.',
  )
  await expect(
    page.getByRole('button', { name: 'Confirmar utilização', exact: true }),
  ).toHaveCount(0)
  expect(used).toEqual([])
})

test('resposta atrasada não restaura resultado do código anterior', async ({
  page,
}) => {
  const { used } = await setup(page)
  let release!: () => void
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  let requested = false
  await page.route(`**/api/cupons/${code}`, async (route) => {
    requested = true
    await gate
    return route.fulfill({ json: coupon })
  })
  await page.goto('/empresa/cupons')
  await page.getByLabel('Código do cupom').fill(code)
  await page
    .getByRole('button', { name: 'Conferir código', exact: true })
    .click()
  await expect.poll(() => requested).toBeTruthy()
  await page.getByLabel('Código do cupom').fill(otherCode)
  await page
    .getByRole('button', { name: 'Conferir código', exact: true })
    .click()
  await expect(page.locator('.coupon-checked-code')).toHaveText(otherCode)
  const response = page.waitForResponse(`**/api/cupons/${code}`)
  release()
  await response
  await expect(page.locator('.coupon-checked-code')).toHaveText(otherCode)
  await page
    .getByRole('button', { name: 'Confirmar utilização', exact: true })
    .click()
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Confirmar utilização', exact: true })
    .click()
  await expect.poll(() => used).toEqual([otherCode])
})

test('câmera só pede permissão após ação e erro permite continuar pelo código', async ({
  page,
}) => {
  await setup(page)
  await page.addInitScript(() => {
    const state = window as unknown as { cameraCalls: number }
    state.cameraCalls = 0
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: () => {
          state.cameraCalls += 1
          return Promise.reject(new DOMException('denied', 'NotAllowedError'))
        },
      },
    })
  })
  await page.goto('/empresa/cupons')
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as unknown as { cameraCalls: number }).cameraCalls,
      ),
    )
    .toBe(0)
  await page
    .getByRole('button', { name: 'Escanear QR Code', exact: true })
    .click()
  await expect(page.getByRole('dialog')).toBeVisible()
  expect(
    await page.evaluate(
      () => (window as unknown as { cameraCalls: number }).cameraCalls,
    ),
  ).toBe(0)
  await page.getByRole('button', { name: 'Ativar câmera' }).click()
  await expect(page.getByRole('alert')).toContainText(
    'Permissão da câmera negada',
  )
  await page.getByRole('button', { name: 'Usar código ou imagem' }).click()
  await page.getByLabel('Código do cupom').fill(code)
  await page
    .getByRole('button', { name: 'Conferir código', exact: true })
    .click()
  await expect(page.locator('.coupon-checked-code')).toHaveText(code)
})

test('câmera decodifica quadro real, encerra trilhas e não consome automaticamente', async ({
  page,
}) => {
  const image = await qrImage(page)
  await fakeCamera(page, image.buffer.toString('base64'))
  const { checked, used } = await setup(page)
  await page.goto('/empresa/cupons')
  await page
    .getByRole('button', { name: 'Escanear QR Code', exact: true })
    .click()
  await page.getByRole('button', { name: 'Ativar câmera' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.locator('.coupon-checked-code')).toHaveText(code)
  expect(checked).toEqual([code])
  expect(used).toEqual([])
  expect(
    await page.evaluate(
      () => (window as unknown as { stoppedTracks: number }).stoppedTracks,
    ),
  ).toBe(1)
})

test('fechar scanner antes da permissão resolve interrompe câmera tardia', async ({
  page,
}) => {
  await fakeCamera(page, undefined, true)
  await setup(page)
  await page.goto('/empresa/cupons')
  await page
    .getByRole('button', { name: 'Escanear QR Code', exact: true })
    .click()
  await page.getByRole('button', { name: 'Ativar câmera' }).click()
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as unknown as { cameraCalls: number }).cameraCalls,
      ),
    )
    .toBe(1)
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.evaluate(() =>
    (window as unknown as { resolveCamera: () => void }).resolveCamera(),
  )
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as unknown as { stoppedTracks: number }).stoppedTracks,
      ),
    )
    .toBe(1)
})

test('ocultar aba encerra a câmera e permite reativar ou voltar ao código', async ({
  page,
}) => {
  await fakeCamera(page)
  await setup(page)
  await page.goto('/empresa/cupons')
  await page
    .getByRole('button', { name: 'Escanear QR Code', exact: true })
    .click()
  await page.getByRole('button', { name: 'Ativar câmera' }).click()
  await expect(page.locator('.coupon-scanner')).toHaveClass(/is-running/)
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      value: true,
    })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await expect(page.locator('.coupon-scanner-status')).toContainText(
    'A câmera foi pausada',
  )
  expect(
    await page.evaluate(
      () => (window as unknown as { stoppedTracks: number }).stoppedTracks,
    ),
  ).toBe(1)
  await expect(
    page.getByRole('button', { name: 'Ativar câmera' }),
  ).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByLabel('Código do cupom')).toBeVisible()
})
