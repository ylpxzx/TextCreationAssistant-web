import type { Chapter, Project, Workspace } from '../../types/domain'
import type { components } from '../generated/schema'
import { openapi, unwrap } from '../client/openapi'
type ApiProject = components['schemas']['Project']
const mapProject = ({ styles, ...value }: ApiProject): Project => ({ ...value, style: styles })
export const projectsApi = {
  async projects() { return (await unwrap(openapi.GET('/v1/projects'))).map(mapProject) },
  async createProject(input: Partial<Project>) { const value = await unwrap(openapi.POST('/v1/projects', { body: { title: input.title || '未命名作品', idea: input.idea || '', genres: input.genres || [], lengthType: input.lengthType || '中长篇', styles: input.style || [] } })); return mapProject(value) },
  async updateProject(projectId: string, input: Partial<Project> & { archived?: boolean }) { const value = await unwrap(openapi.PATCH('/v1/projects/{projectId}', { params: { path: { projectId } }, body: { title: input.title, idea: input.idea, genres: input.genres, lengthType: input.lengthType, styles: input.style, archived: input.archived } })); return mapProject(value) },
  deleteProject: (projectId: string) => unwrap(openapi.DELETE('/v1/projects/{projectId}', { params: { path: { projectId } } })),
  async workspace(projectId: string): Promise<Workspace> {
    const [detail, resourceGroups] = await Promise.all([unwrap(openapi.GET('/v1/projects/{projectId}', { params: { path: { projectId } } })), unwrap(openapi.GET('/v1/projects/{projectId}/resources', { params: { path: { projectId } } }))])
    const { chapters, ...rawProject } = detail
    return { project: mapProject(rawProject), chapters: chapters as Chapter[], resourceGroups }
  },
}
