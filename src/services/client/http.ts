export const apiBaseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/$/, '')

type ApiErrorBody = { error?: { code?: string; message?: string; details?: unknown }; message?: string | string[] }

export class ApiError extends Error {
  constructor(message: string, readonly status: number, readonly code = 'REQUEST_FAILED', readonly details?: unknown) {
    super(message)
    this.name = 'ApiError'
  }
}

export async function responseError(response: Response) {
  let body: ApiErrorBody = {}
  try { body = await response.json() as ApiErrorBody } catch { /* response has no JSON body */ }
  return apiErrorFromBody(body, response.status)
}

export function apiErrorFromBody(value: unknown, status: number) {
  const body = (value && typeof value === 'object' ? value : {}) as ApiErrorBody
  const fallback = Array.isArray(body.message) ? body.message.join('；') : body.message
  return new ApiError(body.error?.message || fallback || `请求失败（${status}）`, status, body.error?.code, body.error?.details)
}

export function apiUrl(path: string) { return `${apiBaseUrl}${path}` }
