import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { LocalDraft } from '../../../storage/localDb'
import type { Chapter } from '../../../types/domain'
import { ChapterConflictPanel } from './ChapterConflictPanel'

const server: Chapter = { id: 'chapter-1', projectId: 'project-1', title: '潮痕', contentJson: { type: 'doc' }, plainText: '服务端正文', wordCount: 6, version: 5, status: 'writing', orderIndex: 0, updatedAt: '2026-09-25T00:00:00.000Z' }
const draft: LocalDraft = { chapterId: 'chapter-1', version: 4, title: '潮痕', contentJson: { type: 'doc' }, plainText: '本地草稿', updatedAt: 100 }

function callbacks() {
  return { onClose: vi.fn(), onUseServer: vi.fn().mockResolvedValue(undefined), onKeepLocal: vi.fn().mockResolvedValue(undefined), onMerge: vi.fn().mockResolvedValue(undefined) }
}

describe('ChapterConflictPanel', () => {
  it('shows both versions and lets the writer choose either side', async () => {
    const user = userEvent.setup(); const actions = callbacks()
    render(<ChapterConflictPanel server={server} draft={draft} {...actions} />)
    expect(screen.getByText('服务端正文')).toBeTruthy()
    expect(screen.getAllByText('本地草稿').length).toBeGreaterThan(1)
    await user.click(screen.getByRole('button', { name: /使用服务端/ }))
    expect(actions.onUseServer).toHaveBeenCalledOnce()
    await user.click(screen.getByRole('button', { name: /保留本地并覆盖/ }))
    expect(actions.onKeepLocal).toHaveBeenCalledOnce()
  })

  it('submits the writer-edited merged text', async () => {
    const user = userEvent.setup(); const actions = callbacks()
    render(<ChapterConflictPanel server={server} draft={draft} {...actions} />)
    const editor = screen.getByRole('textbox', { name: '手动合并' })
    await user.clear(editor)
    await user.type(editor, '合并后的正文')
    await user.click(screen.getByRole('button', { name: '保存合并内容' }))
    expect(actions.onMerge).toHaveBeenCalledWith('合并后的正文')
  })

  it('keeps the panel open and reports a failed overwrite', async () => {
    const user = userEvent.setup(); const actions = callbacks()
    actions.onKeepLocal.mockRejectedValue(new Error('服务端再次更新'))
    render(<ChapterConflictPanel server={server} draft={draft} {...actions} />)
    await user.click(screen.getByRole('button', { name: /保留本地并覆盖/ }))
    expect(await screen.findByText('服务端再次更新')).toBeTruthy()
  })
})
