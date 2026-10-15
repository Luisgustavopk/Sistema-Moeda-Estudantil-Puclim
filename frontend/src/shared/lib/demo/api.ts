import type {
  Account,
  AdvantageInput,
  PuclimApi,
  Transaction,
  TransactionFilters,
} from '@/shared/types/domain'
import { digits } from '@/shared/utils/format'
import { ApiError } from '../errors'
import {
  addNotification,
  clearDemoSession,
  credential,
  currentAccount,
  quota,
  setDemoSession,
  withStore,
  type DemoStore,
} from './store'

function availableIdentity(
  store: DemoStore,
  email: string,
  login: string,
  except?: string,
) {
  const values = [email.trim().toLowerCase(), login.trim().toLowerCase()]
  if (
    store.accounts.some(
      (account) =>
        account.id !== except &&
        [account.email.toLowerCase(), account.login.toLowerCase()].some(
          (value) => values.includes(value),
        ),
    )
  )
    throw new ApiError('Este e-mail ou login já está cadastrado.')
}
async function createAccount(
  store: DemoStore,
  input: Omit<Account, 'id' | 'active' | 'balance'>,
  password: string,
) {
  availableIdentity(store, input.email, input.login)
  if (
    input.cpf &&
    store.accounts.some((account) => account.cpf === digits(input.cpf!))
  )
    throw new ApiError('Este CPF já está cadastrado.')
  if (
    input.cnpj &&
    store.accounts.some((account) => account.cnpj === digits(input.cnpj!))
  )
    throw new ApiError('Este CNPJ já está cadastrado.')
  const account: Account = {
    ...input,
    email: input.email.trim().toLowerCase(),
    login: input.login.trim().toLowerCase(),
    cpf: input.cpf ? digits(input.cpf) : undefined,
    cnpj: input.cnpj ? digits(input.cnpj) : undefined,
    id: crypto.randomUUID(),
    active: true,
    balance: 0,
  }
  store.credentials[account.id] = await credential(password)
  store.accounts.push(account)
  return account
}
function company(store: DemoStore) {
  const account = currentAccount(store, ['EMPRESA'])
  if (account.partnerKind !== 'EMPRESA')
    throw new ApiError(
      'Esta função é destinada às empresas que oferecem vantagens.',
      403,
    )
  return account
}
function validateAdvantage(input: AdvantageInput) {
  if (
    !input.name.trim() ||
    !input.description.trim() ||
    !input.photo ||
    !Number.isSafeInteger(input.cost) ||
    input.cost <= 0
  )
    throw new ApiError(
      'Preencha os dados da vantagem e informe um custo inteiro maior que zero.',
    )
}
function filterTransactions(values: Transaction[], filters?: TransactionFilters) {
  const search = filters?.search?.toLocaleLowerCase('pt-BR') || ''
  return values.filter((item) => {
    const date = new Date(item.date)
    const localDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    const text = `${item.description} ${item.counterpart || ''} ${item.reason || ''}`.toLocaleLowerCase('pt-BR')
    const type = filters?.type
    return (
      (!filters?.from || localDate >= filters.from) &&
      (!filters?.to || localDate <= filters.to) &&
      (!search || text.includes(search)) &&
      (!type || type === 'all' ||
        (type === 'entradas' ? item.amount > 0 : type === 'saidas' ? item.amount < 0 : item.kind === type))
    )
  })
}

export const demoApi: PuclimApi = {
  session: () =>
    withStore((store) => {
      try {
        return currentAccount(store)
      } catch {
        return null
      }
    }),
  login: (login, password) =>
    withStore(async (store) => {
      const normalized = login.trim().toLowerCase()
      const account = store.accounts.find(
        (value) =>
          value.active &&
          (value.login.toLowerCase() === normalized ||
            value.email.toLowerCase() === normalized),
      )
      const secret = account && store.credentials[account.id]
      if (
        !account ||
        !secret ||
        (await credential(password, secret.salt)).hash !== secret.hash
      )
        throw new ApiError('Login ou senha inválidos.', 401)
      quota(store, account)
      setDemoSession(account.id)
      return account
    }),
  logout: async () => {
    clearDemoSession()
  },
  registerStudent: (input) =>
    withStore(async (store) => {
      const institution = store.accounts.find(
        (value) =>
          value.id === input.institutionId &&
          value.active &&
          value.partnerKind === 'ENSINO',
      )
      if (!institution)
        throw new ApiError('Selecione uma instituição de ensino ativa.')
      const { password, ...profile } = input
      return createAccount(store, { ...profile, role: 'ALUNO' }, password)
    }),
  registerPartner: (input) =>
    withStore(async (store) => {
      const { password, ...profile } = input
      return createAccount(store, { ...profile, role: 'EMPRESA' }, password)
    }),
  institutions: () =>
    withStore((store) =>
      store.accounts
        .filter((value) => value.active && value.partnerKind === 'ENSINO')
        .map(({ id, name }) => ({ id, name })),
    ),
  updateProfile: (input) =>
    withStore((store) => {
      const account = currentAccount(store)
      availableIdentity(store, input.email, account.login, account.id)
      account.name = input.name.trim()
      account.email = input.email.trim().toLowerCase()
      if (account.role === 'ALUNO') {
        account.address = input.address?.trim()
        account.course = input.course?.trim()
      }
      if (account.role === 'EMPRESA') {
        account.phone = input.phone?.trim()
        account.description = input.description?.trim()
      }
      return account
    }),
  changePassword: (currentPassword, password) =>
    withStore(async (store) => {
      const account = currentAccount(store)
      const secret = store.credentials[account.id]
      if ((await credential(currentPassword, secret.salt)).hash !== secret.hash)
        throw new ApiError('A senha atual não confere.')
      if (password.length < 8 || password.length > 128)
        throw new ApiError('A nova senha deve ter entre 8 e 128 caracteres.')
      store.credentials[account.id] = await credential(password)
      account.mustChangePassword = false
      return account
    }),
  deleteAccount: () =>
    withStore((store) => {
      const account = currentAccount(store, ['ALUNO', 'EMPRESA'])
      if (
        account.partnerKind === 'ENSINO' &&
        store.accounts.some(
          (value) => value.active && value.institutionId === account.id,
        )
      )
        throw new ApiError(
          'Esta instituição possui alunos ou professores vinculados e não pode ser excluída.',
        )
      account.active = false
      if (account.role === 'EMPRESA')
        store.advantages
          .filter((value) => value.companyId === account.id)
          .forEach((value) => {
            value.active = false
          })
      clearDemoSession()
    }),
  students: () =>
    withStore((store) => {
      currentAccount(store, ['PROFESSOR'])
      return store.accounts
        .filter((value) => value.active && value.role === 'ALUNO')
        .map((value) => ({
          id: value.id,
          name: value.name,
          course: value.course || '',
          institution:
            store.accounts.find(
              (institution) => institution.id === value.institutionId,
            )?.name || '',
        }))
    }),
  teachers: () =>
    withStore((store) => {
      const institution = currentAccount(store, ['EMPRESA'])
      if (institution.partnerKind !== 'ENSINO')
        throw new ApiError(
          'Acesso disponível apenas à instituição de ensino.',
          403,
        )
      return store.accounts
        .filter(
          (value) =>
            value.active &&
            value.role === 'PROFESSOR' &&
            value.institutionId === institution.id,
        )
        .map(({ id, name, login, department, email }) => ({
          id,
          name,
          login,
          department: department || '',
          email,
        }))
    }),
  importTeachers: (rows) =>
    withStore(async (store) => {
      const institution = currentAccount(store, ['EMPRESA'])
      if (institution.partnerKind !== 'ENSINO')
        throw new ApiError(
          'Acesso disponível apenas à instituição de ensino.',
          403,
        )
      const result: Awaited<ReturnType<PuclimApi['importTeachers']>> = {
        created: 0,
        errors: [],
        access: [],
      }
      for (const row of rows) {
        try {
          if (row.error) throw new ApiError(row.error)
          const temporaryPassword = `Pcl@${crypto.randomUUID().slice(0, 12)}`
          const account = await createAccount(
            store,
            {
              role: 'PROFESSOR',
              name: row.name,
              email: row.email,
              login: row.login,
              cpf: row.cpf,
              department: row.department,
              institutionId: institution.id,
              mustChangePassword: true,
            },
            temporaryPassword,
          )
          result.created++
          result.access.push({
            name: account.name,
            login: account.login,
            temporaryPassword,
          })
          addNotification(
            store,
            account.id,
            'Boas-vindas ao Puclim',
            `Seu login: ${account.login}. Defina sua senha no primeiro acesso. A credencial inicial foi disponibilizada à instituição.`,
          )
        } catch (error) {
          result.errors.push({
            line: row.line,
            message:
              error instanceof Error
                ? error.message
                : 'Não foi possível importar esta linha.',
          })
        }
      }
      return result
    }),
  transactions: (filters) =>
    withStore((store) => {
      const values = (
        store.transactions[currentAccount(store, ['ALUNO', 'PROFESSOR']).id] || []
      ).toSorted((a, b) => b.date.localeCompare(a.date))
      return filterTransactions(values, filters)
    }),
  exportTransactions: async (filters) => {
    const values = await demoApi.transactions(filters)
    const csvCell = (value: string) =>
      `"${(/^[=+\-@]/.test(value) ? `'${value}` : value).replace(/"/g, '""')}"`
    const rows = values.map((item) =>
      [
        csvCell(new Date(item.date).toLocaleString('pt-BR')),
        csvCell(item.kind),
        csvCell(item.description),
        csvCell(item.counterpart || ''),
        csvCell(item.reason || ''),
        csvCell(String(item.amount)),
      ].join(';'),
    )
    return new Blob(['\uFEFF', ['Data;Tipo;Descrição;Pessoa ou empresa;Motivo;Pucoins', ...rows].join('\r\n')], {
      type: 'text/csv;charset=utf-8',
    })
  },
  transfer: (studentId, amount, reason) =>
    withStore((store) => {
      const teacher = currentAccount(store, ['PROFESSOR'])
      const student = store.accounts.find(
        (value) =>
          value.id === studentId && value.active && value.role === 'ALUNO',
      )
      if (!student)
        throw new ApiError('O aluno selecionado não está disponível.')
      if (!Number.isSafeInteger(amount) || amount <= 0 || !reason.trim())
        throw new ApiError(
          'Informe uma quantidade inteira positiva e o motivo do reconhecimento.',
        )
      if (amount > teacher.balance)
        throw new ApiError('Saldo insuficiente para este envio.')
      const transaction: Transaction = {
        id: crypto.randomUUID(),
        date: new Date().toISOString(),
        kind: 'ENVIO',
        amount: -amount,
        description: `Reconhecimento para ${student.name}`,
        counterpart: student.name,
        reason: reason.trim(),
      }
      teacher.balance -= amount
      student.balance += amount
      ;(store.transactions[teacher.id] ||= []).unshift(transaction)
      ;(store.transactions[student.id] ||= []).unshift({
        ...transaction,
        kind: 'RECEBIMENTO',
        amount,
        description: 'Reconhecimento recebido',
        counterpart: teacher.name,
      })
      addNotification(
        store,
        student.id,
        'Seu esforço foi reconhecido',
        `${teacher.name} enviou ${amount} Pucoins. Motivo: ${reason.trim()}`,
      )
      return transaction
    }),
  advantages: (own) =>
    withStore((store) => {
      const account = currentAccount(store, own ? ['EMPRESA'] : ['ALUNO'])
      return store.advantages.filter((value) =>
        own
          ? value.companyId === account.id
          : value.active &&
            store.accounts.some(
              (owner) => owner.id === value.companyId && owner.active,
            ),
      )
    }),
  uploadPhoto: async (file) => {
    if (
      !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
      file.size > 2 * 1024 * 1024
    )
      throw new ApiError('Envie uma imagem JPG, PNG ou WebP de até 2 MB.')
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = () =>
        reject(new ApiError('Não foi possível ler a imagem.'))
      reader.readAsDataURL(file)
    })
  },
  saveAdvantage: (input, id) =>
    withStore((store) => {
      const account = company(store)
      validateAdvantage(input)
      if (id) {
        const advantage = store.advantages.find(
          (value) => value.id === id && value.companyId === account.id,
        )
        if (!advantage) throw new ApiError('Vantagem não encontrada.', 404)
        Object.assign(advantage, input)
        return advantage
      }
      const advantage = {
        ...input,
        id: crypto.randomUUID(),
        companyId: account.id,
        companyName: account.name,
      }
      store.advantages.unshift(advantage)
      return advantage
    }),
  deleteAdvantage: (id) =>
    withStore((store) => {
      const account = company(store)
      const advantage = store.advantages.find(
        (value) => value.id === id && value.companyId === account.id,
      )
      if (!advantage) throw new ApiError('Vantagem não encontrada.', 404)
      if (store.coupons.some((value) => value.advantageId === advantage.id))
        advantage.active = false
      else
        store.advantages = store.advantages.filter((value) => value.id !== id)
    }),
  redeem: (id) =>
    withStore((store) => {
      const account = currentAccount(store, ['ALUNO'])
      const advantage = store.advantages.find(
        (value) => value.id === id && value.active,
      )
      if (
        !advantage ||
        !store.accounts.some(
          (value) => value.id === advantage.companyId && value.active,
        )
      )
        throw new ApiError('Esta vantagem não está mais disponível.')
      if (account.balance < advantage.cost)
        throw new ApiError(
          'Você ainda não tem saldo suficiente para este resgate.',
        )
      let code: string
      do {
        code = `PCL-${crypto.randomUUID().slice(0, 8).toUpperCase()}`
      } while (store.coupons.some((value) => value.code === code))
      const coupon = {
        id: crypto.randomUUID(),
        advantageId: advantage.id,
        code,
        studentId: account.id,
        studentName: account.name,
        companyId: advantage.companyId,
        companyName: advantage.companyName,
        advantageName: advantage.name,
        cost: advantage.cost,
        date: new Date().toISOString(),
        status: 'VALIDO' as const,
      }
      account.balance -= advantage.cost
      store.coupons.unshift(coupon)
      ;(store.transactions[account.id] ||= []).unshift({
        id: coupon.id,
        date: coupon.date,
        kind: 'RESGATE',
        amount: -advantage.cost,
        description: advantage.name,
        counterpart: advantage.companyName,
      })
      addNotification(
        store,
        account.id,
        'Seu cupom está pronto',
        `${advantage.name} · ${advantage.companyName} · Código: ${code}. Apresente o código no atendimento presencial.`,
      )
      addNotification(
        store,
        advantage.companyId,
        'Um novo resgate por aqui',
        `${account.name} resgatou ${advantage.name}. Código: ${code}.`,
      )
      return coupon
    }),
  coupons: () =>
    withStore((store) => {
      const account = currentAccount(store, ['ALUNO', 'EMPRESA'])
      return store.coupons.filter((value) =>
        account.role === 'ALUNO'
          ? value.studentId === account.id
          : value.companyId === account.id,
      )
    }),
  checkCoupon: (code) =>
    withStore((store) => {
      const account = company(store)
      const coupon = store.coupons.find(
        (value) =>
          value.code === code.trim().toUpperCase() &&
          value.companyId === account.id,
      )
      if (!coupon)
        throw new ApiError(
          'Cupom não encontrado ou pertencente a outra empresa.',
          404,
        )
      return coupon
    }),
  useCoupon: (code) =>
    withStore((store) => {
      const account = company(store)
      const coupon = store.coupons.find(
        (value) =>
          value.code === code.trim().toUpperCase() &&
          value.companyId === account.id,
      )
      if (!coupon)
        throw new ApiError(
          'Cupom não encontrado ou pertencente a outra empresa.',
          404,
        )
      if (coupon.status === 'UTILIZADO')
        throw new ApiError('Este cupom já foi utilizado.')
      coupon.status = 'UTILIZADO'
      coupon.usedAt = new Date().toISOString()
      return coupon
    }),
  notifications: () =>
    withStore((store) => store.notifications[currentAccount(store).id] || []),
}
