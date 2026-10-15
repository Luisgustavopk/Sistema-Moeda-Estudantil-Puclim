import type { PuclimApi, TransactionFilters } from '@/shared/types/domain'
import { http } from './http'
import { ApiError } from './errors'
const body = (data: unknown, method = 'POST') => ({
  method,
  body: JSON.stringify(data),
})
const query = (filters?: TransactionFilters) => {
  const params = new URLSearchParams()
  if (filters?.from) params.set('de', filters.from)
  if (filters?.to) params.set('ate', filters.to)
  if (filters?.type && filters.type !== 'all') params.set('tipo', filters.type)
  if (filters?.search) params.set('busca', filters.search)
  const value = params.toString()
  return value ? `?${value}` : ''
}
const exportTransactions = async (filters?: TransactionFilters) => {
  const response = await fetch(`/api/conta/extrato/exportar${query(filters)}`, {
    credentials: 'include',
  })
  if (!response.ok) {
    const result = (await response.json().catch(() => ({}))) as { message?: string }
    throw new ApiError(result.message || 'Não foi possível exportar o extrato.', response.status)
  }
  return response.blob()
}
export const remoteApi: PuclimApi = {
  session: async () => {
    try {
      return await http('/auth/session')
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) return null
      throw error
    }
  },
  login: (login, password) => http('/auth/login', body({ login, password })),
  logout: () => http('/auth/logout', { method: 'POST' }),
  registerStudent: (input) => http('/alunos', body(input)),
  registerPartner: (input) => http('/empresas', body(input)),
  institutions: () => http('/instituicoes'),
  updateProfile: (input) => http('/conta/perfil', body(input, 'PATCH')),
  changePassword: (currentPassword, password) =>
    http('/conta/senha', body({ currentPassword, password }, 'PATCH')),
  deleteAccount: () => http('/conta', { method: 'DELETE' }),
  students: () => http('/alunos/selecionaveis'),
  teachers: () => http('/instituicao/professores'),
  importTeachers: (rows) =>
    http('/instituicao/professores/importar', body({ rows })),
  transactions: (filters) => http(`/conta/extrato${query(filters)}`),
  exportTransactions,
  transfer: (studentId, amount, reason) =>
    http('/transferencias', body({ studentId, amount, reason })),
  advantages: (own) => http(`/vantagens${own ? '?minhas=true' : ''}`),
  uploadPhoto: async (file) => {
    const form = new FormData()
    form.append('file', file)
    const result = await http<{ url: string }>('/uploads/imagens', {
      method: 'POST',
      body: form,
    })
    return result.url
  },
  saveAdvantage: (input, id) =>
    http(
      `/vantagens${id ? `/${encodeURIComponent(id)}` : ''}`,
      body(input, id ? 'PUT' : 'POST'),
    ),
  deleteAdvantage: (id) =>
    http(`/vantagens/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  redeem: (id) =>
    http(`/vantagens/${encodeURIComponent(id)}/resgates`, {
      ...body({}),
      headers: { 'Idempotency-Key': crypto.randomUUID() },
    }),
  coupons: () => http('/cupons'),
  checkCoupon: (code) => http(`/cupons/${encodeURIComponent(code)}`),
  useCoupon: (code) =>
    http(`/cupons/${encodeURIComponent(code)}/utilizar`, body({})),
  notifications: () => http('/conta/notificacoes'),
}
