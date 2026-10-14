import { z } from 'zod'
export const transferSchema = z.object({
  studentId: z.string().min(1, 'Selecione um aluno.'),
  amount: z
    .number()
    .int('Use uma quantidade inteira.')
    .positive('Informe uma quantidade maior que zero.')
    .max(Number.MAX_SAFE_INTEGER, 'Quantidade acima do limite permitido.'),
  reason: z
    .string()
    .trim()
    .min(3, 'Escreva o motivo do reconhecimento.')
    .max(500, 'Use até 500 caracteres.'),
})
