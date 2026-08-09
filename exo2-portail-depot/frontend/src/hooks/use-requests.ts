import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { ApiError } from '@/api/client'
import { createRequest, getRequest, listRequests } from '@/api/requests'
import type { CreateRequestInput, CreatedRequest, DepositRequest } from '@/api/schemas'

export const requestKeys = {
  all: ['requests'] as const,
  detail: (id: string) => ['requests', id] as const,
}

export function useRequests() {
  return useQuery<DepositRequest[], ApiError>({
    queryKey: requestKeys.all,
    queryFn: listRequests,
  })
}

export function useRequest(id: string) {
  return useQuery<DepositRequest, ApiError>({
    queryKey: requestKeys.detail(id),
    queryFn: () => getRequest(id),
    enabled: Boolean(id),
  })
}

export function useCreateRequest() {
  const queryClient = useQueryClient()

  return useMutation<CreatedRequest, ApiError, CreateRequestInput>({
    mutationFn: createRequest,
    onSuccess: () => {
      // Le dashboard doit refleter la nouvelle demande sans rechargement manuel.
      queryClient.invalidateQueries({ queryKey: requestKeys.all })
    },
  })
}
