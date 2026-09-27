import { apiUrl, responseError } from './http'
import { consumeSseBuffer } from './sse-parser'

export type GenerationEvent =
  | { event: 'generation.start'; generationId: string; sequence: number; model: string }
  | { event: 'generation.delta'; generationId: string; sequence: number; text: string }
  | { event: 'generation.context'; generationId: string; sequence: number; items: Array<{ sourceType: string; sourceId?: string; label: string }> }
  | { event: 'generation.usage'; generationId: string; sequence: number; inputTokens: number; outputTokens: number; totalTokens: number }
  | { event: 'generation.done'; generationId: string; sequence: number; finishReason: string; outputCharacters?: number }
  | { event: 'generation.error'; generationId: string; sequence: number; code: string; message: string; retryable: boolean }

export async function streamSse(path: string, body: unknown, onEvent: (event: GenerationEvent) => void, signal?: AbortSignal) {
  const response = await fetch(apiUrl(path), { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream', 'Idempotency-Key': crypto.randomUUID() }, body: JSON.stringify(body), signal })
  if (!response.ok) throw await responseError(response)
  if (!response.body) throw new Error('服务端没有返回流式内容')
  const reader = response.body.getReader(); const decoder = new TextDecoder(); let buffer = ''
  while (true) {
    const { value, done } = await reader.read()
    buffer += decoder.decode(value, { stream: !done })
    const parsed = consumeSseBuffer(buffer); buffer = parsed.rest
    for (const event of parsed.events) { onEvent(event); if (event.event === 'generation.error') throw new Error(event.message) }
    if (done) break
  }
}
