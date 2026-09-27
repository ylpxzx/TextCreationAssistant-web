export type DraftState = 'ready' | 'conflict'

export function draftState(draftVersion: number, serverVersion: number): DraftState {
  return draftVersion < serverVersion ? 'conflict' : 'ready'
}

export function sameDraft(snapshotUpdatedAt: number, latestUpdatedAt?: number) {
  return latestUpdatedAt === undefined || latestUpdatedAt === snapshotUpdatedAt
}

export function textDocument(text: string): Record<string, unknown> {
  return {
    type: 'doc',
    content: text.split(/\n+/).map(value => ({ type: 'paragraph', content: value ? [{ type: 'text', text: value }] : [] })),
  }
}
