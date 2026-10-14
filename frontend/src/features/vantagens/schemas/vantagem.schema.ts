import { z } from 'zod'
export const advantageSchema = z.object({
  name: z.string().trim().min(3, 'Informe o nome da vantagem.').max(100),
  description: z
    .string()
    .trim()
    .min(10, 'Descreva a vantagem em pelo menos 10 caracteres.')
    .max(1000),
  cost: z
    .number()
    .int('Use uma quantidade inteira.')
    .positive('O custo deve ser maior que zero.')
    .max(Number.MAX_SAFE_INTEGER, 'Custo acima do limite permitido.'),
  photo: z.string().min(1, 'Adicione uma foto.'),
  category: z.enum(['Alimentação', 'Material', 'Eventos', 'Descontos']),
  active: z.boolean(),
})
