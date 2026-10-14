import type {
  Account,
  Advantage,
  Coupon,
  Notification,
  Transaction,
} from '@/shared/types/domain'
import { ApiError } from '../errors'

interface Credential {
  salt: string
  hash: string
}
export interface DemoStore {
  accounts: Account[]
  credentials: Record<string, Credential>
  transactions: Record<string, Transaction[]>
  advantages: Advantage[]
  coupons: Coupon[]
  notifications: Record<string, Notification[]>
}
const STORE_KEY = 'puclim.demo.v1'
const SESSION_KEY = 'puclim.demo.session'
export const SESSION_TIMEOUT = 30 * 60 * 1000
const hex = (data: ArrayBuffer) =>
  Array.from(new Uint8Array(data), (value) =>
    value.toString(16).padStart(2, '0'),
  ).join('')
export async function credential(
  password: string,
  salt: string = crypto.randomUUID(),
): Promise<Credential> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  )
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: new TextEncoder().encode(salt),
      iterations: 120000,
      hash: 'SHA-256',
    },
    key,
    256,
  )
  return { salt, hash: hex(bits) }
}
export function setDemoSession(id: string) {
  sessionStorage.setItem(
    SESSION_KEY,
    JSON.stringify({ id, lastActivity: Date.now() }),
  )
}
export function clearDemoSession() {
  sessionStorage.removeItem(SESSION_KEY)
}
export function touchDemoSession() {
  const session = sessionId()
  if (session) setDemoSession(session)
}
function sessionId(): string | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null') as {
      id: string
      lastActivity: number
    } | null
    if (!value || Date.now() - value.lastActivity >= SESSION_TIMEOUT) {
      clearDemoSession()
      return null
    }
    return value.id
  } catch {
    clearDemoSession()
    return null
  }
}
export function currentAccount(
  store: DemoStore,
  roles?: Account['role'][],
): Account {
  const account = store.accounts.find(
    (value) => value.id === sessionId() && value.active,
  )
  if (!account) throw new ApiError('Sua sessão expirou. Entre novamente.', 401)
  if (roles && !roles.includes(account.role))
    throw new ApiError('Você não tem permissão para esta operação.', 403)
  return account
}
export function addNotification(
  store: DemoStore,
  accountId: string,
  subject: string,
  body: string,
) {
  const recipient =
    store.accounts.find((account) => account.id === accountId)?.email || ''
  const notification: Notification = {
    id: crypto.randomUUID(),
    subject,
    body,
    date: new Date().toISOString(),
    recipient,
  }
  ;(store.notifications[accountId] ||= []).unshift(notification)
}
export function quota(store: DemoStore, account: Account) {
  if (account.role !== 'PROFESSOR') return
  const today = new Date()
  const semester = `${today.getFullYear()}/${today.getMonth() < 6 ? 1 : 2}`
  const id = `cota-${account.id}-${semester}`
  if ((store.transactions[account.id] || []).some((value) => value.id === id))
    return
  account.balance += 1000
  ;(store.transactions[account.id] ||= []).unshift({
    id,
    date: today.toISOString(),
    kind: 'COTA',
    amount: 1000,
    description: `Cota semestral · ${semester}`,
  })
}
async function seed(): Promise<DemoStore> {
  const accounts: Account[] = [
    {
      id: 'institution',
      role: 'EMPRESA',
      name: 'PUC Minas',
      email: 'instituicao@puclim.demo',
      login: 'instituicao',
      balance: 0,
      active: true,
      cnpj: '11222333000181',
      phone: '3133194444',
      description: 'Conhecimento que transforma.',
      partnerKind: 'ENSINO',
    },
    {
      id: 'company',
      role: 'EMPRESA',
      name: 'Cantina Central',
      email: 'empresa@puclim.demo',
      login: 'empresa',
      balance: 0,
      active: true,
      cnpj: '11444777000161',
      phone: '31999990000',
      description: 'Uma pausa gostosa no seu dia de campus.',
      partnerKind: 'EMPRESA',
    },
    {
      id: 'books',
      role: 'EMPRESA',
      name: 'Livraria Entrelinhas',
      email: 'livraria@puclim.demo',
      login: 'livraria',
      balance: 0,
      active: true,
      cnpj: '19131243000197',
      phone: '3133335555',
      description: 'Novas histórias, novas possibilidades.',
      partnerKind: 'EMPRESA',
    },
    {
      id: 'teacher',
      role: 'PROFESSOR',
      name: 'Helena Prado',
      email: 'professor@puclim.demo',
      login: 'professor',
      balance: 0,
      active: true,
      cpf: '11144477735',
      department: 'Engenharia de Software',
      institutionId: 'institution',
    },
    {
      id: 'student',
      role: 'ALUNO',
      name: 'Mariana Oliveira',
      email: 'aluno@puclim.demo',
      login: 'aluno',
      balance: 0,
      active: true,
      cpf: '52998224725',
      rg: 'MG-18.234.567',
      address: 'Rua do Conhecimento, 120 · Belo Horizonte, MG',
      course: 'Engenharia de Software',
      institutionId: 'institution',
    },
    {
      id: 'rafael',
      role: 'ALUNO',
      name: 'Rafael Mendes',
      email: 'rafael@puclim.demo',
      login: 'rafael',
      balance: 0,
      active: true,
      cpf: '12345678909',
      rg: 'MG-12.345.678',
      address: 'Rua das Flores, 100 · Belo Horizonte, MG',
      course: 'Ciência da Computação',
      institutionId: 'institution',
    },
    {
      id: 'beatriz',
      role: 'ALUNO',
      name: 'Beatriz Nogueira',
      email: 'beatriz@puclim.demo',
      login: 'beatriz',
      balance: 0,
      active: true,
      cpf: '98765432100',
      rg: 'MG-22.345.678',
      address: 'Rua das Flores, 200 · Belo Horizonte, MG',
      course: 'Engenharia de Software',
      institutionId: 'institution',
    },
  ]
  const base = await credential('Puclim@2026')
  const store: DemoStore = {
    accounts,
    credentials: Object.fromEntries(
      accounts.map((account) => [account.id, base]),
    ),
    transactions: {},
    advantages: [],
    coupons: [],
    notifications: {},
  }
  const teacher = accounts.find((account) => account.id === 'teacher')!
  const today = new Date()
  const semester = `${today.getFullYear()}/${today.getMonth() < 6 ? 1 : 2}`
  store.transactions.teacher = [
    {
      id: `cota-teacher-${semester}`,
      date: new Date(
        today.getFullYear(),
        today.getMonth() < 6 ? 0 : 6,
        1,
        9,
      ).toISOString(),
      kind: 'COTA',
      amount: 1000,
      description: `Cota semestral · ${semester}`,
    },
    {
      id: 'quota-previous-1',
      date: new Date(today.getFullYear() - 1, 6, 1, 9).toISOString(),
      kind: 'COTA',
      amount: 1000,
      description: `Cota semestral · ${today.getFullYear() - 1}/2`,
    },
    {
      id: 'quota-previous-2',
      date: new Date(today.getFullYear() - 1, 0, 1, 9).toISOString(),
      kind: 'COTA',
      amount: 1000,
      description: `Cota semestral · ${today.getFullYear() - 1}/1`,
    },
  ]
  teacher.balance = 3000
  const recognition = [
    {
      studentId: 'student',
      amount: 1000,
      reason: 'Destaque no projeto interdisciplinar',
      days: 20,
    },
    {
      studentId: 'student',
      amount: 240,
      reason: 'Colaboração e apoio aos colegas',
      days: 10,
    },
    {
      studentId: 'student',
      amount: 120,
      reason: 'Apresentação do laboratório de arquitetura',
      days: 4,
    },
    {
      studentId: 'student',
      amount: 60,
      reason: 'Participação no seminário de arquitetura',
      days: 1,
    },
    {
      studentId: 'rafael',
      amount: 240,
      reason: 'Excelente revisão por pares',
      days: 3,
    },
    {
      studentId: 'beatriz',
      amount: 180,
      reason: 'Participação e dedicação em aula',
      days: 2,
    },
  ]
  recognition.forEach((item) => {
    const student = accounts.find((account) => account.id === item.studentId)!
    const date = new Date(Date.now() - item.days * 86400000).toISOString()
    const id = crypto.randomUUID()
    teacher.balance -= item.amount
    student.balance += item.amount
    store.transactions.teacher.unshift({
      id,
      date,
      kind: 'ENVIO',
      amount: -item.amount,
      description: `Reconhecimento para ${student.name}`,
      counterpart: student.name,
      reason: item.reason,
    })
    ;(store.transactions[student.id] ||= []).unshift({
      id,
      date,
      kind: 'RECEBIMENTO',
      amount: item.amount,
      description: 'Reconhecimento recebido',
      counterpart: teacher.name,
      reason: item.reason,
    })
  })
  store.advantages = [
    {
      id: 'lunch',
      companyId: 'company',
      companyName: 'Cantina Central',
      name: 'Uma pausa com sabor',
      description:
        'Prato do dia, bebida e sobremesa na Cantina Central. Apresente seu cupom no atendimento, de segunda a sexta.',
      photo: '/images/lunch.jpg',
      category: 'Alimentação',
      cost: 180,
      active: true,
    },
    {
      id: 'coffee',
      companyId: 'company',
      companyName: 'Cantina Central',
      name: 'Café & boas ideias',
      description:
        'Um café fresquinho acompanhado de dois pães de queijo. A combinação perfeita para recarregar as ideias.',
      photo: '/images/coffee.jpg',
      category: 'Alimentação',
      cost: 60,
      active: true,
    },
    {
      id: 'books-offer',
      companyId: 'books',
      companyName: 'Livraria Entrelinhas',
      name: 'Sua próxima descoberta',
      description:
        '15% de desconto em um livro técnico de computação ou engenharia. Válido para produtos disponíveis na loja.',
      photo: '/images/books.jpg',
      category: 'Material',
      cost: 250,
      active: true,
    },
    {
      id: 'stationery',
      companyId: 'books',
      companyName: 'Livraria Entrelinhas',
      name: 'Ideias no papel',
      description:
        'Um caderno universitário de 200 folhas e um conjunto de três canetas para acompanhar suas próximas conquistas.',
      photo: '/images/stationery.jpg',
      category: 'Material',
      cost: 140,
      active: true,
    },
    {
      id: 'event',
      companyId: 'company',
      companyName: 'Cantina Central',
      name: 'Conexões que inspiram',
      description:
        'Ingresso para um encontro de tecnologia com palestras, troca de experiências e novas conexões no campus.',
      photo: '/images/event.jpg',
      category: 'Eventos',
      cost: 320,
      active: true,
    },
    {
      id: 'discount',
      companyId: 'books',
      companyName: 'Livraria Entrelinhas',
      name: 'Mais conhecimento, menos custo',
      description:
        'Um voucher de desconto para uma compra de materiais de estudo selecionados na loja parceira.',
      photo: '/images/books.jpg',
      category: 'Descontos',
      cost: 1500,
      active: true,
    },
  ]
  const student = accounts.find((account) => account.id === 'student')!
  student.balance -= 180
  const date = new Date(Date.now() - 5 * 86400000).toISOString()
  const coupon: Coupon = {
    id: 'initial-coupon',
    advantageId: 'lunch',
    code: 'PCL-7K2Q-4821',
    studentId: student.id,
    studentName: student.name,
    companyId: 'company',
    companyName: 'Cantina Central',
    advantageName: 'Uma pausa com sabor',
    cost: 180,
    date,
    status: 'VALIDO',
  }
  store.coupons.push(coupon)
  store.transactions.student.unshift({
    id: coupon.id,
    date,
    kind: 'RESGATE',
    amount: -180,
    description: coupon.advantageName,
    counterpart: coupon.companyName,
  })
  addNotification(
    store,
    student.id,
    'Seu cupom está pronto',
    `Uma pausa com sabor · Cantina Central · ${coupon.code}. Apresente este código no atendimento.`,
  )
  addNotification(
    store,
    'company',
    'Um novo resgate por aqui',
    `${student.name} resgatou Uma pausa com sabor. Código: ${coupon.code}.`,
  )
  addNotification(
    store,
    student.id,
    'Seu esforço foi reconhecido',
    'Helena Prado enviou 60 Pucoins. Motivo: Participação no seminário de arquitetura.',
  )
  return store
}

let pending = Promise.resolve()
export function withStore<T>(
  action: (store: DemoStore) => T | Promise<T>,
): Promise<T> {
  const execute = async () => {
    let store: DemoStore
    const saved = localStorage.getItem(STORE_KEY)
    try {
      store = saved ? (JSON.parse(saved) as DemoStore) : await seed()
    } catch {
      throw new ApiError(
        'Os dados de demonstração estão indisponíveis. Limpe os dados do site para recomeçar.',
        503,
      )
    }
    const result = await action(store)
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(store))
    } catch {
      throw new ApiError(
        'Não foi possível salvar a demonstração. Reduza o tamanho das fotos ou libere espaço no navegador.',
        507,
      )
    }
    return structuredClone(result)
  }
  const task = () =>
    navigator.locks ? navigator.locks.request(STORE_KEY, execute) : execute()
  const result = pending.then(task, task)
  pending = result.then(
    () => undefined,
    () => undefined,
  )
  return result
}
