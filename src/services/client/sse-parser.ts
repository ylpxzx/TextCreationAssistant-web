import type { GenerationEvent } from './sse'

export function consumeSseBuffer(buffer: string): { events: GenerationEvent[]; rest: string } {
  const events: GenerationEvent[] = []
  let rest = buffer.replace(/\r\n/g, '\n')
  let boundary = rest.indexOf('\n\n')
  while (boundary >= 0) {
    const block = rest.slice(0, boundary)
    rest = rest.slice(boundary + 2)
    const data = block.split('\n').filter(line => line.startsWith('data:')).map(line => line.slice(5).trimStart()).join('\n')
    if (data) events.push(JSON.parse(data) as GenerationEvent)
    boundary = rest.indexOf('\n\n')
  }
  return { events, rest }
}
