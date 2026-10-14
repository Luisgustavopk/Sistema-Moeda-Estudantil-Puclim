import { z } from 'zod'
import { validCpf } from '@/shared/utils/format'
export const teacherImportSchema = z.object({
  name: z.string().trim().min(3, 'Nome completo obrigatório.').max(100),
  cpf: z.string().refine(validCpf, 'CPF inválido.'),
  department: z.string().trim().min(2, 'Departamento obrigatório.').max(100),
  email: z.string().trim().email('E-mail inválido.'),
  login: z
    .string()
    .trim()
    .min(3, 'Login deve ter pelo menos 3 caracteres.')
    .max(40)
    .regex(/^[a-zA-Z0-9._-]+$/, 'Login contém caracteres inválidos.'),
})
