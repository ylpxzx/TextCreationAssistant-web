import { useState } from 'react'
import { ArrowsLeftRight, CloudArrowDown, FloppyDisk, X } from '@phosphor-icons/react'
import type { LocalDraft } from '../../../storage/localDb'
import type { Chapter } from '../../../types/domain'

type ChapterConflictPanelProps = {
  server: Chapter
  draft: LocalDraft
  onClose: () => void
  onUseServer: () => Promise<void>
  onKeepLocal: () => Promise<void>
  onMerge: (plainText: string) => Promise<void>
}

export function ChapterConflictPanel({ server, draft, onClose, onUseServer, onKeepLocal, onMerge }: ChapterConflictPanelProps) {
  const [merged, setMerged] = useState(draft.plainText)
  const [busy, setBusy] = useState<'server' | 'local' | 'merge' | ''>('')
  const [error, setError] = useState('')

  const run = async (action: 'server' | 'local' | 'merge') => {
    setBusy(action); setError('')
    try {
      if (action === 'server') await onUseServer()
      if (action === 'local') await onKeepLocal()
      if (action === 'merge') await onMerge(merged)
    } catch (cause) { setError(cause instanceof Error ? cause.message : '处理版本冲突失败') }
    finally { setBusy('') }
  }

  return <section className="conflict-panel" role="dialog" aria-modal="true" aria-label="处理章节版本冲突">
    <header><div><span>版本冲突</span><strong>{server.title}</strong></div><button className="icon-button" onClick={onClose} aria-label="暂时关闭"><X /></button></header>
    <div className="conflict-intro"><ArrowsLeftRight /><div><strong>本地草稿与服务端版本不一致</strong><p>服务端当前为版本 {server.version}，本地草稿基于版本 {draft.version}。选择一个版本，或在下方合并后保存。</p></div></div>
    {error && <div className="notice error conflict-error">{error}</div>}
    <div className="conflict-columns">
      <article><div className="conflict-label"><span>服务端版本</span><button disabled={Boolean(busy)} onClick={() => run('server')}><CloudArrowDown />使用服务端</button></div><pre>{server.plainText || '空白章节'}</pre></article>
      <article><div className="conflict-label"><span>本地草稿</span><button disabled={Boolean(busy)} onClick={() => run('local')}><FloppyDisk />保留本地并覆盖</button></div><pre>{draft.plainText || '空白章节'}</pre></article>
    </div>
    <div className="conflict-merge"><label>手动合并<textarea value={merged} onChange={event => setMerged(event.target.value)} /></label><button className="button primary" disabled={Boolean(busy)} onClick={() => run('merge')}>{busy === 'merge' ? '保存中…' : '保存合并内容'}</button></div>
  </section>
}
