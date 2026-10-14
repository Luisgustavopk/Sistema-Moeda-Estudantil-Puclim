import { z } from 'zod'
import { passwordRule } from '@/features/auth/schemas/auth.schema'
import { validCnpj } from '@/shared/utils/format'
export const partnerSchema = z
  .object({
    name: z.string().trim().min(3, 'Informe o nome da organização.').max(100),
    email: z.string().trim().email('Informe um e-mail válido.'),
    login: z
      .string()
      .trim()
      .min(3, 'Use pelo menos 3 caracteres.')
      .max(40)
      .regex(
        /^[a-zA-Z0-9._-]+$/,
        'Use letras, números, ponto, hífen ou sublinhado.',
      ),
    password: passwordRule,
    confirmation: z.string(),
    cnpj: z.string().refine(validCnpj, 'Informe um CNPJ válido.'),
    phone: z.string().trim().min(10, 'Informe um telefone com DDD.').max(20),
    description: z.string().trim().max(500),
    partnerKind: z.enum(['EMPRESA', 'ENSINO', 'BENEFICIARIA']),
  })
  .refine((data) => data.password === data.confirmation, {
    message: 'As senhas não coincidem.',
    path: ['confirmation'],
  })
