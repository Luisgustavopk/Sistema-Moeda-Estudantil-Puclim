import { QueryClientProvider } from '@tanstack/react-query'
import type { PropsWithChildren } from 'react'
import { queryClient } from '@/shared/lib/query-client'
import { AppRouter } from './router'
import { AuthProvider } from '@/features/auth/components/AuthProvider'
import { ToastProvider } from '@/shared/components/ui/ToastProvider'
import { ErrorBoundary } from '@/shared/components/ui/ErrorBoundary'

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AppRouter>
          <AuthProvider>
            <ToastProvider>{children}</ToastProvider>
          </AuthProvider>
        </AppRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}
