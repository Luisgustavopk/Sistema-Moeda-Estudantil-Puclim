import { z } from 'zod'
import { passwordRule } from '@/features/auth/schemas/auth.schema'
import { validCpf } from '@/shared/utils/format'
export const studentSchema = z
  .object({
    name: z.string().trim().min(3, 'Informe seu nome completo.').max(100),
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
    cpf: z.string().refine(validCpf, 'Informe um CPF válido.'),
    rg: z.string().trim().min(3, 'Informe seu RG.').max(30),
    address: z
      .string()
      .trim()
      .min(8, 'Informe seu endereço completo.')
      .max(250),
    course: z.string().trim().min(2, 'Informe seu curso.').max(100),
    institutionId: z.string().min(1, 'Selecione uma instituição.'),
  })
  .refine((data) => data.password === data.confirmation, {
    message: 'As senhas não coincidem.',
    path: ['confirmation'],
  })
