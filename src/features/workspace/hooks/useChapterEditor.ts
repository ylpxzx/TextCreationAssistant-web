import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import { useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import CharacterCount from '@tiptap/extension-character-count'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import { api } from '../../../services/api'
import { ApiError } from '../../../services/client/http'
import { localDb } from '../../../storage/localDb'
import type { Chapter, GenerationUsage, Workspace } from '../../../types/domain'
import { draftState, sameDraft } from '../utils/draft-sync'
import { addUsageTotal, readUsageTotals, type UsageTotals } from '../utils/usage-storage'

type SaveState = 'saved' | 'saving' | 'local' | 'conflict'
export type AiInteractionMode = 'writing' | 'question'
export type SuggestionVariant = { id: string; content: string; usage: GenerationUsage | null; createdAt: number }
const emptyDoc = { type: 'doc', content: [{ type: 'paragraph' }] }
type ChapterAiDraft = { mode: AiInteractionMode; suggestion: string; instruction: string; rewriteRange: { from: number; to: number } | null; usage: GenerationUsage | null; generationError: string; variants: SuggestionVariant[]; activeVariantId: string | null }

type UseChapterEditorOptions = {
  active?: Chapter
  chapterId: string
  setData: Dispatch<SetStateAction<Workspace | null>>
}

export function useChapterEditor({ active, chapterId, setData }: UseChapterEditorOptions) {
  const [saveState, setSaveState] = useState<SaveState>('saved')
  const [suggestion, setSuggestion] = useState('')
  const [instruction, setInstruction] = useState('')
  const [aiMode, setAiModeState] = useState<AiInteractionMode>('writing')
  const [generating, setGenerating] = useState(false)
  const [generationError, setGenerationError] = useState('')
  const [usage, setUsage] = useState<GenerationUsage | null>(null)
  const [variants, setVariants] = useState<SuggestionVariant[]>([])
  const [activeVariantId, setActiveVariantId] = useState<string | null>(null)
  const [usageTotals, setUsageTotals] = useState<UsageTotals>({})
  const [isOnline, setIsOnline] = useState(() => navigator.onLine)
  const [wordCount, setWordCount] = useState(() => countCharacters(active?.plainText || ''))
  const [selectedPassage, setSelectedPassage] = useState<{ from: number; to: number; text: string } | null>(null)
  const [rewriteRange, setRewriteRange] = useState<{ from: number; to: number } | null>(null)
  const activeRef = useRef<Chapter | undefined>(active)
  const saveTimer = useRef<number | undefined>(undefined)
  const abortRef = useRef<AbortController | null>(null)
  const syncingRef = useRef(false)
  const loadedChapterIdRef = useRef('')
  const chapterAiDraftsRef = useRef(new Map<string, ChapterAiDraft>())
  const aiDraftRef = useRef<ChapterAiDraft>({ mode: aiMode, suggestion, instruction, rewriteRange, usage, generationError, variants, activeVariantId })
  activeRef.current = active
  aiDraftRef.current = { mode: aiMode, suggestion, instruction, rewriteRange, usage, generationError, variants, activeVariantId }

  useEffect(() => {
    if (active?.projectId) setUsageTotals(readUsageTotals(active.projectId))
  }, [active?.projectId])

  const syncDraft = async (targetChapterId: string) => {
    if (!navigator.onLine) return
    if (syncingRef.current) {
      window.clearTimeout(saveTimer.current)
      saveTimer.current = window.setTimeout(() => syncDraft(targetChapterId), 500)
      return
    }
    const draft = await localDb.drafts.get(targetChapterId)
    const isActive = activeRef.current?.id === targetChapterId
    if (!draft) return
    syncingRef.current = true
    if (isActive) setSaveState('saving')
    try {
      const saved = await api.saveChapter(targetChapterId, { contentJson: draft.contentJson, plainText: draft.plainText, version: draft.version })
      if (isActive) activeRef.current = saved
      setData(current => current ? { ...current, chapters: current.chapters.map(item => item.id === saved.id ? saved : item) } : current)
      const newest = await localDb.drafts.get(targetChapterId)
      if (sameDraft(draft.updatedAt, newest?.updatedAt)) {
        await localDb.drafts.delete(targetChapterId)
        if (isActive) setSaveState('saved')
      } else if (newest) {
        await localDb.drafts.put({ ...newest, version: saved.version })
        if (isActive) setSaveState('saving')
        window.clearTimeout(saveTimer.current)
        saveTimer.current = window.setTimeout(() => syncDraft(targetChapterId), 1200)
      }
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 404) await localDb.drafts.delete(targetChapterId)
      if (isActive) setSaveState(cause instanceof ApiError && cause.code === 'CHAPTER_VERSION_CONFLICT' ? 'conflict' : 'local')
    } finally { syncingRef.current = false }
  }

  const syncStoredDrafts = async () => {
    if (!navigator.onLine) return
    const drafts = await localDb.drafts.orderBy('updatedAt').toArray()
    for (const draft of drafts) await syncDraft(draft.chapterId)
  }

  const queueSave = (contentJson: Record<string, unknown>, plainText: string) => {
    const chapter = activeRef.current
    if (!chapter) return
    setSaveState(navigator.onLine ? 'saving' : 'local')
    localDb.drafts.put({ chapterId: chapter.id, version: chapter.version, title: chapter.title, contentJson, plainText, updatedAt: Date.now() })
    window.clearTimeout(saveTimer.current)
    saveTimer.current = window.setTimeout(() => syncDraft(chapter.id), 1200)
  }

  const flushCurrentDraft = async () => {
    const chapter = activeRef.current
    if (!chapter || !editor) return
    window.clearTimeout(saveTimer.current)
    const plainText = editor.getText()
    const storedDraft = await localDb.drafts.get(chapter.id)
    if (!storedDraft && plainText === chapter.plainText) return
    await localDb.drafts.put({ chapterId: chapter.id, version: storedDraft?.version ?? chapter.version, title: chapter.title, contentJson: editor.getJSON(), plainText, updatedAt: Date.now() })
    await syncDraft(chapter.id)
  }

  const editor = useEditor({
    extensions: [StarterKit, Placeholder.configure({ placeholder: '从这里开始写作……' }), CharacterCount],
    content: active?.contentJson || emptyDoc,
    editorProps: {
      attributes: { class: 'prose-editor' },
      decorations: state => {
        const { from, to, empty } = state.selection
        if (empty) return DecorationSet.empty
        return DecorationSet.create(state.doc, [Decoration.inline(from, to, { class: 'editor-selection-highlight' })])
      },
    },
    onUpdate: ({ editor: currentEditor }) => {
      const plainText = currentEditor.getText()
      setWordCount(countCharacters(plainText))
      queueSave(currentEditor.getJSON(), plainText)
    },
    onSelectionUpdate: ({ editor: currentEditor }) => {
      const { from, to, empty } = currentEditor.state.selection
      const text = empty ? '' : currentEditor.state.doc.textBetween(from, to, '\n\n').trim()
      setSelectedPassage(text ? { from, to, text } : null)
    },
  })

  useEffect(() => {
    if (!active || !editor) return
    const previousChapterId = loadedChapterIdRef.current
    if (previousChapterId && previousChapterId !== chapterId) chapterAiDraftsRef.current.set(previousChapterId, aiDraftRef.current)
    const aiDraft = chapterAiDraftsRef.current.get(chapterId)
    loadedChapterIdRef.current = chapterId
    setSelectedPassage(null)
    setRewriteRange(aiDraft?.rewriteRange ?? null)
    setSuggestion(aiDraft?.suggestion ?? '')
    setInstruction(aiDraft?.instruction ?? '')
    setAiModeState(aiDraft?.mode ?? 'writing')
    setGenerationError(aiDraft?.generationError ?? '')
    setUsage(aiDraft?.usage ?? null)
    setVariants(aiDraft?.variants ?? [])
    setActiveVariantId(aiDraft?.activeVariantId ?? null)
    setSaveState('saved')
    setWordCount(countCharacters(active.plainText))
    editor.commands.setContent(active.contentJson || emptyDoc, false)
    localDb.drafts.get(active.id).then(draft => {
      if (draft) {
        editor.commands.setContent(draft.contentJson, false)
        setWordCount(countCharacters(draft.plainText))
        const hasConflict = draftState(draft.version, active.version) === 'conflict'
        setSaveState(hasConflict ? 'conflict' : 'local')
        if (!hasConflict && navigator.onLine) window.setTimeout(() => syncStoredDrafts(), 0)
      }
    })
  }, [chapterId, editor])

  useEffect(() => {
    const online = () => { setIsOnline(true); syncStoredDrafts() }
    const offline = () => {
      setIsOnline(false)
      const id = activeRef.current?.id
      if (id) localDb.drafts.get(id).then(draft => { if (draft) setSaveState('local') })
    }
    window.addEventListener('online', online); window.addEventListener('offline', offline)
    return () => { window.removeEventListener('online', online); window.removeEventListener('offline', offline) }
  }, [])

  useEffect(() => () => window.clearTimeout(saveTimer.current), [])

  const generate = async () => {
    if (!active || !editor || generating) return
    const passage = selectedPassage || (rewriteRange ? { ...rewriteRange, text: editor.state.doc.textBetween(rewriteRange.from, rewriteRange.to, '\n\n').trim() } : null)
    setGenerating(true)
    setSuggestion('')
    setGenerationError('')
    setUsage(null)
    setActiveVariantId(null)
    setRewriteRange(passage ? { from: passage.from, to: passage.to } : null)
    abortRef.current = new AbortController()
    try {
      const result = await api.streamGenerate({ projectId: active.projectId, chapterId: active.id, chapterVersion: active.version, mode: aiMode, instruction: instruction || (aiMode === 'question' ? '分析当前内容的设计思路，并给出改进建议' : passage ? '优化选中内容' : '自然续写下一段'), selectedText: passage?.text || '', cursorContext: editor.getText().slice(-3000) }, text => setSuggestion(current => current + text), abortRef.current.signal)
      setUsage(result || null)
      if (result) {
        setUsageTotals(current => addUsageTotal(active.projectId, current, result))
      }
    } catch (cause) {
      if ((cause as Error).name !== 'AbortError') setGenerationError(cause instanceof Error ? cause.message : 'AI 生成失败')
    } finally {
      setGenerating(false)
    }
  }

  const accept = () => {
    if (!editor || !suggestion) return
    if (rewriteRange) editor.chain().focus().insertContentAt(rewriteRange, suggestion).run()
    else editor.chain().focus().insertContent(suggestion).run()
    setSuggestion('')
    setRewriteRange(null)
    setSelectedPassage(null)
    setInstruction('')
    setVariants([])
    setActiveVariantId(null)
    chapterAiDraftsRef.current.delete(activeRef.current?.id || '')
  }
  const selectVariant = (id: string) => {
    const variant = variants.find(item => item.id === id)
    if (!variant) return
    setActiveVariantId(id); setSuggestion(variant.content); setUsage(variant.usage)
  }
  const deleteVariant = (id: string) => {
    const remaining = variants.filter(item => item.id !== id)
    setVariants(remaining)
    if (activeVariantId !== id) return
    const fallback = remaining.at(-1)
    setActiveVariantId(fallback?.id ?? null); setSuggestion(fallback?.content ?? ''); setUsage(fallback?.usage ?? null)
  }
  const stashAndRegenerate = async () => {
    if (aiMode !== 'writing' || !suggestion || generating) return
    if (!activeVariantId) {
      const variant = { id: `${Date.now()}-${Math.random()}`, content: suggestion, usage, createdAt: Date.now() }
      setVariants(current => [...current, variant])
    }
    setActiveVariantId(null)
    await generate()
  }
  const discard = () => {
    if (aiMode === 'question') {
      chapterAiDraftsRef.current.delete(activeRef.current?.id || ''); setSuggestion(''); setRewriteRange(null); setSelectedPassage(null); setInstruction(''); setUsage(null); setGenerationError(''); return
    }
    const remaining = activeVariantId ? variants.filter(item => item.id !== activeVariantId) : variants
    const fallback = remaining.at(-1)
    setVariants(remaining); setActiveVariantId(fallback?.id ?? null); setSuggestion(fallback?.content ?? ''); setUsage(fallback?.usage ?? null); setGenerationError('')
  }
  const setAiMode = (mode: AiInteractionMode) => {
    if (mode === aiMode || generating) return
    setAiModeState(mode); setSuggestion(''); setRewriteRange(null); setUsage(null); setVariants([]); setActiveVariantId(null); setGenerationError('')
  }
  const replaceChapter = async (chapter: Chapter) => {
    window.clearTimeout(saveTimer.current)
    activeRef.current = chapter
    editor?.commands.setContent(chapter.contentJson || emptyDoc, false)
    setWordCount(countCharacters(chapter.plainText))
    await localDb.drafts.delete(chapter.id)
    chapterAiDraftsRef.current.delete(chapter.id); setSelectedPassage(null); setRewriteRange(null); setSuggestion(''); setGenerationError(''); setUsage(null); setVariants([]); setActiveVariantId(null); setSaveState('saved')
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!suggestion) return
      if (event.key === 'Tab') { event.preventDefault(); accept() }
      if (event.key === 'Escape') { event.preventDefault(); discard() }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [suggestion, editor])

  return { editor, saveState, isOnline, aiMode, setAiMode, suggestion, instruction, setInstruction, generating, generationError, usage, usageTotals, variants, activeVariantId, selectVariant, deleteVariant, stashAndRegenerate, selectedPassage, rewriteRange, generate, accept, discard, replaceChapter, flushCurrentDraft, retrySave: () => activeRef.current && syncDraft(activeRef.current.id), stop: () => abortRef.current?.abort(), wordCount }
}

function countCharacters(value: string) { return value.replace(/\s/g, '').length }
