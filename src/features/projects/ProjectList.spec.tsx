import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../../services/api'
import type { Project } from '../../types/domain'
import { ProjectList } from './ProjectList'

vi.mock('../../services/api', () => ({ api: { projects: vi.fn(), createProject: vi.fn(), updateProject: vi.fn(), deleteProject: vi.fn() } }))

const project: Project = { id: 'project-1', title: '雾港拾遗', idea: '退潮后收到旧信。', genres: ['悬疑'], lengthType: '中长篇', style: ['克制'], totalWords: 1200, updatedAt: '2026-09-25T00:00:00.000Z', archivedAt: null }

describe('ProjectList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.projects).mockResolvedValue([project])
    vi.mocked(api.updateProject).mockResolvedValue(project)
    vi.mocked(api.deleteProject).mockResolvedValue({ ok: true })
  })

  it('creates a project with the selected writing options', async () => {
    const user = userEvent.setup(); const onOpen = vi.fn()
    vi.mocked(api.createProject).mockResolvedValue({ ...project, id: 'project-2', title: '新故事' })
    render(<ProjectList onOpen={onOpen} onSettings={vi.fn()} onLogout={vi.fn()} />)
    await screen.findByText('雾港拾遗')
    await user.click(screen.getByRole('button', { name: '新建' }))
    await user.type(screen.getByRole('textbox', { name: '作品名称' }), '新故事')
    await user.click(screen.getByRole('button', { name: '科幻' }))
    await user.click(screen.getByRole('button', { name: '幽默' }))
    await user.click(screen.getByRole('button', { name: '创建作品' }))
    expect(api.createProject).toHaveBeenCalledWith(expect.objectContaining({ title: '新故事', genres: ['科幻'], style: ['克制', '幽默'], lengthType: '中长篇' }))
    expect(onOpen).toHaveBeenCalledWith('project-2')
  })

  it('archives and then reloads the project list', async () => {
    const user = userEvent.setup()
    render(<ProjectList onOpen={vi.fn()} onSettings={vi.fn()} onLogout={vi.fn()} />)
    await screen.findByText('雾港拾遗')
    await user.click(screen.getByTitle('归档作品'))
    expect(api.updateProject).toHaveBeenCalledWith('project-1', { archived: true })
    await waitFor(() => expect(api.projects).toHaveBeenCalledTimes(2))
  })

  it('requires confirmation before deleting a project', async () => {
    const user = userEvent.setup(); const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<ProjectList onOpen={vi.fn()} onSettings={vi.fn()} onLogout={vi.fn()} />)
    await screen.findByText('雾港拾遗')
    await user.click(screen.getByTitle('删除作品'))
    expect(confirm).toHaveBeenCalledOnce()
    expect(api.deleteProject).toHaveBeenCalledWith('project-1')
    await waitFor(() => expect(api.projects).toHaveBeenCalledTimes(2))
  })
})
