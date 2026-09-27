import type { Chapter, ChapterRevision, ChapterRevisionSummary } from '../../types/domain'
import { openapi, unwrap } from '../client/openapi'
export const chaptersApi = {
  createChapter: (projectId: string) => unwrap(openapi.POST('/v1/projects/{projectId}/chapters', { params: { path: { projectId } }, body: {} })) as Promise<Chapter>,
  saveChapter: (chapterId: string, input: Partial<Chapter>) => unwrap(openapi.PATCH('/v1/chapters/{chapterId}', { params: { path: { chapterId } }, body: { version: input.version!, title: input.title, contentJson: input.contentJson, plainText: input.plainText, status: input.status } })) as Promise<Chapter>,
  deleteChapter: (chapterId: string) => unwrap(openapi.DELETE('/v1/chapters/{chapterId}', { params: { path: { chapterId } } })),
  chapterRevisions: (chapterId: string, beforeVersion?: number) => unwrap(openapi.GET('/v1/chapters/{chapterId}/revisions', { params: { path: { chapterId }, query: { limit: 30, beforeVersion } } })) as Promise<{ items: ChapterRevisionSummary[]; nextBeforeVersion: number | null }>,
  chapterRevision: (chapterId: string, revisionId: string) => unwrap(openapi.GET('/v1/chapters/{chapterId}/revisions/{revisionId}', { params: { path: { chapterId, revisionId } } })) as Promise<ChapterRevision>,
  restoreChapterRevision: (chapterId: string, revisionId: string, expectedVersion: number) => unwrap(openapi.POST('/v1/chapters/{chapterId}/revisions/{revisionId}/restore', { params: { path: { chapterId, revisionId } }, body: { expectedVersion } })) as Promise<Chapter>,
}
