import { z } from 'zod'
import type { Role } from '@/shared/types/domain'
export const profileSchema = (role: Role) =>
  z
    .object({
      name: z
        .string()
        .trim()
        .min(3, 'Informe um nome com pelo menos 3 caracteres.')
        .max(100),
      email: z.string().trim().email('Informe um e-mail válido.'),
      address: z.string().trim().max(250).optional(),
      course: z.string().trim().max(100).optional(),
      phone: z.string().trim().max(20).optional(),
      description: z.string().trim().max(500).optional(),
    })
    .superRefine((value, context) => {
      if (role === 'ALUNO') {
        if (!value.address || value.address.length < 8)
          context.addIssue({
            code: 'custom',
            path: ['address'],
            message: 'Informe o endereço completo.',
          })
        if (!value.course || value.course.length < 2)
          context.addIssue({
            code: 'custom',
            path: ['course'],
            message: 'Informe seu curso.',
          })
      }
      if (role === 'EMPRESA' && (!value.phone || value.phone.length < 10))
        context.addIssue({
          code: 'custom',
          path: ['phone'],
          message: 'Informe um telefone com DDD.',
        })
    })
