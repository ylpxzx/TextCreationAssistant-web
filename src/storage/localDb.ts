import Dexie, { type EntityTable } from 'dexie'

export type LocalDraft = {
  chapterId: string
  version: number
  title: string
  contentJson: Record<string, unknown>
  plainText: string
  updatedAt: number
}

export const localDb = new Dexie('text-creation') as Dexie & {
  drafts: EntityTable<LocalDraft, 'chapterId'>
}

localDb.version(1).stores({ drafts: 'chapterId, updatedAt' })

