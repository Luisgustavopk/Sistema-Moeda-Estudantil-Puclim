import { api } from '@/shared/lib/api'
export const alunosApi = {
  register: api.registerStudent,
  list: api.students,
  update: api.updateProfile,
  remove: api.deleteAccount,
}
