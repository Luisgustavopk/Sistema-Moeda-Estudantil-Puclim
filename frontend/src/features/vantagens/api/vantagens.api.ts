import { api } from '@/shared/lib/api'
export const vantagensApi = {
  list: api.advantages,
  save: api.saveAdvantage,
  remove: api.deleteAdvantage,
  redeem: api.redeem,
  uploadPhoto: api.uploadPhoto,
}
