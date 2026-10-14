import { z } from 'zod'
export const passwordRule = z
  .string()
  .min(8, 'Use pelo menos 8 caracteres.')
  .max(128, 'Use até 128 caracteres.')
export const loginSchema = z.object({
  login: z.string().trim().min(1, 'Informe seu login ou e-mail.'),
  password: z.string().min(1, 'Informe sua senha.'),
})
export const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Informe a senha atual.'),
    password: passwordRule,
    confirmation: z.string(),
  })
  .refine((data) => data.password === data.confirmation, {
    message: 'As senhas não coincidem.',
    path: ['confirmation'],
  })
