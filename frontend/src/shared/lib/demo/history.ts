import type {
  Coupon,
  CouponPage,
  CouponQuery,
  StatementPage,
  StatementQuery,
  Transaction,
} from '@/shared/types/domain'
import { ApiError } from '../errors'

function page<T>(items: T[], query: { page?: number; size?: number }) {
  const index = query.page ?? 0
  const size = query.size ?? 12
  if (
    !Number.isInteger(index) ||
    index < 0 ||
    !Number.isInteger(size) ||
    size < 1 ||
    size > 100
  )
    throw new ApiError('Use página a partir de zero e tamanho entre 1 e 100.')
  return {
    items: items.slice(index * size, (index + 1) * size),
    page: index,
    size,
    total: items.length,
    pages: Math.ceil(items.length / size),
  }
}
const newest = (
  a: { date: string; id: string },
  b: { date: string; id: string },
) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id)

export function filteredTransactions(
  items: Transaction[],
  query: StatementQuery = {},
) {
  if (query.from && query.to && query.from > query.to)
    throw new ApiError(
      'A data inicial deve ser anterior ou igual à data final.',
    )
  const day = new Intl.DateTimeFormat('sv-SE', {
    timeZone: query.zone || 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  const q = (query.q || '').trim().toLowerCase()
  return items
    .filter((item) => {
      const date = day.format(new Date(item.date))
      return (
        `${item.description} ${item.counterpart || ''} ${item.reason || ''}`
          .toLowerCase()
          .includes(q) &&
        (!query.kind ||
          (query.kind === 'in'
            ? item.amount > 0
            : query.kind === 'out'
              ? item.amount < 0
              : item.kind === query.kind)) &&
        (!query.from || date >= query.from) &&
        (!query.to || date <= query.to)
      )
    })
    .toSorted(newest)
}
export function transactionPage(
  items: Transaction[],
  query: StatementQuery = {},
): StatementPage {
  const filtered = filteredTransactions(items, query)
  return {
    ...page(filtered, query),
    summary: {
      incoming: filtered.reduce((sum, row) => sum + Math.max(0, row.amount), 0),
      outgoing: filtered.reduce((sum, row) => sum - Math.min(0, row.amount), 0),
      recognizedStudents: new Set(
        filtered
          .filter((row) => row.kind === 'ENVIO')
          .map((row) => row.counterpart),
      ).size,
    },
  }
}
export function couponPage(
  items: Coupon[],
  query: CouponQuery = {},
  student = true,
): CouponPage {
  const q = (query.q || '').trim().toLowerCase()
  const filtered = items
    .filter(
      (row) =>
        (!query.status || row.status === query.status) &&
        `${row.code} ${row.advantageName} ${student ? row.companyName : row.studentName}`
          .toLowerCase()
          .includes(q),
    )
    .toSorted(newest)
  return {
    ...page(filtered, query),
    summary: {
      available: filtered.filter((row) => row.status === 'VALIDO').length,
      used: filtered.filter((row) => row.status === 'UTILIZADO').length,
      donated: filtered.filter((row) => row.status === 'DOADO').length,
    },
  }
}
export function statementCsv(items: Transaction[], query: StatementQuery = {}) {
  const cell = (value: string) =>
    `"${(/^[\s]*[=+\-@]/.test(value) ? `'${value}` : value).replace(/"/g, '""')}"`
  const date = new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: query.zone || 'America/Sao_Paulo',
  })
  return new Blob(
    [
      '\uFEFF',
      [
        'Data;Tipo;Descrição;Pessoa ou empresa;Motivo;Pucoins',
        ...filteredTransactions(items, query).map((row) =>
          [
            cell(date.format(new Date(row.date))),
            cell(row.kind),
            cell(row.description),
            cell(row.counterpart || ''),
            cell(row.reason || ''),
            row.amount,
          ].join(';'),
        ),
      ].join('\r\n'),
    ],
    { type: 'text/csv;charset=utf-8' },
  )
}
