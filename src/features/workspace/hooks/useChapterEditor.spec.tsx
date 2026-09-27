import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../../services/client/http'
import { api } from '../../../services/api'
import type { LocalDraft } from '../../../storage/localDb'
import type { Chapter, Workspace } from '../../../types/domain'
import { useChapterEditor } from './useChapterEditor'

let editorOptions: Record<string, (...args: never[]) => void>
let editorText = '第一版'
const editor = {
  getJSON: vi.fn(() => ({ type: 'doc', content: [{ type: 'paragraph' }] })),
  getText: vi.fn(() => editorText),
  commands: { setContent: vi.fn() },
  storage: { characterCount: { characters: vi.fn(() => editorText.length) } },
  state: { selection: { from: 1, to: 1, empty: true }, doc: { textBetween: vi.fn(() => '') } },
  chain: vi.fn(() => ({ focus() { return this }, insertContentAt() { return this }, insertContent() { return this }, run() { return true } })),
}

const drafts = new Map<string, LocalDraft>()

vi.mock('@tiptap/react', () => ({
  useEditor: vi.fn((options: Record<string, (...args: never[]) => void>) => { editorOptions = options; return editor }),
}))
vi.mock('../../../services/api', () => ({ api: { saveChapter: vi.fn(), streamGenerate: vi.fn() } }))
vi.mock('../../../storage/localDb', () => ({
  localDb: { drafts: {
    put: vi.fn(async (draft: LocalDraft) => { drafts.set(draft.chapterId, { ...draft }); return draft.chapterId }),
    get: vi.fn(async (id: string) => drafts.get(id)),
    delete: vi.fn(async (id: string) => { drafts.delete(id) }),
    orderBy: vi.fn(() => ({ toArray: async () => [...drafts.values()].sort((a, b) => a.updatedAt - b.updatedAt) })),
  } },
}))

const chapter: Chapter = { id: 'chapter-1', projectId: 'project-1', title: '潮痕', contentJson: { type: 'doc', content: [{ type: 'paragraph' }] }, plainText: '', wordCount: 0, version: 1, status: 'writing', orderIndex: 0, updatedAt: '2026-09-25T00:00:00.000Z' }
const chapter2: Chapter = { ...chapter, id: 'chapter-2', title: '暗门', orderIndex: 1 }

function savedChapter(version = 2): Chapter { return { ...chapter, plainText: editorText, wordCount: editorText.length, version, updatedAt: '2026-09-25T00:01:00.000Z' } }

describe('useChapterEditor autosave', () => {
  beforeEach(() => {
    vi.useFakeTimers(); vi.clearAllMocks(); drafts.clear(); editorText = '第一版'
    vi.spyOn(window.navigator, 'onLine', 'get').mockReturnValue(true)
    vi.mocked(api.saveChapter).mockResolvedValue(savedChapter())
  })

  afterEach(() => vi.useRealTimers())

  it('debounces rapid editor updates and saves only the latest draft', async () => {
    const setData = vi.fn<(value: React.SetStateAction<Workspace | null>) => void>()
    const { unmount } = renderHook(() => useChapterEditor({ active: chapter, chapterId: chapter.id, setData }))
    await act(async () => Promise.resolve())
    act(() => { editorText = '第一版'; editorOptions.onUpdate({ editor } as never) })
    act(() => { editorText = '第二版'; editorOptions.onUpdate({ editor } as never) })
    await act(async () => { await vi.advanceTimersByTimeAsync(1199) })
    expect(api.saveChapter).not.toHaveBeenCalled()
    await act(async () => { await vi.advanceTimersByTimeAsync(1) })
    expect(api.saveChapter).toHaveBeenCalledTimes(1)
    expect(api.saveChapter).toHaveBeenCalledWith('chapter-1', expect.objectContaining({ plainText: '第二版', version: 1 }))
    expect(drafts.has('chapter-1')).toBe(false)
    unmount()
  })

  it('flushes accepted editor content before leaving the current chapter', async () => {
    const { result, unmount } = renderHook(() => useChapterEditor({ active: chapter, chapterId: chapter.id, setData: vi.fn() }))
    await act(async () => Promise.resolve())
    act(() => { editorText = '包含 AI 续写的新正文'; editorOptions.onUpdate({ editor } as never) })
    await act(async () => { await result.current.flushCurrentDraft() })
    expect(api.saveChapter).toHaveBeenCalledWith('chapter-1', expect.objectContaining({ plainText: '包含 AI 续写的新正文', version: 1 }))
    expect(drafts.has('chapter-1')).toBe(false)
    unmount()
  })

  it('restores an unaccepted AI suggestion after switching away and back', async () => {
    vi.mocked(api.streamGenerate).mockImplementation(async (_input, onDelta) => { onDelta('承接潮声的续写。'); return undefined })
    const { result, rerender, unmount } = renderHook(
      ({ active, id }: { active: Chapter; id: string }) => useChapterEditor({ active, chapterId: id, setData: vi.fn() }),
      { initialProps: { active: chapter2, id: chapter2.id } },
    )
    await act(async () => Promise.resolve())
    await act(async () => { await result.current.generate() })
    expect(result.current.suggestion).toBe('承接潮声的续写。')
    rerender({ active: chapter, id: chapter.id })
    await act(async () => Promise.resolve())
    expect(result.current.suggestion).toBe('')
    rerender({ active: chapter2, id: chapter2.id })
    await act(async () => Promise.resolve())
    expect(result.current.suggestion).toBe('承接潮声的续写。')
    unmount()
  })

  it('temporarily saves a generated version before generating another one', async () => {
    let generation = 0
    vi.mocked(api.streamGenerate).mockImplementation(async (_input, onDelta) => { generation += 1; onDelta(`候选版本 ${generation}`); return undefined })
    const { result, unmount } = renderHook(() => useChapterEditor({ active: chapter, chapterId: chapter.id, setData: vi.fn() }))
    await act(async () => Promise.resolve())
    await act(async () => { await result.current.generate() })
    await act(async () => { await result.current.stashAndRegenerate() })
    expect(result.current.variants.map(item => item.content)).toEqual(['候选版本 1'])
    expect(result.current.suggestion).toBe('候选版本 2')
    act(() => result.current.selectVariant(result.current.variants[0].id))
    expect(result.current.suggestion).toBe('候选版本 1')
    act(() => result.current.deleteVariant(result.current.variants[0].id))
    expect(result.current.variants).toEqual([])
    unmount()
  })

  it('updates the visible word count immediately and ignores whitespace', async () => {
    const { result, unmount } = renderHook(() => useChapterEditor({ active: chapter, chapterId: chapter.id, setData: vi.fn() }))
    await act(async () => Promise.resolve())
    act(() => { editorText = '潮 水\n上涨了'; editorOptions.onUpdate({ editor } as never) })
    expect(result.current.wordCount).toBe(5)
    unmount()
  })

  it('keeps the draft offline and submits it when the browser reconnects', async () => {
    const online = vi.spyOn(window.navigator, 'onLine', 'get').mockReturnValue(false)
    const { result, unmount } = renderHook(() => useChapterEditor({ active: chapter, chapterId: chapter.id, setData: vi.fn() }))
    await act(async () => Promise.resolve())
    act(() => { editorText = '离线写下的正文'; editorOptions.onUpdate({ editor } as never) })
    await act(async () => { await vi.advanceTimersByTimeAsync(1200) })
    expect(api.saveChapter).not.toHaveBeenCalled()
    expect(result.current.saveState).toBe('local')
    expect(drafts.get('chapter-1')?.plainText).toBe('离线写下的正文')
    online.mockReturnValue(true)
    await act(async () => { window.dispatchEvent(new Event('online')); await Promise.resolve(); await Promise.resolve() })
    expect(api.saveChapter).toHaveBeenCalledWith('chapter-1', expect.objectContaining({ plainText: '离线写下的正文' }))
    expect(drafts.has('chapter-1')).toBe(false)
    expect(result.current.saveState).toBe('saved')
    unmount()
  })

  it('preserves the local draft and exposes conflict state after a 409', async () => {
    vi.mocked(api.saveChapter).mockRejectedValue(new ApiError('章节已更新', 409, 'CHAPTER_VERSION_CONFLICT'))
    const { result, unmount } = renderHook(() => useChapterEditor({ active: chapter, chapterId: chapter.id, setData: vi.fn() }))
    await act(async () => Promise.resolve())
    act(() => { editorText = '不能丢失的本地正文'; editorOptions.onUpdate({ editor } as never) })
    await act(async () => { await vi.advanceTimersByTimeAsync(1200) })
    expect(result.current.saveState).toBe('conflict')
    expect(drafts.get('chapter-1')?.plainText).toBe('不能丢失的本地正文')
    unmount()
  })
})
