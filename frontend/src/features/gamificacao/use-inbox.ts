import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/hooks/auth-context'
import { DATA_MODE } from '@/shared/lib/http'
import { gameApi } from './api'

export function useInbox() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['game', 'inbox', user?.id],
    queryFn: gameApi.notices,
    enabled: DATA_MODE === 'api' && !!user,
    refetchInterval: 15000,
  })
}
