import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { CandidateVersionsSidebar } from './CandidateVersionsSidebar'

describe('CandidateVersionsSidebar', () => {
  it('selects and deletes saved candidate versions from the right sidebar', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    const onDelete = vi.fn()
    render(<CandidateVersionsSidebar variants={[{ id: 'v1', content: '潮水越过石阶，敲响了旧门。', usage: null, createdAt: 1 }]} activeVariantId="v1" onSelect={onSelect} onDelete={onDelete} />)
    expect(screen.getByLabelText('AI 候选版本侧边栏')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: '查看候选版本 1' }))
    await user.click(screen.getByRole('button', { name: '删除候选版本 1' }))
    expect(onSelect).toHaveBeenCalledWith('v1')
    expect(onDelete).toHaveBeenCalledWith('v1')
  })
})
