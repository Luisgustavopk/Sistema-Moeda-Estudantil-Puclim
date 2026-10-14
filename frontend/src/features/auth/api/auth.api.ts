import { api } from '@/shared/lib/api'
export const authApi = {
  session: api.session,
  login: api.login,
  logout: api.logout,
  changePassword: api.changePassword,
}
