import type { ModelProfile } from '../../types/domain'
import { openapi, unwrap } from '../client/openapi'
export const modelsApi = {
  modelProfiles: () => unwrap(openapi.GET('/v1/model-profiles')) as Promise<ModelProfile[]>,
  createModelProfile: (input: { name: string; provider: 'openai' | 'openai-compatible'; model: string; baseUrl: string; apiKey: string; isDefault?: boolean }) => unwrap(openapi.POST('/v1/model-profiles', { body: input })) as Promise<ModelProfile>,
  updateModelProfile: (id: string, input: { name?: string; provider?: 'openai' | 'openai-compatible'; model?: string; baseUrl?: string; apiKey?: string }) => unwrap(openapi.PATCH('/v1/model-profiles/{profileId}', { params: { path: { profileId: id } }, body: input })) as Promise<ModelProfile>,
  testModelProfile: (id: string) => unwrap(openapi.POST('/v1/model-profiles/{profileId}/test', { params: { path: { profileId: id } } })),
  setDefaultModelProfile: (id: string) => unwrap(openapi.POST('/v1/model-profiles/{profileId}/default', { params: { path: { profileId: id } } })) as Promise<ModelProfile>,
  deleteModelProfile: (id: string) => unwrap(openapi.DELETE('/v1/model-profiles/{profileId}', { params: { path: { profileId: id } } })),
}
