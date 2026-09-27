import createClient from 'openapi-fetch'
import type { paths } from '../generated/schema'
import { apiBaseUrl, apiErrorFromBody } from './http'

export const openapi = createClient<paths>({
  baseUrl: apiBaseUrl,
  credentials: 'include',
})

type ClientResult<T> = Promise<{ data?: T; error?: unknown; response: Response }>

export async function unwrap<T>(pending: ClientResult<T>): Promise<T> {
  const { data, error, response } = await pending
  if (!response.ok || error !== undefined) throw apiErrorFromBody(error, response.status)
  return data as T
}
