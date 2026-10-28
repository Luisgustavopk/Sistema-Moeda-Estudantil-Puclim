import { useState, type ReactNode } from 'react'
import { initialMeritExample, MeritExampleContext } from './use-merit-example'
export function MeritExampleProvider({ children }: { children: ReactNode }) {
  const [example, setExample] = useState(initialMeritExample)
  return (
    <MeritExampleContext.Provider
      value={{
        example,
        recognize: (amount, reason) =>
          setExample({ amount, reason, redeemed: false }),
        redeem: () =>
          setExample((value) =>
            value.amount >= 60 ? { ...value, redeemed: true } : value,
          ),
        reset: () => setExample(initialMeritExample),
      }}
    >
      {children}
    </MeritExampleContext.Provider>
  )
}
