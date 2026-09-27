import { describe, expect, it } from 'vitest'
import { draftState, sameDraft, textDocument } from './draft-sync'

describe('draft synchronization decisions', () => {
  it('allows a draft based on the current server version', () => {
    expect(draftState(4, 4)).toBe('ready')
  })

  it('protects an older draft as a conflict instead of overwriting', () => {
    expect(draftState(3, 4)).toBe('conflict')
  })

  it('detects edits made while a save request is in flight', () => {
    expect(sameDraft(100, 100)).toBe(true)
    expect(sameDraft(100, 101)).toBe(false)
  })
})

describe('textDocument', () => {
  it('converts merged plain text into TipTap paragraphs', () => {
    expect(textDocument('第一段\n\n第二段')).toEqual({ type: 'doc', content: [
      { type: 'paragraph', content: [{ type: 'text', text: '第一段' }] },
      { type: 'paragraph', content: [{ type: 'text', text: '第二段' }] },
    ] })
  })

  it('keeps an empty document valid', () => {
    expect(textDocument('')).toEqual({ type: 'doc', content: [{ type: 'paragraph', content: [] }] })
  })
})
