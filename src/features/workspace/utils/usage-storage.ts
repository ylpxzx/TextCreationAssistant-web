import type { GenerationUsage } from '../../../types/domain'

export type UsageTotals = Record<string, GenerationUsage>

const storagePrefix = 'moyin.ai-usage'

export function readUsageTotals(projectId: string): UsageTotals {
  if (!projectId) return {}
  try {
    const value = JSON.parse(localStorage.getItem(`${storagePrefix}.${projectId}`) || '{}')
    return value && typeof value === 'object' ? value as UsageTotals : {}
  } catch {
    return {}
  }
}

export function addUsageTotal(projectId: string, current: UsageTotals, usage: GenerationUsage): UsageTotals {
  const previous = current[usage.model]
  const nextUsage = previous ? {
    ...usage,
    inputTokens: previous.inputTokens + usage.inputTokens,
    outputTokens: previous.outputTokens + usage.outputTokens,
    totalTokens: previous.totalTokens + usage.totalTokens,
  } : usage
  const next = { ...current, [usage.model]: nextUsage }
  localStorage.setItem(`${storagePrefix}.${projectId}`, JSON.stringify(next))
  return next
}
