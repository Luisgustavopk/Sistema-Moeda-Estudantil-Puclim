import type { Route } from '@playwright/test'
import type {
  Coupon,
  CouponQuery,
  StatementQuery,
  Transaction,
} from '../src/shared/types/domain'
import {
  couponPage,
  statementCsv,
  transactionPage,
} from '../src/shared/lib/demo/history'

export function historyParams(url: string): StatementQuery & CouponQuery {
  const values = Object.fromEntries(new URL(url).searchParams)
  return {
    ...values,
    page: Number(values.page || 0),
    size: Number(values.size || 12),
  } as StatementQuery & CouponQuery
}

export function historyJson(
  route: Route,
  data: unknown,
  student = true,
): unknown {
  if (!Array.isArray(data)) return data
  const url = route.request().url()
  const path = new URL(url).pathname
  if (path === '/api/conta/extrato')
    return transactionPage(data as Transaction[], historyParams(url))
  if (path === '/api/cupons')
    return couponPage(data as Coupon[], historyParams(url), student)
  return data
}

export async function fulfillHistory(route: Route, data: Transaction[]) {
  if (new URL(route.request().url()).pathname.endsWith('/exportar'))
    return route.fulfill({
      contentType: 'text/csv;charset=utf-8',
      body: await statementCsv(
        data,
        historyParams(route.request().url()),
      ).text(),
    })
  return route.fulfill({ json: historyJson(route, data) })
}
