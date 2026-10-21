import { http } from '@/shared/lib/http'
import type { ImportRow } from '@/shared/types/domain'
import { api } from '@/shared/lib/api'
import { ApiError } from '@/shared/lib/errors'

export type TeacherRegistration = Pick<
  ImportRow,
  'name' | 'cpf' | 'department' | 'email' | 'login'
>
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
  registerTeacher: async (input: TeacherRegistration) => {
    const result = await api.importTeachers([{ ...input, line: 1 }])
    if (result.created !== 1 || !result.access[0])
      throw new ApiError(
        result.errors[0]?.message || 'Não foi possível cadastrar o professor.',
        409,
      )
    return result.access[0]
  },
}
