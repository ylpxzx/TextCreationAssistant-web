import { describe, expect, it } from 'vitest'
import { consumeSseBuffer } from './sse-parser'

describe('consumeSseBuffer', () => {
  it('keeps an incomplete event for the next network chunk', () => {
    const first = consumeSseBuffer('event: generation.delta\ndata: {"event":"generation.delta","generationId":"id","sequence":1,"text":"潮')
    expect(first.events).toEqual([])
    const second = consumeSseBuffer(`${first.rest}水"}\n\n`)
    expect(second.rest).toBe('')
    expect(second.events).toEqual([{ event: 'generation.delta', generationId: 'id', sequence: 1, text: '潮水' }])
  })

  it('parses multiple CRLF events and ignores comments', () => {
    const result = consumeSseBuffer(': keepalive\r\n\r\nevent: generation.usage\r\ndata: {"event":"generation.usage","generationId":"id","sequence":2,"inputTokens":10,"outputTokens":3,"totalTokens":13}\r\n\r\n')
    expect(result.events).toHaveLength(1)
    expect(result.events[0]).toMatchObject({ event: 'generation.usage', totalTokens: 13 })
  })
})
