import { api } from '@/shared/lib/api'
export const cuponsApi = {
  list: api.coupons,
  check: api.checkCoupon,
  use: api.useCoupon,
}
