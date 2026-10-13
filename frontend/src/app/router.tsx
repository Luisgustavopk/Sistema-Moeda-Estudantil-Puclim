import type { PropsWithChildren } from 'react'
import { BrowserRouter } from 'react-router'

export function AppRouter({ children }: PropsWithChildren) {
  return <BrowserRouter>{children}</BrowserRouter>
}
