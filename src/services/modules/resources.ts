import type { KnowledgeItem, ResourceGroup } from '../../types/domain'
import { openapi, unwrap } from '../client/openapi'
export const resourcesApi = {
  addResourceGroup: (projectId: string, name: string) => unwrap(openapi.POST('/v1/projects/{projectId}/resource-groups', { params: { path: { projectId } }, body: { name, useInAi: true } })) as Promise<ResourceGroup>,
  saveResourceGroup: (groupId: string, input: { name?: string; useInAi?: boolean }) => unwrap(openapi.PATCH('/v1/resource-groups/{groupId}', { params: { path: { groupId } }, body: input })),
  deleteResourceGroup: (groupId: string) => unwrap(openapi.DELETE('/v1/resource-groups/{groupId}', { params: { path: { groupId } } })),
  addResourceItem: (groupId: string, input: { name: string; content: string }) => unwrap(openapi.POST('/v1/resource-groups/{groupId}/items', { params: { path: { groupId } }, body: { ...input, useInAi: true } })) as Promise<KnowledgeItem>,
  saveResourceItem: (itemId: string, input: { name?: string; content?: string; useInAi?: boolean }) => unwrap(openapi.PATCH('/v1/resource-items/{itemId}', { params: { path: { itemId } }, body: input })) as Promise<KnowledgeItem>,
  deleteResourceItem: (itemId: string) => unwrap(openapi.DELETE('/v1/resource-items/{itemId}', { params: { path: { itemId } } })),
}
