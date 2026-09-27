import { Sparkle, Trash } from '@phosphor-icons/react'
import type { SuggestionVariant } from '../hooks/useChapterEditor'

type Props = {
  variants: SuggestionVariant[]
  activeVariantId: string | null
  onSelect: (id: string) => void
  onDelete: (id: string) => void
}

export function CandidateVersionsSidebar({ variants, activeVariantId, onSelect, onDelete }: Props) {
  return <aside className="right-panel candidate-versions-panel" aria-label="AI 候选版本侧边栏">
    <div className="panel-title"><span>AI 候选版本</span><small>{variants.length}</small></div>
    <p className="candidate-panel-intro">暂存的生成结果会保留在这里。选择一版查看全文，再在正文下方决定是否采纳。</p>
    {variants.length === 0 ? <div className="candidate-empty"><Sparkle /><strong>还没有候选版本</strong><span>在生成内容下方点击“暂存并再生成”。</span></div> : <div className="candidate-version-list">
      {variants.map((variant, index) => <article className={activeVariantId === variant.id ? 'active' : ''} key={variant.id}>
        <button className="candidate-version-main" onClick={() => onSelect(variant.id)} aria-label={`查看候选版本 ${index + 1}`}>
          <span>版本 {index + 1}</span>
          <p>{variant.content}</p>
          <time>{new Date(variant.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time>
        </button>
        <button className="candidate-version-delete" onClick={() => onDelete(variant.id)} aria-label={`删除候选版本 ${index + 1}`} title="删除此版本"><Trash /></button>
      </article>)}
    </div>}
  </aside>
}
