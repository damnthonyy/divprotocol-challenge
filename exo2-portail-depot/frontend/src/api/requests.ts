import { api, parse } from './client'
import {
  createdRequestSchema,
  depositRequestListSchema,
  depositRequestSchema,
  type CreateRequestInput,
  type CreatedRequest,
  type DepositRequest,
} from './schemas'

export async function listRequests(): Promise<DepositRequest[]> {
  const { data } = await api.get('/requests')
  return parse(depositRequestListSchema, data)
}

export async function getRequest(id: string): Promise<DepositRequest> {
  const { data } = await api.get(`/requests/${id}`)
  return parse(depositRequestSchema, data)
}

/** Seul appel qui renvoie le PIN en clair. Il n'est jamais relu ensuite. */
export async function createRequest(input: CreateRequestInput): Promise<CreatedRequest> {
  const { data } = await api.post('/requests', input)
  return parse(createdRequestSchema, data)
}
