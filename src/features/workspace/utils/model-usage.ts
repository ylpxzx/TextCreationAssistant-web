import type { GenerationUsage, ModelProfile } from '../../../types/domain'

type TokenPrice = { input: number; output: number; note: string }

const deepSeekPeakPrices: Record<string, TokenPrice> = {
  'deepseek-v4-pro': {
    input: 1.32,
    output: 3.96,
    note: '按 DeepSeek 高峰期、输入缓存未命中的公开单价估算，实际账单可能更低。',
  },
  'deepseek-flash': {
    input: 0.3,
    output: 1.2,
    note: '按 DeepSeek 高峰期、输入缓存未命中的公开单价估算，实际账单可能更低。',
  },
}

export function estimateUsageCost(usage: GenerationUsage | null, profile: ModelProfile | null) {
  if (!usage || !profile || usage.model !== profile.model || !profile.baseUrl.includes('api.deepseek.com')) return null
  const price = deepSeekPeakPrices[profile.model.toLowerCase()]
  if (!price) return null
  return {
    usd: (usage.inputTokens * price.input + usage.outputTokens * price.output) / 1_000_000,
    note: price.note,
  }
}

export function formatUsd(value: number) {
  return `$${value.toFixed(6)}`
}
