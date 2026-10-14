import { api } from '@/shared/lib/api'
export const instituicoesApi = {
  list: api.institutions,
  teachers: api.teachers,
  importTeachers: api.importTeachers,
}
