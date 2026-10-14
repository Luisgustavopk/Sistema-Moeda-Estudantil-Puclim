import { api } from '@/shared/lib/api'
export const empresasApi = {
  register: api.registerPartner,
  update: api.updateProfile,
  remove: api.deleteAccount,
}
