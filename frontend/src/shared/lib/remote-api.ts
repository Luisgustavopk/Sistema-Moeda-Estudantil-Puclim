import { z } from 'zod'
import type {
  CouponPage,
  PuclimApi,
  StatementPage,
} from '@/shared/types/domain'
import { http, httpBlob } from './http'
import { ApiError } from './errors'
const body = (data: unknown, method = 'POST') => ({
  method,
  body: JSON.stringify(data),
})
const historyQuery = (values: object = {}) => {
  const params = new URLSearchParams()
  for (const [name, value] of Object.entries(values))
    if (value !== undefined && value !== '') params.set(name, String(value))
  return params.toString()
}
const count = z.number().int().nonnegative()
const historyEnvelope = z.object({
  items: z.array(z.unknown()),
  page: count,
  size: count.min(1).max(100),
  total: count,
  pages: count,
})
const statementPage = historyEnvelope.extend({
  summary: z.object({
    incoming: count,
    outgoing: count,
    recognizedStudents: count,
  }),
})
const couponPage = historyEnvelope.extend({
  summary: z.object({ available: count, used: count, donated: count }),
})
async function historyPage<T>(path: string, schema: z.ZodTypeAny): Promise<T> {
  const result = schema.safeParse(await http<unknown>(path))
  if (!result.success)
    throw new ApiError(
      'A API retornou um histórico incompatível. Atualize ou reinicie o backend e tente novamente.',
      502,
    )
  // Validate the pagination envelope here; item DTOs keep their existing contract.
  return result.data as T
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
  transactions: (query = {}) =>
    historyPage<StatementPage>(
      `/conta/extrato?${historyQuery({ page: 0, size: 12, ...query })}`,
      statementPage,
    ),
  exportTransactions: ({ page: _page, size: _size, ...filters } = {}) =>
    httpBlob(`/conta/extrato/exportar?${historyQuery(filters)}`),
  transfer: (studentId, amount, reason, requestKey = crypto.randomUUID()) =>
    http('/transferencias', {
      ...body({ studentId, amount, reason }),
      headers: { 'Idempotency-Key': requestKey },
    }),
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
  redeem: (id, requestKey = crypto.randomUUID()) =>
    http(`/vantagens/${encodeURIComponent(id)}/resgates`, {
      ...body({}),
      headers: { 'Idempotency-Key': requestKey },
    }),
  coupons: (query = {}) =>
    historyPage<CouponPage>(
      `/cupons?${historyQuery({ page: 0, size: 12, ...query })}`,
      couponPage,
    ),
  checkCoupon: (code) => http(`/cupons/${encodeURIComponent(code)}`),
  useCoupon: (code) =>
    http(`/cupons/${encodeURIComponent(code)}/utilizar`, body({})),
  notifications: () => http('/conta/notificacoes'),
}
