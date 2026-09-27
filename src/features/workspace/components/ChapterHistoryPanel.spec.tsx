import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../../../services/api'
import type { Chapter, ChapterRevision, ChapterRevisionSummary } from '../../../types/domain'
import { ChapterHistoryPanel } from './ChapterHistoryPanel'

vi.mock('../../../services/api', () => ({ api: { chapterRevisions: vi.fn(), chapterRevision: vi.fn(), restoreChapterRevision: vi.fn() } }))

const chapter: Chapter = { id: 'chapter-1', projectId: 'project-1', title: '潮痕', contentJson: { type: 'doc' }, plainText: '当前正文', wordCount: 4, version: 3, status: 'writing', orderIndex: 0, updatedAt: '2026-09-25T00:00:00.000Z' }
const summary: ChapterRevisionSummary = { id: 'revision-1', chapterId: chapter.id, version: 2, title: '潮痕', wordCount: 5, excerpt: '从前的正文', createdAt: '2026-09-24T12:00:00.000Z' }
const revision: ChapterRevision = { id: summary.id, chapterId: chapter.id, version: 2, title: '潮痕', wordCount: 5, contentJson: { type: 'doc' }, plainText: '从前的正文', createdAt: summary.createdAt }

describe('ChapterHistoryPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.chapterRevisions).mockResolvedValue({ items: [summary], nextBeforeVersion: null })
    vi.mocked(api.chapterRevision).mockResolvedValue(revision)
    vi.mocked(api.restoreChapterRevision).mockResolvedValue({ ...chapter, plainText: revision.plainText, version: 4 })
  })

  it('loads the revision list and previews the latest revision', async () => {
    render(<ChapterHistoryPanel chapter={chapter} canRestore onClose={vi.fn()} onRestored={vi.fn()} />)
    expect(await screen.findByText('从前的正文')).toBeTruthy()
    expect(api.chapterRevisions).toHaveBeenCalledWith('chapter-1')
    expect(api.chapterRevision).toHaveBeenCalledWith('chapter-1', 'revision-1')
  })

  it('restores a revision using the current chapter version', async () => {
    const user = userEvent.setup(); const onRestored = vi.fn().mockResolvedValue(undefined); const onClose = vi.fn()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<ChapterHistoryPanel chapter={chapter} canRestore onClose={onClose} onRestored={onRestored} />)
    await screen.findByText('从前的正文')
    await user.click(screen.getByRole('button', { name: /恢复此版本/ }))
    expect(api.restoreChapterRevision).toHaveBeenCalledWith('chapter-1', 'revision-1', 3)
    await waitFor(() => expect(onRestored).toHaveBeenCalledWith(expect.objectContaining({ version: 4 })))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('disables restoration while the current draft is unsaved', async () => {
    render(<ChapterHistoryPanel chapter={chapter} canRestore={false} onClose={vi.fn()} onRestored={vi.fn()} />)
    await screen.findByText('从前的正文')
    expect(screen.getByRole('button', { name: /恢复此版本/ }).hasAttribute('disabled')).toBe(true)
    expect(screen.getByText('请等待当前章节保存完成后再恢复历史版本。')).toBeTruthy()
  })
})
