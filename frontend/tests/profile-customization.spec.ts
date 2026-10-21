import { chooseOption } from './select-option'
import { expect, test } from '@playwright/test'

test('demonstração: salvar personalização, recortar avatar e restaurar prévia', async ({
  page,
}) => {
  await page.goto('/login')
  await page.getByLabel('Login ou e-mail').fill('aluno')
  await page.getByLabel('Senha', { exact: true }).fill('Puclim@2026')
  await page.getByRole('button', { name: 'Entrar na minha conta' }).click()
  await expect(page).toHaveURL(/\/aluno$/)
  await page.goto('/perfil/editar')
  await expect(
    page.getByText('Demonstração explícita:', { exact: false }),
  ).toBeVisible()
  await page
    .getByLabel('Nome de exibição', { exact: true })
    .fill('Mari do campus')
  await page
    .getByLabel('Resumo', { exact: true })
    .fill('Aprendendo e compartilhando conhecimento.')
  await page.getByRole('button', { name: 'Avatar', exact: true }).click()
  const png = await page.evaluate(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 128
    canvas.height = 128
    const context = canvas.getContext('2d')!
    context.fillStyle = '#0f4c5c'
    context.fillRect(0, 0, 128, 128)
    return canvas.toDataURL('image/png').split(',')[1]
  })
  await page.getByLabel('Enviar avatar', { exact: false }).setInputFiles({
    name: 'avatar.png',
    mimeType: 'image/png',
    buffer: Buffer.from(png, 'base64'),
  })
  await expect(
    page.getByRole('dialog', { name: 'Recortar avatar' }),
  ).toBeVisible()
  await page.getByRole('slider', { name: 'Zoom', exact: true }).fill('2')
  await page.getByRole('button', { name: 'Usar recorte' }).click()
  await expect(page.locator('.editor-preview img.avatar')).toBeVisible()
  await page.getByRole('button', { name: 'Vitrines', exact: true }).click()
  await page.getByLabel('Primeira moeda', { exact: true }).check()
  await chooseOption(
    page.getByLabel('Conquista favorita', { exact: true }),
    'demo-first-coin',
  )
  await page.getByRole('button', { name: 'Salvar perfil' }).click()
  await expect(page.getByText('Perfil salvo neste navegador.', { exact: false })).toBeVisible()
  await page
    .getByRole('link', { name: 'Ver perfil público', exact: true })
    .click()
  await expect(page.locator('.public-display-name')).toHaveText(
    'Mari do campus',
  )
  await expect(
    page.getByRole('heading', { name: 'Conquista favorita', exact: true }),
  ).toBeVisible()
  await page.reload()
  await expect(page.locator('.public-display-name')).toHaveText(
    'Mari do campus',
  )
  await page.getByRole('link', { name: 'Editar perfil', exact: true }).click()
  await page
    .getByLabel('Nome de exibição', { exact: true })
    .fill('Alteração pendente')
  await page.getByRole('button', { name: 'Descartar', exact: true }).click()
  await expect(
    page.getByLabel('Nome de exibição', { exact: true }),
  ).toHaveValue('Mari do campus')
})
