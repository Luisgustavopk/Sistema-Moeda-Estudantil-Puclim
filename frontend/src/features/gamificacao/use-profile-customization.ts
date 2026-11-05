import { useQuery } from '@tanstack/react-query'
import { customizationAdapter } from './profile-customization'

export function useProfileCustomization(
  user?: { id: string; name: string } | null,
  enabled = true,
) {
  return useQuery({
    queryKey: ['profile-customization', user?.id],
    queryFn: () => customizationAdapter.load(user!.id, user!.name),
    enabled: enabled && !!user,
    staleTime: 60000,
  })
}
