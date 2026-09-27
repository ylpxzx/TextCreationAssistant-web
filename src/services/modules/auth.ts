import type { components } from '../generated/schema'
import { openapi, unwrap } from '../client/openapi'
export type SessionUser = components['schemas']['User']
export const authApi = {
  async register(email: string, password: string) { return (await unwrap(openapi.POST('/v1/auth/register', { body: { email, password } }))).user },
  async login(email: string, password: string) { return (await unwrap(openapi.POST('/v1/auth/login', { body: { email, password } }))).user },
  logout: () => unwrap(openapi.POST('/v1/auth/logout')),
  async me() { return (await unwrap(openapi.GET('/v1/auth/me'))).user },
}
