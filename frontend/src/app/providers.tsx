import { QueryClientProvider } from '@tanstack/react-query'
import type { PropsWithChildren } from 'react'
import { queryClient } from '@/shared/lib/query-client'
import { AppRouter } from './router'

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <QueryClientProvider client={queryClient}>
      <AppRouter>{children}</AppRouter>
    </QueryClientProvider>
  )
}
