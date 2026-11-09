import { z } from 'zod'
export const passwordRule = z
  .string()
  .min(8, 'Use pelo menos 8 caracteres.')
  .max(128, 'Use até 128 caracteres.')
export const loginSchema = z.object({
  login: z.string().trim().min(1, 'Informe seu login ou e-mail.'),
  password: z.string().min(1, 'Informe sua senha.'),
})
export const passwordRecoverySchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Informe o e-mail do seu cadastro.')
    .email('Informe um e-mail válido.')
    .max(254, 'Use até 254 caracteres.'),
})
export const passwordResetSchema = z
  .object({
    password: passwordRule,
    confirmation: z.string().min(1, 'Confirme sua nova senha.'),
  })
  .refine((data) => data.password === data.confirmation, {
    message: 'As senhas não coincidem.',
    path: ['confirmation'],
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
