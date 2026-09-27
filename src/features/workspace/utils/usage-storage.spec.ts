import { beforeEach, describe, expect, it } from 'vitest'
import type { GenerationUsage } from '../../../types/domain'
import { addUsageTotal, readUsageTotals } from './usage-storage'

const usage: GenerationUsage = { model: 'deepseek-v4-pro', inputTokens: 20, outputTokens: 8, totalTokens: 28, references: [] }

describe('usage storage', () => {
  beforeEach(() => localStorage.clear())

  it('persists and accumulates usage by project and model', () => {
    const first = addUsageTotal('project-1', {}, usage)
    addUsageTotal('project-1', first, usage)
    expect(readUsageTotals('project-1')['deepseek-v4-pro']).toMatchObject({ inputTokens: 40, outputTokens: 16, totalTokens: 56 })
    expect(readUsageTotals('project-2')).toEqual({})
  })
})
