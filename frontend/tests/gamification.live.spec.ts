import { chooseOption } from './select-option'
import { expect, test, type Page } from '@playwright/test'

const password = 'Seguro@2026'
let counter = 0
const run = Date.now().toString(36)
function documentNumber(cnpj = false) {
  const length = cnpj ? 12 : 9
  const digits = String(Date.now() + counter++)
    .slice(-length)
    .padStart(length, '0')
    .split('')
    .map(Number)
  for (let round = 0; round < 2; round++) {
    let sum = 0
    if (cnpj) {
      let weight = 2
      for (let i = digits.length - 1; i >= 0; i--) {
        sum += digits[i] * weight
        weight = weight === 9 ? 2 : weight + 1
      }
    } else
      digits.forEach((digit, i) => {
        sum += digit * (digits.length + 1 - i)
      })
    const remainder = sum % 11
    digits.push(
      cnpj
        ? remainder < 2
          ? 0
          : 11 - remainder
        : (sum * 10) % 11 === 10
          ? 0
          : (sum * 10) % 11,
    )
  }
  return digits.join('')
}
async function csrf(page: Page) {
  expect((await page.request.get('/api/auth/csrf')).ok()).toBeTruthy()
  return decodeURIComponent(
    (await page.context().cookies()).find((c) => c.name === 'XSRF-TOKEN')!
      .value,
  )
}
async function send<T>(
  page: Page,
  method: string,
  path: string,
  data?: unknown,
): Promise<T> {
  const response = await page.request.fetch(`/api${path}`, {
    method,
    data,
    headers: {
      'X-XSRF-TOKEN': await csrf(page),
      'Idempotency-Key': crypto.randomUUID(),
    },
  })
  expect(response.ok(), `${path}: ${await response.text()}`).toBeTruthy()
  return response.status() === 204
    ? (undefined as T)
    : ((await response.json()) as T)
}
interface SeedAccount {
  id: string
  login: string
  name: string
}
async function partner(page: Page, kind: string): Promise<SeedAccount> {
  const login = `${kind.toLowerCase()}${run}${counter++}`
  return send(page, 'POST', '/empresas', {
    name: login,
    email: `${login}@example.test`,
    login,
    password,
    cnpj: documentNumber(true),
    phone: '31999999999',
    description: 'Parceiro do teste de gamificação',
    partnerKind: kind,
  })
}
async function login(page: Page, account: SeedAccount) {
  await page.goto('/login')
  await page.getByLabel('Login ou e-mail').fill(account.login)
  await page.getByLabel('Senha', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Entrar na minha conta' }).click()
  await expect(page).not.toHaveURL(/\/login$/)
}
async function logout(page: Page) {
  await page.getByRole('button', { name: 'Sair da conta' }).click()
  await expect(page).toHaveURL(/\/login$/)
}

test('gamificação real: Fundo, perguntas, quiz, missão, conquistas, doação e proposta patrocinada', async ({
  page,
}) => {
  test.setTimeout(180000)
  const institution = await partner(page, 'ENSINO')
  const company = await partner(page, 'EMPRESA')
  const beneficiary = await partner(page, 'BENEFICIARIA')
  await send(page, 'POST', '/auth/login', {
    login: institution.login,
    password,
  })
  const teacherLogin = `prof${run}`
  const imported = await send<{ access: { temporaryPassword: string }[] }>(
    page,
    'POST',
    '/instituicao/professores/importar',
    {
      rows: [
        {
          line: 1,
          name: 'Professor Gamificação',
          cpf: documentNumber(),
          department: 'Engenharia',
          email: `${teacherLogin}@example.test`,
          login: teacherLogin,
        },
      ],
    },
  )
  await send(page, 'POST', '/auth/logout')
  const teacher = await send<SeedAccount>(page, 'POST', '/auth/login', {
    login: teacherLogin,
    password: imported.access[0].temporaryPassword,
  })
  await send(page, 'PATCH', '/conta/senha', {
    currentPassword: imported.access[0].temporaryPassword,
    password,
  })
  await send(page, 'POST', '/auth/logout')
  const studentLogin = `aluno${run}`
  const student = await send<SeedAccount>(page, 'POST', '/alunos', {
    name: 'Aluno Gamificação',
    login: studentLogin,
    email: `${studentLogin}@example.test`,
    password,
    cpf: documentNumber(),
    rg: 'MG123456',
    address: 'Rua dos Testes, 123',
    course: 'Engenharia de Software',
    institutionId: institution.id,
  })

  await login(page, institution)
  await page.goto('/empresa/fundo')
  await page.getByLabel('Valor da dotação').fill('1000')
  await page
    .getByLabel('Origem e autorização do orçamento')
    .fill('Dotação aprovada pelo conselho institucional')
  await page.getByRole('button', { name: 'Registrar dotação' }).click()
  await expect(
    page.getByText('Origem: Dotação aprovada pelo conselho institucional'),
  ).toBeVisible()
  await logout(page)

  await login(page, teacher)
  await page.goto('/professor/perguntas')
  for (let i = 0; i < 5; i++) {
    await page
      .getByRole('button', { name: 'Nova pergunta', exact: true })
      .click()
    await page.getByLabel('Enunciado').fill(`Pergunta de engenharia ${i + 1}`)
    await page.getByLabel('Disciplina ou área').fill('Engenharia')
    await page
      .getByLabel('Alternativas, uma por linha')
      .fill('Resposta correta\nResposta incorreta')
    await page.getByRole('button', { name: 'Salvar pergunta' }).click()
    await expect(
      page.getByRole('heading', {
        name: `Pergunta de engenharia ${i + 1}`,
        exact: true,
      }),
    ).toBeVisible()
  }
  await page.goto('/professor/missoes')
  await page.getByRole('button', { name: 'Criar missão', exact: true }).click()
  await page
    .getByLabel('Título', { exact: true })
    .fill('Pesquisa de engenharia')
  await page
    .getByLabel('Descrição', { exact: true })
    .fill('Entregar relatório com referências acadêmicas.')
  await page.getByLabel('Recompensa em moedas').fill('100')
  await page.getByLabel('Quantidade de vagas').fill('2')
  await page.getByLabel('Prazo de encerramento').fill('2035-12-10T18:00')
  await page.getByRole('button', { name: 'Publicar missão' }).click()
  await expect(
    page.getByRole('heading', { name: 'Pesquisa de engenharia', exact: true }),
  ).toBeVisible()
  await expect(page.getByText(/Reserva: 200 moedas/)).toBeVisible()
  await logout(page)

  await login(page, student)
  await page.goto('/aluno/quiz')
  await page.getByRole('button', { name: 'Iniciar quiz de hoje' }).click()
  await expect(page.locator('fieldset')).toHaveCount(1)
  for (let index = 0; index < 5; index++) {
    await page
      .locator('fieldset')
      .getByRole('radio', { name: 'Resposta correta', exact: true })
      .check()
    if (index < 4)
      await page.getByRole('button', { name: 'Próxima pergunta' }).click()
  }
  await page.getByRole('button', { name: 'Concluir quiz' }).click()
  await expect(
    page.getByText('Quiz de hoje concluído.', { exact: false }),
  ).toBeVisible()
  await expect(
    page.getByText('Nota 10 / 10', { exact: false }).first(),
  ).toBeVisible()
  await page.reload()
  await expect(
    page.getByRole('button', { name: 'Iniciar quiz de hoje' }),
  ).toHaveCount(0)
  await page.goto('/aluno/missoes')
  await page.getByRole('button', { name: 'Aceitar missão' }).click()
  await page
    .getByLabel('Sua entrega')
    .fill('Relatório de pesquisa com referências verificáveis.')
  await page.getByRole('button', { name: 'Enviar entrega' }).click()
  await expect(
    page.getByText('AGUARDANDO APROVACAO', { exact: true }),
  ).toBeVisible()
  await logout(page)

  await login(page, teacher)
  await page.goto('/professor/missoes')
  await page
    .getByLabel('Parecer da análise')
    .fill('Complemente as referências.')
  await page.getByRole('button', { name: 'Devolver para ajustes' }).click()
  await expect(page.getByText('DEVOLVIDA', { exact: true })).toBeVisible()
  await logout(page)
  await login(page, student)
  await page.goto('/aluno/missoes')
  await page
    .getByLabel('Sua entrega')
    .fill('Relatório revisado e referências complementadas.')
  await page.getByRole('button', { name: 'Enviar entrega' }).click()
  await expect(
    page.getByText('AGUARDANDO APROVACAO', { exact: true }),
  ).toBeVisible()
  await logout(page)
  await login(page, teacher)
  await page.goto('/professor/missoes')
  await page
    .getByLabel('Parecer da análise')
    .fill('Excelente trabalho, aprovado.')
  await page.getByRole('button', { name: 'Aprovar entrega' }).click()
  await expect(page.getByText('CONCLUIDA', { exact: true })).toBeVisible()
  await page
    .getByRole('button', { name: 'Encerrar missão', exact: true })
    .click()
  await expect(page.getByText('ENCERRADA', { exact: true })).toBeVisible()
  await logout(page)

  await login(page, student)
  await page.goto('/aluno/conquistas')
  await expect(
    page.getByRole('heading', { name: 'Nível 2', exact: true }),
  ).toBeVisible()
  await expect(
    page.getByText('110 moedas recebidas no total', { exact: true }),
  ).toBeVisible()
  await page.goto('/ranking')
  await expect(
    page.locator('.ranking-row').filter({ hasText: student.name }).first(),
  ).toBeVisible()
  await page.goto('/aluno/recompensas')
  await expect(page.getByText('Pago', { exact: true })).toBeVisible()
  await page.goto('/notificacoes')
  await expect(
    page.getByText('Nova conquista: Primeira moeda', { exact: true }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Marcar como lida' }).first().click()
  await expect(page.getByText('Lida', { exact: true }).first()).toBeVisible()
  await logout(page)

  await send(page, 'POST', '/auth/login', { login: company.login, password })
  const imageResponse = await page.request.post('/api/uploads/imagens', {
    headers: { 'X-XSRF-TOKEN': await csrf(page) },
    multipart: {
      file: {
        name: 'cafe.png',
        mimeType: 'image/png',
        buffer: Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGPg94kBAAElALjb7fUJAAAAAElFTkSuQmCC',
          'base64',
        ),
      },
    },
  })
  expect(imageResponse.ok()).toBeTruthy()
  const photo = ((await imageResponse.json()) as { url: string }).url
  const advantage = await send<{ id: string }>(page, 'POST', '/vantagens', {
    name: `Café solidário ${run}`,
    description: 'Uma bebida para compartilhar sua conquista.',
    photo,
    category: 'Alimentação',
    cost: 20,
    active: true,
  })
  await send(page, 'POST', '/auth/logout')
  await send(page, 'POST', '/auth/login', { login: student.login, password })
  await send(page, 'POST', `/vantagens/${advantage.id}/resgates`)
  await send(page, 'POST', '/auth/logout')
  await login(page, student)
  await page.goto('/aluno/cupons')
  await page.getByRole('button', { name: 'Doar vantagem' }).click()
  await chooseOption(
    page.getByLabel('Instituição beneficiária'),
    beneficiary.id,
  )
  await page.getByRole('button', { name: 'Revisar doação' }).click()
  await page.getByRole('button', { name: 'Confirmar doação' }).click()
  await expect(page.getByText('Doado', { exact: true })).toBeVisible()
  await page.reload()
  await expect(page.getByText('Doado', { exact: true })).toBeVisible()
  await logout(page)

  await login(page, beneficiary)
  await page.goto('/empresa/doacoes')
  await expect(
    page.getByRole('heading', { name: `Café solidário ${run}`, exact: true }),
  ).toBeVisible()
  await logout(page)
  await login(page, company)
  await page.goto('/empresa/desafios')
  await page.getByRole('button', { name: 'Nova proposta' }).click()
  await page.getByLabel('Título', { exact: true }).fill('Desafio sustentável')
  await page
    .getByLabel('Descrição', { exact: true })
    .fill('Propor uma solução sustentável para o campus.')
  await page.getByLabel('Recompensa em moedas').fill('100')
  await page.getByLabel('Quantidade de vagas').fill('2')
  await page.getByLabel('Orçamento proposto').fill('200')
  await page.getByLabel('Prazo de encerramento').fill('2035-12-10T18:00')
  await page.getByRole('button', { name: 'Salvar proposta' }).click()
  await page.getByRole('button', { name: 'Encaminhar proposta' }).click()
  await expect(
    page.getByText('PENDENTE FINANCIAMENTO', { exact: true }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Cancelar proposta' }).click()
  await expect(page.getByText('CANCELADO', { exact: true })).toBeVisible()
  expect(
    await page.evaluate(() => localStorage.getItem('puclim.demo.v1')),
  ).toBeNull()
})
