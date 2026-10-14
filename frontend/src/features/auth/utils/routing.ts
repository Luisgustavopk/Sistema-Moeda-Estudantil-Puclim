import type { Account } from '@/shared/types/domain'
export const homeFor = (user: Account) =>
  user.role === 'ALUNO'
    ? '/aluno'
    : user.role === 'PROFESSOR'
      ? '/professor'
      : '/empresa'
