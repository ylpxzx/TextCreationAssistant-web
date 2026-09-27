import { describe, expect, it } from 'vitest'
import { ApiError } from './http'
import { unwrap } from './openapi'

describe('OpenAPI client wrapper', () => {
  it('returns typed response data', async () => {
    const response = new Response(null, { status: 200 })
    await expect(unwrap(Promise.resolve({ data: { ok: true as const }, response }))).resolves.toEqual({ ok: true })
  })

  it('normalizes API errors', async () => {
    const response = new Response(null, { status: 409 })
    const pending = unwrap(Promise.resolve({ error: { error: { code: 'VERSION_CONFLICT', message: '章节版本冲突', details: { currentVersion: 4 } } }, response }))
    await expect(pending).rejects.toMatchObject<ApiError>({ name: 'ApiError', status: 409, code: 'VERSION_CONFLICT', message: '章节版本冲突' })
  })
})
