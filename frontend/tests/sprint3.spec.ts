import { expect, test, type Page } from '@playwright/test'
import { fileURLToPath } from 'node:url'

async function login(
  page: Page,
  login = 'aluno',
  password = 'Puclim@2026',
  succeeds = true,
) {
  await page.goto('/login')
  await page.getByLabel('Login ou e-mail').fill(login)
  await page.getByLabel('Senha', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Entrar na minha conta' }).click()
  if (succeeds) {
    await expect(page).not.toHaveURL(/\/login$/)
    await expect(
      page.getByRole('heading', { name: /^(Olá|Boas-vindas)/, level: 1 }),
    ).toBeVisible()
  }
}
async function logout(page: Page) {
  await page.getByRole('button', { name: 'Sair da conta' }).click()
  await expect(page).toHaveURL(/\/login$/)
}
test.beforeEach(async ({ page }) => {
  page.on('pageerror', (error) => {
    throw error
  })
})

test('login, proteção por perfil, modo escuro e persistência da sessão', async ({
  page,
}, info) => {
  await page.goto('/aluno/catalogo')
  await expect(page).toHaveURL(/\/login$/)
  await page.getByLabel('Login ou e-mail').fill('aluno')
  await page.getByLabel('Senha', { exact: true }).fill('errada')
  await page.getByRole('button', { name: 'Entrar na minha conta' }).click()
  await expect(page.getByRole('alert')).toContainText(
    'Login ou senha inválidos',
  )
  await login(page)
  await expect(
    page.getByRole('heading', { name: 'Olá, Mariana!' }),
  ).toBeVisible()
  await expect(page.getByLabel('Saldo de moedas')).toContainText('1.240')
  await page.screenshot({
    path: info.outputPath('aluno-desktop.png'),
    fullPage: true,
  })
  await expect(page.getByText(/Ver como|Estilo visual|Paleta/)).toHaveCount(0)
  await page.getByRole('button', { name: 'Ativar modo escuro' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect(
    page.getByRole('heading', { name: 'Olá, Mariana!' }),
  ).toBeVisible()
  await page.screenshot({
    path: info.outputPath('aluno-escuro.png'),
    fullPage: true,
  })
  await page.goto('/professor/enviar')
  await expect(page).toHaveURL(/\/aluno$/)
})

test('cadastro do aluno valida CPF e senhas e cria conta com saldo zero', async ({
  page,
}) => {
  await page.goto('/cadastro/aluno')
  await page.getByLabel('Nome completo').fill('Joana Exemplo')
  await page.getByLabel('E-mail', { exact: true }).fill('joana@puclim.demo')
  await page.getByLabel('Login', { exact: true }).fill('joana')
  await page.getByLabel('CPF', { exact: true }).fill('00000000000')
  await page.getByLabel('RG', { exact: true }).fill('MG123456')
  await page
    .getByLabel('Endereço completo')
    .fill('Rua das Ideias, 20, Belo Horizonte, MG')
  await page.getByLabel('Instituição de ensino').selectOption('institution')
  await page.getByLabel('Curso', { exact: true }).fill('Engenharia de Software')
  await page.getByLabel('Senha', { exact: true }).fill('Joana@2026')
  await page.getByLabel('Confirmar senha').fill('Outra@2026')
  await page.getByRole('button', { name: 'Criar minha conta' }).click()
  await expect(page.getByText('Informe um CPF válido.')).toBeVisible()
  await expect(page.getByText('As senhas não coincidem.')).toBeVisible()
  await page.getByLabel('CPF', { exact: true }).fill('39053344705')
  await page.getByLabel('Confirmar senha').fill('Joana@2026')
  await page.getByRole('button', { name: 'Criar minha conta' }).click()
  await expect(page.getByRole('heading', { name: 'Olá, Joana!' })).toBeVisible()
  await expect(page.getByLabel('Saldo de moedas')).toContainText('0')
  await page.getByRole('link', { name: 'Minha conta', exact: true }).click()
  await expect(page.getByLabel('CPF', { exact: true })).toHaveValue(
    '39053344705',
  )
})

test('cadastro de empresa valida CNPJ e respeita o tipo do parceiro', async ({
  page,
}) => {
  await page.goto('/cadastro/empresa')
  await page.getByLabel('Tipo de organização').selectOption('BENEFICIARIA')
  await page.getByLabel('Nome da organização').fill('Instituto Novos Caminhos')
  await page.getByLabel('CNPJ', { exact: true }).fill('00000000000000')
  await page.getByLabel('Telefone com DDD').fill('31999995555')
  await page.getByLabel('E-mail de contato').fill('instituto@puclim.demo')
  await page.getByLabel('Login', { exact: true }).fill('instituto')
  await page.getByLabel('Senha', { exact: true }).fill('Instituto@2026')
  await page.getByLabel('Confirmar senha').fill('Instituto@2026')
  await page
    .getByRole('button', { name: 'Cadastrar minha organização' })
    .click()
  await expect(page.getByText('Informe um CNPJ válido.')).toBeVisible()
  await page.getByLabel('CNPJ', { exact: true }).fill('04252011000110')
  await page
    .getByRole('button', { name: 'Cadastrar minha organização' })
    .click()
  await expect(page).toHaveURL(/\/empresa$/)
  await expect(
    page.getByRole('heading', { name: 'Olá, Instituto Novos Caminhos!' }),
  ).toBeVisible()
  await expect(
    page.getByRole('link', { name: 'Minhas vantagens' }),
  ).toHaveCount(0)
  await page.goto('/empresa/vantagens')
  await expect(page).toHaveURL(/\/empresa$/)
})

test('professor revisa envio, valida saldo e aluno recebe histórico e aviso', async ({
  page,
}) => {
  await login(page, 'professor')
  await page
    .getByRole('link', { name: 'Enviar moedas', exact: true })
    .first()
    .click()
  await page.getByRole('button', { name: /Mariana Oliveira/ }).click()
  await page.getByRole('button', { name: 'Continuar', exact: true }).click()
  await page.getByLabel('Quantidade de Pucoins').fill('99999')
  await page
    .getByLabel('Por que este aluno merece o reconhecimento?')
    .fill('Colaboração na revisão do projeto')
  await page.getByRole('button', { name: 'Revisar envio' }).click()
  await expect(
    page.getByText('A quantidade excede seu saldo disponível.'),
  ).toBeVisible()
  await page.getByLabel('Quantidade de Pucoins').fill('50')
  await page.getByRole('button', { name: 'Revisar envio' }).click()
  await expect(page.getByText('Um último olhar antes de enviar.')).toBeVisible()
  await page.getByRole('button', { name: 'Confirmar envio' }).click()
  await expect(
    page.getByRole('heading', { name: 'Reconhecimento enviado!' }),
  ).toBeVisible()
  await expect(page.getByLabel('Saldo de moedas')).toContainText('1.110')
  await logout(page)
  await login(page)
  await expect(page.getByLabel('Saldo de moedas')).toContainText('1.290')
  await page.goto('/aluno/extrato')
  await page.getByLabel('Buscar movimentação').fill('Colaboração na revisão')
  await expect(
    page.getByText('Colaboração na revisão do projeto', { exact: true }),
  ).toBeVisible()
  await page.goto('/notificacoes')
  await expect(page.getByText(/Helena Prado enviou 50 Pucoins/)).toBeVisible()
})

test('catálogo, saldo insuficiente, resgate e conferência única de cupom', async ({
  page,
}, info) => {
  await login(page)
  await page.goto('/aluno/catalogo')
  await expect(page.getByRole('article')).toHaveCount(6)
  await page.screenshot({
    path: info.outputPath('catalogo-desktop.png'),
    fullPage: true,
  })
  await page.getByLabel('Buscar vantagem ou empresa').fill('Mais conhecimento')
  await page.getByRole('button', { name: 'Ver detalhes' }).click()
  await expect(
    page.getByRole('button', { name: 'Quero resgatar' }),
  ).toBeDisabled()
  await page.getByRole('button', { name: 'Agora não' }).click()
  await page.getByLabel('Buscar vantagem ou empresa').fill('Café &')
  await page.getByRole('button', { name: 'Ver detalhes' }).click()
  await page.getByRole('button', { name: 'Quero resgatar' }).click()
  await expect(page.getByText('Saldo após o resgate')).toBeVisible()
  await page.getByRole('button', { name: 'Confirmar resgate' }).click()
  await expect(
    page.getByRole('heading', { name: 'Sua conquista virou vantagem!' }),
  ).toBeVisible()
  const code = await page.locator('dialog .coupon-code').innerText()
  await page.getByRole('link', { name: 'Ver meus cupons' }).click()
  await expect(page.getByText(code, { exact: true })).toBeVisible()
  await logout(page)
  await login(page, 'empresa')
  await page.goto('/empresa/cupons')
  await page.getByLabel('Código do cupom').fill(code)
  await page.getByRole('button', { name: 'Conferir código' }).click()
  await page
    .getByRole('button', { name: 'Confirmar utilização', exact: true })
    .click()
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Confirmar utilização', exact: true })
    .click()
  await expect(page.getByText('Já utilizado', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Conferir código' }).click()
  await expect(
    page.getByRole('button', { name: 'Confirmar utilização', exact: true }),
  ).toHaveCount(0)
  await logout(page)
  await login(page, 'livraria')
  await page.goto('/empresa/cupons')
  await page.getByLabel('Código do cupom').fill(code)
  await page.getByRole('button', { name: 'Conferir código' }).click()
  await expect(page.getByRole('alert')).toContainText(
    'Cupom não encontrado ou pertencente a outra empresa.',
  )
})

test('empresa cadastra foto, edita e preserva cupons emitidos', async ({
  page,
}) => {
  await login(page, 'empresa')
  await page.goto('/empresa/vantagens/nova')
  await page.getByLabel('Nome da vantagem').fill('Lanche de boas ideias')
  await page
    .getByLabel('Descrição e instruções de uso')
    .fill('Um lanche e uma bebida para aproveitar no campus.')
  await page.getByLabel('Custo em Pucoins').fill('75')
  await page
    .getByLabel('Foto da vantagem')
    .setInputFiles(
      fileURLToPath(new URL('../public/images/coffee.jpg', import.meta.url)),
    )
  await page.getByRole('button', { name: 'Cadastrar vantagem' }).click()
  await expect(
    page.getByRole('heading', { name: 'Lanche de boas ideias' }),
  ).toBeVisible()
  const card = page
    .getByRole('article')
    .filter({ has: page.getByRole('heading', { name: 'Uma pausa com sabor' }) })
  await card.getByRole('link', { name: 'Editar' }).click()
  await expect(page.getByAltText('Prévia da foto selecionada')).toBeVisible()
  await page.getByLabel('Nome da vantagem').fill('Novo nome do almoço')
  await page.getByLabel('Custo em Pucoins').fill('220')
  await page.getByRole('button', { name: 'Salvar alterações' }).click()
  await page
    .getByRole('button', { name: 'Excluir Novo nome do almoço', exact: true })
    .click()
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Confirmar', exact: true })
    .click()
  await logout(page)
  await login(page)
  await page.goto('/aluno/cupons')
  await expect(
    page.getByRole('heading', { name: 'Uma pausa com sabor' }),
  ).toBeVisible()
  await expect(page.getByText('PCL-7K2Q-4821', { exact: true })).toBeVisible()
  await page.goto('/aluno/catalogo')
  await expect(
    page.getByRole('heading', { name: 'Novo nome do almoço' }),
  ).toHaveCount(0)
})

test('importação rejeita duplicidades e exige nova senha no primeiro acesso', async ({
  page,
}) => {
  await login(page, 'instituicao')
  await page.goto('/empresa/professores')
  const source =
    'nome;cpf;departamento;email;login\n"Ana Exemplo";39053344705;"Software; Arquitetura";ana@puclim.demo;ana\nDuplicada;39053344705;Software;outra@puclim.demo;outra\nProfessor Existente;11144477735;Software;existente@puclim.demo;existente'
  await page.getByLabel('Arquivo CSV de professores').setInputFiles({
    name: 'professores.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(source),
  })
  await expect(
    page.getByText('CPF, e-mail ou login repetido neste arquivo.'),
  ).toBeVisible()
  await page
    .getByRole('button', { name: 'Importar 2 professores válidos' })
    .click()
  await expect(
    page.getByText('1 professores importados. 2 linhas não foram importadas.'),
  ).toBeVisible()
  const password = await page.locator('code').innerText()
  await logout(page)
  await login(page, 'ana', password)
  await expect(page).toHaveURL(/\/primeiro-acesso$/)
  await page.goto('/professor/enviar')
  await expect(page).toHaveURL(/\/primeiro-acesso$/)
  await page.getByLabel('Senha temporária recebida').fill(password)
  await page.getByLabel('Nova senha', { exact: true }).fill('AnaNova@2026')
  await page.getByLabel('Confirmar nova senha').fill('AnaNova@2026')
  await page.getByRole('button', { name: 'Definir senha e continuar' }).click()
  await expect(page.getByRole('heading', { name: 'Olá, Ana!' })).toBeVisible()
  await expect(page.getByLabel('Saldo de moedas')).toContainText('1.000')
  await logout(page)
  await login(page, 'ana', 'AnaNova@2026')
  await expect(page.getByLabel('Saldo de moedas')).toContainText('1.000')
})

test('perfil valida duplicidades, altera senha e confirma exclusão', async ({
  page,
}) => {
  await login(page)
  await page.goto('/perfil')
  await page.getByLabel('E-mail', { exact: true }).fill('empresa@puclim.demo')
  await page.getByRole('button', { name: 'Salvar alterações' }).click()
  await expect(page.getByRole('alert')).toContainText(
    'Este e-mail ou login já está cadastrado.',
  )
  await page
    .getByLabel('E-mail', { exact: true })
    .fill('mariana.nova@puclim.demo')
  await page.getByLabel('Nome completo').fill('Mariana Atualizada')
  await page.getByRole('button', { name: 'Salvar alterações' }).click()
  await expect(page.getByRole('status')).toContainText(
    'Seus dados foram atualizados.',
  )
  await page.getByLabel('Senha atual').fill('Puclim@2026')
  await page.getByLabel('Nova senha', { exact: true }).fill('MarianaNova@2026')
  await page.getByLabel('Confirmar nova senha').fill('MarianaNova@2026')
  await page.getByRole('button', { name: 'Atualizar senha' }).click()
  await expect(page.getByRole('status')).toContainText(
    'Sua senha foi atualizada.',
  )
  await page.getByRole('button', { name: 'Excluir minha conta' }).click()
  await expect(
    page
      .getByRole('dialog')
      .getByRole('button', { name: 'Excluir minha conta' }),
  ).toBeDisabled()
  await page.getByLabel('Digite EXCLUIR para confirmar').fill('EXCLUIR')
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Excluir minha conta' })
    .click()
  await expect(page).toHaveURL(/\/login$/)
  await login(page, 'aluno', 'MarianaNova@2026', false)
  await expect(page.getByRole('alert')).toContainText(
    'Login ou senha inválidos.',
  )
})

test('instituição com vínculos não pode ser excluída', async ({ page }) => {
  await login(page, 'instituicao')
  await page.goto('/perfil')
  await page.getByRole('button', { name: 'Excluir minha conta' }).click()
  await page.getByLabel('Digite EXCLUIR para confirmar').fill('EXCLUIR')
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Excluir minha conta' })
    .click()
  await expect(page.getByRole('alert')).toContainText(
    'possui alunos ou professores vinculados',
  )
})

test('demonstração serializa resgates concorrentes e conserva saldo e histórico', async ({
  page,
}) => {
  await login(page)
  const result = await page.evaluate(async () => {
    // Importa o mesmo adaptador utilizado pelas telas; não altera o saldo diretamente.
    const { api } = await import('/src/shared/lib/api.ts')
    const outcomes = await Promise.allSettled(
      Array.from({ length: 5 }, () => api.redeem('event')),
    )
    const account = await api.session()
    const transactions = await api.transactions()
    return {
      fulfilled: outcomes.filter((value) => value.status === 'fulfilled')
        .length,
      balance: account?.balance,
      sum: transactions.reduce(
        (total: number, item: { amount: number }) => total + item.amount,
        0,
      ),
    }
  })
  expect(result.fulfilled).toBe(3)
  expect(result.balance).toBe(280)
  expect(result.sum).toBe(280)
  await page.reload()
  await expect(page.getByLabel('Saldo de moedas')).toContainText('280')
})

test('sessão expira por inatividade', async ({ page }) => {
  await login(page)
  await expect(
    page.getByRole('heading', { name: 'Olá, Mariana!' }),
  ).toBeVisible()
  await page.evaluate(() => {
    const key = 'puclim.demo.session'
    const session = JSON.parse(sessionStorage.getItem(key)!)
    session.lastActivity = Date.now() - 31 * 60 * 1000
    sessionStorage.setItem(key, JSON.stringify(session))
  })
  await page.reload()
  await expect(page).toHaveURL(/\/login$/)
})

test('layout mobile, navegação, foco do diálogo e ausência de overflow', async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await login(page)
  await expect(
    page.getByRole('heading', { name: 'Olá, Mariana!' }),
  ).toBeVisible()
  await page.screenshot({
    path: info.outputPath('aluno-mobile.png'),
    fullPage: true,
  })
  await page.getByRole('button', { name: 'Abrir menu' }).click()
  await page.getByRole('link', { name: 'Vantagens', exact: true }).click()
  await expect(
    page.getByRole('button', { name: 'Abrir menu' }),
  ).toHaveAttribute('aria-expanded', 'false')
  await expect(
    page.getByRole('heading', { name: 'Catálogo de vantagens' }),
  ).toBeVisible()
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy()
  await page.screenshot({
    path: info.outputPath('catalogo-mobile.png'),
    fullPage: true,
  })
  for (const width of [320, 360, 768, 1024, 1280, 1440, 1920, 2550]) {
    await page.setViewportSize({ width, height: 900 })
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
      `overflow em ${width}px`,
    ).toBeTruthy()
    const margins = await page.evaluate(() => {
      const content = document
        .querySelector('.content')!
        .getBoundingClientRect()
      const workspace = document
        .querySelector('.workspace')!
        .getBoundingClientRect()
      return {
        left: content.left - workspace.left,
        right: workspace.right - content.right,
      }
    })
    expect(margins.left).toBeGreaterThanOrEqual(0)
    expect(margins.right).toBeGreaterThanOrEqual(0)
    expect(
      Math.abs(margins.left - margins.right),
      `conteúdo deve permanecer centralizado em ${width}px`,
    ).toBeLessThanOrEqual(1)
  }
  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByRole('button', { name: 'Ver detalhes' }).first().click()
  await expect(page.getByRole('dialog')).toBeVisible()
  expect(
    await page.evaluate(() =>
      document.querySelector('dialog')?.contains(document.activeElement),
    ),
  ).toBeTruthy()
  for (const [width, height] of [
    [320, 568],
    [568, 320],
    [1440, 900],
    [2550, 1260],
  ]) {
    await page.setViewportSize({ width, height })
    const bounds = await page.getByRole('dialog').boundingBox()
    if (width < 768) {
      expect(bounds!.x).toBe(0)
      expect(bounds!.width).toBe(width)
      expect(Math.abs(bounds!.y + bounds!.height - height)).toBeLessThanOrEqual(
        1,
      )
    } else {
      expect(bounds!.x).toBeGreaterThanOrEqual(16)
      expect(bounds!.y).toBeGreaterThanOrEqual(16)
      expect(
        Math.abs(bounds!.y + bounds!.height / 2 - height / 2),
      ).toBeLessThanOrEqual(1)
    }
    expect(
      Math.abs(bounds!.x + bounds!.width / 2 - width / 2),
    ).toBeLessThanOrEqual(1)
    await expect(
      page.getByRole('button', { name: 'Quero resgatar' }),
    ).toBeInViewport({ ratio: 1 })
    if (width === 320 || width === 2550) {
      await page.screenshot({
        path: info.outputPath(`detalhes-${width}.png`),
        fullPage: false,
      })
    }
  }
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.setViewportSize({ width: 2550, height: 1260 })
  await page.goto('/aluno/cupons')
  await expect(page.getByRole('article').first()).toBeVisible()
  const coupon = await page.getByRole('article').first().boundingBox()
  expect(
    coupon!.width,
    'um cupom isolado não deve se esticar pela tela',
  ).toBeLessThan(850)
  await expect(page.getByText('O mérito começa com você.')).toBeVisible()
  await page.getByRole('link', { name: 'Notificações', exact: true }).click()
  await expect(
    page.getByRole('heading', { name: 'Suas notificações' }),
  ).toBeVisible()
})
