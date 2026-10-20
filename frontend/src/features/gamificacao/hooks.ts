import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/hooks/auth-context'
import { useToast } from '@/shared/hooks/toast-context'
import { errorMessage } from '@/shared/lib/errors'

export function useGameAction<I, R>(
  action: (input: I) => Promise<R>,
  message = 'Alteração salva.',
) {
  const client = useQueryClient()
  const { refresh } = useAuth()
  const toast = useToast()
  return useMutation({
    mutationFn: action,
    onSuccess: async () => {
      toast(message)
      await Promise.all([client.invalidateQueries(), refresh()])
    },
    onError: (error) => toast(errorMessage(error)),
  })
}
