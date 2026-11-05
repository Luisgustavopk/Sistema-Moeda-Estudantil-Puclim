import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/hooks/auth-context'
import { useToast } from '@/shared/hooks/toast-context'
import { errorMessage } from '@/shared/lib/errors'

export function useGameAction<I, R>(
  action: (input: I) => Promise<R>,
  message = 'Alteração salva.',
  afterSuccess?: (data: R) => void,
) {
  const client = useQueryClient()
  const { refresh } = useAuth()
  const toast = useToast()
  return useMutation({
    mutationFn: action,
    onSuccess: async (data) => {
      afterSuccess?.(data)
      toast(message)
      await Promise.all([client.invalidateQueries(), refresh()])
    },
    onError: (error) => toast(errorMessage(error), 'error'),
  })
}

import { DATA_MODE } from '@/shared/lib/http'
import { gameApi } from './api'
import { basicDemoRewards } from './profile-rewards'
import type { Profile } from './types'

export function useProfileRewards(profile?: Profile) {
  return useQuery({
    queryKey: ['game', 'cosmetics', profile?.id],
    queryFn: () =>
      DATA_MODE === 'demo'
        ? Promise.resolve(basicDemoRewards(profile!))
        : gameApi.cosmetics(),
    enabled: !!profile,
    refetchInterval: 30000,
  })
}
