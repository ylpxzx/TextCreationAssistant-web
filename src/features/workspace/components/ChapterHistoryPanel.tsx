import { useCallback, useEffect, useState } from 'react'
import { ArrowCounterClockwise, ClockCounterClockwise, SpinnerGap, X } from '@phosphor-icons/react'
import { api } from '../../../services/api'
import type { Chapter, ChapterRevision, ChapterRevisionSummary } from '../../../types/domain'
import { useConfirm, useToast } from '../../../shared/components/FeedbackProvider'

type ChapterHistoryPanelProps = {
  chapter: Chapter
  canRestore: boolean
  onClose: () => void
  onRestored: (chapter: Chapter) => Promise<void>
}

export function ChapterHistoryPanel({ chapter, canRestore, onClose, onRestored }: ChapterHistoryPanelProps) {
  const confirm = useConfirm(); const toast = useToast()
  const [items, setItems] = useState<ChapterRevisionSummary[]>([])
  const [selected, setSelected] = useState<ChapterRevision | null>(null)
  const [loading, setLoading] = useState(true)
  const [restoring, setRestoring] = useState(false)
  const [error, setError] = useState('')

  const select = useCallback(async (revision: ChapterRevisionSummary) => {
    setError('')
    try { setSelected(await api.chapterRevision(chapter.id, revision.id)) }
    catch (cause) { setError(message(cause)) }
  }, [chapter.id])

  useEffect(() => {
    setLoading(true); setSelected(null); setError('')
    api.chapterRevisions(chapter.id).then(result => { setItems(result.items); if (result.items[0]) return select(result.items[0]) }).catch(cause => setError(message(cause))).finally(() => setLoading(false))
  }, [chapter.id, select])

  const restore = async () => {
    if (!selected || !canRestore || !await confirm({ title: `恢复版本 ${selected.version}`, message: '当前内容会先自动保留为一个历史版本，然后恢复所选内容。', confirmLabel: '恢复版本' })) return
    setRestoring(true); setError('')
    try { const restored = await api.restoreChapterRevision(chapter.id, selected.id, chapter.version); await onRestored(restored); toast({ message: `已恢复到版本 ${selected.version}`, tone: 'success' }); onClose() }
    catch (cause) { setError(message(cause)) } finally { setRestoring(false) }
  }

  return <section className="history-panel" role="dialog" aria-label="章节历史版本">
    <header><div><span>章节历史</span><strong>{chapter.title}</strong></div><button className="icon-button" onClick={onClose} aria-label="关闭历史版本"><X /></button></header>
    <div className="history-body">
      <nav className="history-list">{loading ? <div className="history-empty"><SpinnerGap className="spin" />正在加载</div> : items.length === 0 ? <div className="history-empty"><ClockCounterClockwise />还没有历史版本<br/><small>章节下次保存前会保留当前版本。</small></div> : items.map(item => <button className={selected?.id === item.id ? 'active' : ''} key={item.id} onClick={() => select(item)}><strong>版本 {item.version}</strong><time>{new Date(item.createdAt).toLocaleString()}</time><span>{item.wordCount} 字 · {item.excerpt || '空白章节'}</span></button>)}</nav>
      <article className="history-preview">{selected ? <><div className="history-preview-meta"><div><span>版本 {selected.version}</span><strong>{selected.title}</strong></div><button className="button small primary" disabled={!canRestore || restoring} onClick={restore}><ArrowCounterClockwise />{restoring ? '恢复中…' : '恢复此版本'}</button></div>{!canRestore && <div className="notice error">请等待当前章节保存完成后再恢复历史版本。</div>}{error && <div className="notice error">{error}</div>}<div className="history-copy">{selected.plainText || '这个版本没有正文内容。'}</div></> : !loading && <div className="history-empty">选择左侧版本查看内容</div>}</article>
    </div>
  </section>
}

function message(cause: unknown) { return cause instanceof Error ? cause.message : '历史版本操作失败' }
