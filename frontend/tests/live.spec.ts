import { expect, test, type Page } from '@playwright/test'

const suffix = Date.now().toString(36)
const password = 'Seguro@2026'
function documentNumber(base: string, cnpj = false) {
  let digits = base.split('').map(Number)
  for (let round = 0; round < 2; round++) {
    let sum = 0
    if (cnpj) {
      let weight = 2
      for (let index = digits.length - 1; index >= 0; index--) {
        sum += digits[index] * weight
        weight = weight === 9 ? 2 : weight + 1
      }
      digits.push(sum % 11 < 2 ? 0 : 11 - (sum % 11))
    } else {
      digits.forEach((digit, index) => {
        sum += digit * (digits.length + 1 - index)
      })
      digits.push((sum * 10) % 11 === 10 ? 0 : (sum * 10) % 11)
    }
  }
  return digits.join('')
}
const seed = String(Date.now()).slice(-9)
const cpf = documentNumber(seed)
const professorCpf = documentNumber(String(Number(seed) + 1).padStart(9, '0'))
const institutionCnpj = documentNumber(`${seed}001`, true)
const companyCnpj = documentNumber(`${seed}002`, true)
const login = async (page: Page, user: string, secret = password) => {
  await page.goto('/login')
  await page.getByLabel('Login ou e-mail').fill(user)
  await page.getByLabel('Senha', { exact: true }).fill(secret)
  await page.getByRole('button', { name: 'Entrar na minha conta' }).click()
  await expect(page).not.toHaveURL(/\/login$/)
}
const logout = async (page: Page) => {
  await page.getByRole('button', { name: 'Sair da conta' }).click()
  await expect(page).toHaveURL(/\/login$/)
}
async function registerPartner(
  page: Page,
  name: string,
  cnpj: string,
  kind: string,
) {
  await page.goto('/cadastro/empresa')
  await page.getByLabel('Tipo de organização').selectOption(kind)
  await page.getByLabel('Nome da organização').fill(`${name}${suffix}`)
  await page.getByLabel('CNPJ', { exact: true }).fill(cnpj)
  await page.getByLabel('Telefone com DDD').fill('31999999999')
  await page
    .getByLabel('E-mail de contato')
    .fill(`${name}${suffix}@example.test`)
  await page.getByLabel('Login', { exact: true }).fill(`${name}${suffix}`)
  await page.getByLabel('Senha', { exact: true }).fill(password)
  await page.getByLabel('Confirmar senha').fill(password)
  await page
    .getByRole('button', { name: 'Cadastrar minha organização' })
    .click()
  await expect(page).toHaveURL((url) => url.pathname === '/empresa')
}

test('US01–US20: cadastro, importação, transferência, catálogo, resgate e uso persistidos no backend real', async ({
  page,
}) => {
  await registerPartner(page, 'InstituicaoLive', institutionCnpj, 'ENSINO')
  await page.goto('/empresa/professores')
  await page.getByLabel('Arquivo CSV de professores').setInputFiles({
    name: 'professores.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(
      `nome;cpf;departamento;email;login\nProfessor Live;${professorCpf};Engenharia;professor${suffix}@example.test;professor${suffix}\n`,
    ),
  })
  await expect(page.getByText('Pronto para importar')).toBeVisible()
  await page
    .getByRole('button', { name: 'Importar 1 professores válidos' })
    .click()
  const temporary = await page.locator('table code').innerText()
  await expect(page.getByText('1 professores importados.')).toBeVisible()
  await logout(page)

  await page.goto('/cadastro/aluno')
  await page.getByLabel('Nome completo').fill(`Aluno Live ${suffix}`)
  await page
    .getByLabel('E-mail', { exact: true })
    .fill(`aluno${suffix}@example.test`)
  await page.getByLabel('Login', { exact: true }).fill(`aluno${suffix}`)
  await page.getByLabel('CPF', { exact: true }).fill(cpf)
  await page.getByLabel('RG', { exact: true }).fill('MG123456')
  await page.getByLabel('Endereço completo').fill('Rua de Testes, 123')
  await page
    .getByLabel('Instituição de ensino')
    .selectOption({ label: `InstituicaoLive${suffix}` })
  await page.getByLabel('Curso', { exact: true }).fill('Engenharia de Software')
  await page.getByLabel('Senha', { exact: true }).fill(password)
  await page.getByLabel('Confirmar senha').fill(password)
  await page.getByRole('button', { name: 'Criar minha conta' }).click()
  await expect(page).toHaveURL((url) => url.pathname === '/aluno')
  await logout(page)

  await login(page, `professor${suffix}`, temporary)
  await expect(page).toHaveURL(/\/primeiro-acesso$/)
  await page.getByLabel('Senha temporária recebida').fill(temporary)
  await page.getByLabel('Nova senha', { exact: true }).fill(password)
  await page.getByLabel('Confirmar nova senha').fill(password)
  await page.getByRole('button', { name: 'Definir senha e continuar' }).click()
  await expect(page).toHaveURL(/\/professor$/)
  await page.goto('/professor/enviar')
  await page
    .getByRole('button', { name: new RegExp(`Aluno Live ${suffix}`) })
    .click()
  await page.getByRole('button', { name: 'Continuar' }).click()
  await page.getByLabel('Quantidade de Pucoins').fill('150')
  await page
    .getByLabel('Por que este aluno merece o reconhecimento?')
    .fill('Excelente participação no laboratório.')
  await page.getByRole('button', { name: 'Revisar envio' }).click()
  await page.getByRole('button', { name: 'Confirmar envio' }).click()
  await expect(
    page.getByRole('heading', { name: 'Reconhecimento enviado!' }),
  ).toBeVisible()
  await page.goto('/professor/extrato')
  await expect(
    page.getByText('Excelente participação no laboratório.', { exact: false }),
  ).toBeVisible()
  await logout(page)

  await registerPartner(page, 'EmpresaLive', companyCnpj, 'EMPRESA')
  await page.goto('/empresa/vantagens/nova')
  await page.getByLabel('Nome da vantagem').fill(`Café Live ${suffix}`)
  await page
    .getByLabel('Descrição e instruções de uso')
    .fill('Apresente seu cupom para receber um café no balcão.')
  await page.getByLabel('Custo em Pucoins').fill('50')
  await page.locator('input[type=file]').setInputFiles({
    name: 'cafe.png',
    mimeType: 'image/png',
    buffer: Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGPg94kBAAElALjb7fUJAAAAAElFTkSuQmCC',
      'base64',
    ),
  })
  await page.getByRole('button', { name: 'Cadastrar vantagem' }).click()
  await expect(page).toHaveURL(/\/empresa\/vantagens$/)
  await logout(page)

  await login(page, `aluno${suffix}`)
  await expect(page).toHaveURL((url) => url.pathname === '/aluno')
  await page.goto('/aluno/catalogo')
  const card = page
    .locator('article')
    .filter({ hasText: `Café Live ${suffix}` })
  await card.getByRole('button').click()
  await page.getByRole('button', { name: 'Quero resgatar' }).click()
  await page.getByRole('button', { name: 'Confirmar resgate' }).click()
  await expect(
    page.getByRole('heading', { name: 'Sua conquista virou vantagem!' }),
  ).toBeVisible()
  const code = await page.locator('.modal .coupon-code').innerText()
  await page.getByRole('link', { name: 'Ver meus cupons' }).click()
  await expect(page.getByText(code, { exact: true })).toBeVisible()
  await page.reload()
  await expect(page.getByText(code, { exact: true })).toBeVisible()
  await page.goto('/aluno/extrato')
  await expect(
    page.getByText('Excelente participação no laboratório.', { exact: false }),
  ).toBeVisible()
  await logout(page)

  await login(page, `EmpresaLive${suffix}`)
  await page.goto('/empresa/cupons')
  await page.getByLabel('Código do cupom').fill(code)
  await page.getByRole('button', { name: 'Conferir código' }).click()
  await page
    .getByRole('button', { name: 'Confirmar utilização', exact: true })
    .click()
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Confirmar utilização' })
    .click()
  await expect(page.getByText('Já utilizado', { exact: true })).toBeVisible()
  await logout(page)
  await login(page, `aluno${suffix}`)
  await page.goto('/aluno/cupons')
  await expect(page.getByText('Já utilizado', { exact: true })).toBeVisible()
  expect(
    await page.evaluate(() => localStorage.getItem('puclim.demo.v1')),
  ).toBeNull()
})
