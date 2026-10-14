import { useMutation, useQueryClient } from '@tanstack/react-query'
export function useAction<Result, Input>(
  action: (input: Input) => Promise<Result>,
) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: action,
    onSuccess: () => client.invalidateQueries(),
  })
}
