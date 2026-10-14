import { useEffect, type PropsWithChildren } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { authApi } from '../api/auth.api'
import { AuthContext } from '../hooks/auth-context'
import { DATA_MODE } from '@/shared/lib/http'
import { SESSION_TIMEOUT, touchDemoSession } from '@/shared/lib/demo/store'

export function AuthProvider({ children }: PropsWithChildren) {
  const client = useQueryClient()
  const session = useQuery({
    queryKey: ['session'],
    queryFn: authApi.session,
    retry: false,
    staleTime: 30000,
  })
  const logout = async () => {
    await authApi.logout()
    await client.cancelQueries()
    client.setQueryData(['session'], null)
    client.removeQueries({
      predicate: (query) => query.queryKey[0] !== 'session',
    })
  }
  useEffect(() => {
    if (!session.data) return
    let lastActivity = Date.now()
    let lastTouch = 0
    const expire = () => {
      void client.cancelQueries()
      client.setQueryData(['session'], null)
      client.removeQueries({
        predicate: (query) => query.queryKey[0] !== 'session',
      })
      void authApi.logout().catch(() => undefined)
    }
    const activity = () => {
      const now = Date.now()
      if (now - lastActivity >= SESSION_TIMEOUT) {
        expire()
        return
      }
      lastActivity = now
      if (DATA_MODE === 'demo' && now - lastTouch > 10000) {
        touchDemoSession()
        lastTouch = now
      }
      if (DATA_MODE === 'api' && now - lastTouch > 60000) {
        lastTouch = now
        void client.invalidateQueries({ queryKey: ['session'] })
      }
    }
    const events = ['pointerdown', 'keydown', 'scroll'] as const
    events.forEach((event) =>
      window.addEventListener(event, activity, { passive: true }),
    )
    const timer = setInterval(() => {
      if (Date.now() - lastActivity >= SESSION_TIMEOUT) expire()
    }, 10000)
    const unauthorized = () => {
      void client.cancelQueries()
      client.setQueryData(['session'], null)
      client.removeQueries({
        predicate: (query) => query.queryKey[0] !== 'session',
      })
    }
    const storage = () => {
      void client.invalidateQueries()
    }
    window.addEventListener('puclim:unauthorized', unauthorized)
    window.addEventListener('storage', storage)
    return () => {
      clearInterval(timer)
      events.forEach((event) => window.removeEventListener(event, activity))
      window.removeEventListener('puclim:unauthorized', unauthorized)
      window.removeEventListener('storage', storage)
    }
    // A sessão define o ciclo de vida dos ouvintes de atividade.
    // oxlint-disable-next-line react/exhaustive-deps
  }, [session.data?.id, client])
  return (
    <AuthContext
      value={{
        user: session.data || null,
        loading: session.isLoading,
        error: session.error,
        login: async (login, password) => {
          const user = await authApi.login(login, password)
          await client.cancelQueries()
          client.setQueryData(['session'], user)
          client.removeQueries({
            predicate: (query) => query.queryKey[0] !== 'session',
          })
          return user
        },
        logout,
        refresh: async () => {
          await client.invalidateQueries({ queryKey: ['session'] })
        },
      }}
    >
      {children}
    </AuthContext>
  )
}
