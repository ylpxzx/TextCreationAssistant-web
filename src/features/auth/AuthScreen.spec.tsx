import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../../services/api'
import { AuthScreen } from './AuthScreen'

vi.mock('../../services/api', () => ({ api: { login: vi.fn(), register: vi.fn() } }))

describe('AuthScreen', () => {
  beforeEach(() => vi.clearAllMocks())

  it('submits the login form and enters the application', async () => {
    const user = userEvent.setup(); const onReady = vi.fn()
    vi.mocked(api.login).mockResolvedValue({ id: 'user-1', email: 'writer@example.com' })
    render(<AuthScreen onReady={onReady} />)
    await user.click(screen.getByRole('button', { name: '登录' }))
    expect(api.login).toHaveBeenCalledWith('writer@example.com', 'ChangeMe123!')
    expect(onReady).toHaveBeenCalledOnce()
  })

  it('switches to registration and displays an API error', async () => {
    const user = userEvent.setup()
    vi.mocked(api.register).mockRejectedValue(new Error('该邮箱已经注册'))
    render(<AuthScreen onReady={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: '第一次使用？创建账户' }))
    await user.click(screen.getByRole('button', { name: '创建账户' }))
    expect(api.register).toHaveBeenCalledWith('writer@example.com', 'ChangeMe123!')
    expect(await screen.findByText('该邮箱已经注册')).toBeTruthy()
  })
})
