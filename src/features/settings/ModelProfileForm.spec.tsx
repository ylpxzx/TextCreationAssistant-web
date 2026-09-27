import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { ModelProfile } from '../../types/domain'
import { ModelProfileForm, type ModelProfileFormValue } from './ModelProfileForm'

const profile: ModelProfile = { id: 'profile-1', name: 'DeepSeek', provider: 'openai-compatible', model: 'deepseek-chat', baseUrl: 'https://api.deepseek.com/v1', apiKeyHint: '••••1234', isDefault: true, createdAt: '2026-09-25T00:00:00.000Z', updatedAt: '2026-09-25T00:00:00.000Z' }

describe('ModelProfileForm', () => {
  it('allows editing the model while keeping the existing API key', async () => {
    const user = userEvent.setup(); const onChange = vi.fn(); const onSubmit = vi.fn(event => event.preventDefault())
    const value: ModelProfileFormValue = { name: profile.name, provider: profile.provider, model: profile.model, baseUrl: profile.baseUrl, apiKey: '' }
    render(<ModelProfileForm value={value} editing={profile} saving={false} message="" error="" onChange={onChange} onSubmit={onSubmit} onCancel={vi.fn()} />)
    expect(screen.getByLabelText('API Key').hasAttribute('required')).toBe(false)
    expect(screen.getByPlaceholderText(/留空则继续使用/)).toBeTruthy()
    await user.clear(screen.getByLabelText('模型名称'))
    await user.type(screen.getByLabelText('模型名称'), 'deepseek-v4-pro')
    expect(onChange).toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: '保存修改' }))
    expect(onSubmit).toHaveBeenCalledOnce()
  })
})
