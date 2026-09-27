import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { FeedbackProvider, useConfirm, useToast } from './FeedbackProvider'

function Harness({ onAnswer }: { onAnswer: (value: boolean) => void }) {
  const toast = useToast(); const confirm = useConfirm()
  return <><button onClick={() => toast({ message: '保存成功', tone: 'success' })}>提示</button><button onClick={() => confirm({ title: '删除章节', message: '删除后无法恢复。', confirmLabel: '删除', danger: true }).then(onAnswer)}>确认</button></>
}

describe('FeedbackProvider', () => {
  it('shows dismissible toasts and resolves confirmation choices', async () => {
    const user = userEvent.setup(); const onAnswer = vi.fn()
    render(<FeedbackProvider><Harness onAnswer={onAnswer} /></FeedbackProvider>)
    await user.click(screen.getByRole('button', { name: '提示' }))
    expect(screen.getByText('保存成功')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: '确认' }))
    expect(screen.getByRole('alertdialog')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: '删除' }))
    expect(onAnswer).toHaveBeenCalledWith(true)
  })
})
