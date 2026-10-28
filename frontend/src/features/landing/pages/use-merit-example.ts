import { createContext, useContext } from 'react'
export const initialMeritExample = {
  amount: 60,
  reason: 'Pela contribuição na atividade em aula.',
  redeemed: false,
}
export const MeritExampleContext = createContext<{
  example: typeof initialMeritExample
  recognize: (amount: number, reason: string) => void
  redeem: () => void
  reset: () => void
} | null>(null)
export function useMeritExample() {
  const value = useContext(MeritExampleContext)
  if (!value) throw new Error('MeritExampleProvider is required')
  return value
}
