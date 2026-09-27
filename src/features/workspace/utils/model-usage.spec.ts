import { describe, expect, it } from 'vitest'
import type { GenerationUsage, ModelProfile } from '../../../types/domain'
import { estimateUsageCost, formatUsd } from './model-usage'

const profile: ModelProfile = {
  id: 'profile-1',
  name: 'DeepSeek',
  provider: 'openai-compatible',
  model: 'deepseek-v4-pro',
  baseUrl: 'https://api.deepseek.com/v1',
  apiKeyHint: '••••1234',
  isDefault: true,
  createdAt: '',
  updatedAt: '',
}

const usage: GenerationUsage = {
  model: 'deepseek-v4-pro',
  inputTokens: 1_000,
  outputTokens: 500,
  totalTokens: 1_500,
  references: [],
}

describe('model usage', () => {
  it('estimates DeepSeek V4 Pro usage from the published peak rates', () => {
    expect(estimateUsageCost(usage, profile)?.usd).toBeCloseTo(0.0033)
    expect(formatUsd(0.0033)).toBe('$0.003300')
  })

  it('does not invent a price for an unknown provider', () => {
    expect(estimateUsageCost(usage, { ...profile, baseUrl: 'https://example.com/v1' })).toBeNull()
  })

  it('does not apply one model price to another model usage record', () => {
    expect(estimateUsageCost({ ...usage, model: 'deepseek-flash' }, profile)).toBeNull()
  })
})
