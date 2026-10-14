import { http } from '@/shared/lib/http'
import type { ImportRow } from '@/shared/types/domain'
import { api } from '@/shared/lib/api'
export const instituicoesApi = {
  preview: async (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return http<ImportRow[]>('/instituicao/professores/preview', {
      method: 'POST',
      body: form,
    })
  },
  list: api.institutions,
  teachers: api.teachers,
  importTeachers: api.importTeachers,
}
