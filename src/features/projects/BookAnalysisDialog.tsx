import { useEffect, useState } from 'react'
import { ArrowLeft, BookOpenText, Check, FileText, PenNib, SpinnerGap, Trash, UploadSimple, X } from '@phosphor-icons/react'
import { api } from '../../services/api'
import type { BookAnalysisResponse, BookAnalysisSummary } from '../../types/domain'
import { useBookAnalysisTask } from './bookAnalysisTask'

type Props = { onClose: () => void; onOpenProject: (projectId: string) => void }

export function BookAnalysisDialog({ onClose, onOpenProject }: Props) {
  const [file, setFile] = useState<File | null>(null)
  const [result, setResult] = useState<BookAnalysisResponse | null>(null)
  const [history, setHistory] = useState<BookAnalysisSummary[]>([])
  const [historyLoading, setHistoryLoading] = useState(true)
  const [regenerating, setRegenerating] = useState(false)
  const [creating, setCreating] = useState(false)
  const [creatingShortStory, setCreatingShortStory] = useState(false)
  const [selectedChapters, setSelectedChapters] = useState<number[]>([])
  const [targetWords, setTargetWords] = useState(8000)
  const [error, setError] = useState('')
  const task = useBookAnalysisTask()
  const loadHistory = () => api.bookAnalyses().then(setHistory).catch(cause => setError(cause instanceof Error ? cause.message : '历史拆书加载失败。')).finally(() => setHistoryLoading(false))
  useEffect(() => { void loadHistory() }, [])
  useEffect(() => {
    if (task.status === 'completed' && task.result) {
      setResult(task.result)
      setSelectedChapters([])
      void loadHistory()
    }
  }, [task.status, task.result])
  const analyze = async () => {
    if (!file) return
    if (file.size > 50 * 1024 * 1024) { setError('书籍文件不能超过 50MB。'); return }
    setError('')
    await task.start(file)
  }
  const regenerate = async () => {
    if (!result) return
    setRegenerating(true); setError('')
    try {
      const next = await api.regenerateOriginalPlan(result.id)
      setResult(next); void loadHistory()
    } catch (cause) { setError(cause instanceof Error ? cause.message : '原创方案重新生成失败。') }
    finally { setRegenerating(false) }
  }
  const openHistory = async (id: string) => {
    setHistoryLoading(true); setError('')
    try { setResult(await api.bookAnalysis(id)); setSelectedChapters([]) }
    catch (cause) { setError(cause instanceof Error ? cause.message : '拆书记录加载失败。') }
    finally { setHistoryLoading(false) }
  }
  const removeHistory = async (id: string) => {
    try { await api.deleteBookAnalysis(id); setHistory(current => current.filter(item => item.id !== id)) }
    catch (cause) { setError(cause instanceof Error ? cause.message : '拆书记录删除失败。') }
  }
  const createFromPlan = async () => {
    if (!result) return
    setCreating(true); setError('')
    try {
      const plan = result.result.originalPlan
      const project = await api.createProject({ title: plan.title || '拆书原创方案', idea: `${plan.positioning}\n\n${plan.corePremise}`.trim(), genres: [], lengthType: '中长篇', style: [] })
      const group = await api.addResourceGroup(project.id, '拆书原创方案')
      const items = originalPlanResources(plan)
      for (const item of items) await api.addResourceItem(group.id, item)
      onOpenProject(project.id)
    } catch (cause) { setError(cause instanceof Error ? cause.message : '创建作品失败。') }
    finally { setCreating(false) }
  }
  const createShortStory = async () => {
    if (!result || selectedChapters.length === 0) return
    setCreatingShortStory(true); setError('')
    try {
      const story = await api.createShortStory(result.id, selectedChapters, targetWords)
      const project = await api.createProject({ title: story.title, idea: `由《${result.filename}》所选章节的抽象叙事机制启发，生成的独立原创短篇。`, genres: ['短篇'], lengthType: '短篇', style: [] })
      const chapter = await api.createChapter(project.id)
      await api.saveChapter(chapter.id, { version: chapter.version, title: story.title, plainText: story.content, contentJson: storyDocument(story.content), status: 'writing' })
      onOpenProject(project.id)
    } catch (cause) { setError(cause instanceof Error ? cause.message : '仿写短篇生成失败。') }
    finally { setCreatingShortStory(false) }
  }

  return <div className="modal-backdrop book-analysis-backdrop" onMouseDown={onClose}>
    <section className="book-analysis-dialog" role="dialog" aria-label="拆书仿写" onMouseDown={event => event.stopPropagation()}>
      <header><div className="analysis-header-title">{result && <button className="icon-button" onClick={() => { setResult(null); setError(''); task.reset() }} aria-label="返回拆书列表"><ArrowLeft /></button>}<div><span>AI 拆书工作台</span><h2>{result ? result.result.originalPlan.title : '从一本书，提炼新的创作方向'}</h2></div></div><div className="analysis-header-actions">{result && <><button className="button" onClick={regenerate} disabled={regenerating || creating}>{regenerating ? <><SpinnerGap className="spin" />重新生成中</> : '保留原书拆解，重新生成原创转化'}</button><button className="button primary" onClick={createFromPlan} disabled={regenerating || creating}>{creating ? <><SpinnerGap className="spin" />正在创建</> : '确认该原创转化，进入创作'}</button></>}<button className="icon-button" onClick={onClose} aria-label="关闭拆书仿写"><X /></button></div></header>
      {!result ? <div className="book-analysis-home"><div className="book-analysis-upload">
        <BookOpenText weight="duotone" />
        <h3>上传需要分析的书籍</h3>
        <p>支持 PDF、EPUB、TXT、Markdown、DOCX，最大 50MB。扫描版 PDF 需要先完成 OCR。</p>
        <label className={`book-file-picker${task.status === 'running' ? ' disabled' : ''}`}><UploadSimple />{task.status === 'running' ? task.filename : file ? file.name : '选择书籍文件'}<input disabled={task.status === 'running'} type="file" accept=".pdf,.epub,.txt,.md,.markdown,.docx" onChange={event => setFile(event.target.files?.[0] || null)} /></label>
        <p className="copyright-note">请确保你有权上传和分析该文件。系统只提炼抽象创作方法，并要求新方案在角色、设定、情节与结局上保持实质差异。</p>
        {(error || task.error) && <div className="notice error">{error || task.error}</div>}
        {task.status === 'running' && <div className="book-analysis-progress" aria-live="polite"><div><SpinnerGap className="spin" /><strong>{task.stage}</strong><span>{task.progress}%</span></div><div className="book-analysis-progress-track"><i style={{ width: `${task.progress}%` }} /></div><small>可以关闭此窗口，拆解会继续在后台进行。</small></div>}
        <button className="button primary" disabled={!file || task.status === 'running'} onClick={analyze}>{task.status === 'running' ? '正在拆解，可能需要几分钟' : task.status === 'failed' ? '重新开始拆书' : '开始拆书并生成原创方案'}</button>
      </div><section className="book-analysis-history"><div><span>已拆书籍</span><small>拆解内容会自动保留，可直接复用原创转化</small></div>{historyLoading ? <div className="history-loading"><SpinnerGap className="spin" />正在加载</div> : history.length === 0 ? <p>还没有保存的拆书记录。</p> : <div className="book-history-list">{history.map(item => <article key={item.id} role="button" tabIndex={0} onClick={() => void openHistory(item.id)} onKeyDown={event => { if (event.key === 'Enter') void openHistory(item.id) }}><FileText /><div><strong>{item.title}</strong><span>{item.filename} · {item.characterCount.toLocaleString()} 字符</span><small>{item.model} · {new Date(item.updatedAt).toLocaleString()}</small></div><button className="icon-button danger" aria-label={`删除${item.title}`} onClick={event => { event.stopPropagation(); void removeHistory(item.id) }}><Trash /></button></article>)}</div>}</section></div> : <>{error && <div className="notice error analysis-result-error">{error}</div>}<AnalysisDocument value={result} selectedChapters={selectedChapters} onSelectedChaptersChange={setSelectedChapters} targetWords={targetWords} onTargetWordsChange={setTargetWords} onCreateShortStory={() => void createShortStory()} creatingShortStory={creatingShortStory} /></>}
    </section>
  </div>
}

function AnalysisDocument({ value, selectedChapters, onSelectedChaptersChange, targetWords, onTargetWordsChange, onCreateShortStory, creatingShortStory }: { value: BookAnalysisResponse; selectedChapters: number[]; onSelectedChaptersChange: (value: number[]) => void; targetWords: number; onTargetWordsChange: (value: number) => void; onCreateShortStory: () => void; creatingShortStory: boolean }) {
  const { sourceAnalysis: source, originalPlan: plan } = value.result
  return <div className="analysis-document">
    <div className="analysis-meta"><FileText />{value.filename}<span>{value.characterCount.toLocaleString()} 字符</span><span>{value.model}</span></div>
    <section><div className="analysis-overline">SOURCE ANALYSIS</div><h3>原书结构分析</h3><p>{source.summary}</p><TagList values={source.themes} /></section>
    <AnalysisList title="原书大纲" items={source.outline.map(item => ({ title: item.stage, body: item.content }))} />
    <CharacterList title="原书角色关系" values={source.characters} />
    <AnalysisList title="原书完整故事线" items={source.storyline.map(item => ({ title: item.stage, body: `${item.events.join('；')}\n${item.causality}` }))} />
    <section className="short-story-picker"><div className="short-story-heading"><div><div className="analysis-overline">SHORT STORY ADAPTATION</div><h3>选择精彩章节，创作独立短篇</h3><p>可多选章节。系统只借鉴节奏、冲突与情绪曲线，重新设计人物、设定、情节和结局。</p></div><PenNib /></div><div className="selectable-chapter-list">{source.chapters.map((item, index) => { const selected = selectedChapters.includes(index); return <button type="button" className={selected ? 'selected' : ''} key={`${item.chapter}-${index}`} onClick={() => onSelectedChaptersChange(selected ? selectedChapters.filter(value => value !== index) : [...selectedChapters, index])}><span className="chapter-check">{selected && <Check weight="bold" />}</span><span className="chapter-number">{String(index + 1).padStart(2, '0')}</span><span><strong>{item.chapter}</strong><small>{item.summary}</small><em>转折：{item.turningPoint}</em></span></button> })}</div><div className="short-story-controls"><label><span>目标字数</span><input type="number" min="1000" max="20000" step="1000" value={targetWords} onChange={event => onTargetWordsChange(Math.min(20000, Math.max(1000, Number(event.target.value) || 1000)))} /><small>最多 20,000 字</small></label><div><span>已选择 {selectedChapters.length} 个章节</span><button className="button primary" disabled={selectedChapters.length === 0 || creatingShortStory} onClick={onCreateShortStory}>{creatingShortStory ? <><SpinnerGap className="spin" />正在创作短篇</> : <><PenNib />生成并进入短篇</>}</button></div></div></section>
    <div className="analysis-divider"><span>原创转化</span></div>
    <section className="original-intro"><div className="analysis-overline">ORIGINAL DIRECTION</div><h3>{plan.title}</h3><strong>{plan.positioning}</strong><p>{plan.corePremise}</p></section>
    <AnalysisList title="原创大纲" items={plan.outline.map(item => ({ title: item.stage, body: item.content }))} />
    <CharacterList title="原创人物关系" values={plan.characters} />
    <AnalysisList title="原创完整故事线" items={plan.storyline.map(item => ({ title: item.stage, body: `${item.events.join('；')}\n${item.causality}` }))} />
    <AnalysisList title="原创章节规划" items={plan.chapterPlan.map(item => ({ title: item.chapter, body: `目标：${item.goal}\n冲突：${item.conflict}\n章末钩子：${item.hook}` }))} />
    <section><h3>去雷同检查</h3><div className="difference-grid"><div><h4>实质差异</h4><TagList values={plan.differentiation} /></div><div><h4>风险与规避</h4><TagList values={plan.riskCheck} /></div></div></section>
  </div>
}

function storyDocument(content: string) {
  return { type: 'doc', content: content.split(/\n{2,}/).filter(Boolean).map(text => ({ type: 'paragraph', content: [{ type: 'text', text }] })) }
}

function AnalysisList({ title, items }: { title: string; items: { title: string; body: string }[] }) { return <section><h3>{title}</h3><div className="analysis-list">{items.map((item, index) => <article key={`${item.title}-${index}`}><span>{String(index + 1).padStart(2, '0')}</span><div><h4>{item.title}</h4><p>{item.body}</p></div></article>)}</div></section> }
function CharacterList({ title, values }: { title: string; values: BookAnalysisResponse['result']['sourceAnalysis']['characters'] }) { return <section><h3>{title}</h3><div className="character-table">{values.map(item => <article key={item.name}><div><strong>{item.name}</strong><span>{item.role}</span></div><p>{item.traits.join(' · ')}</p><p>{item.relationships.join('；')}</p></article>)}</div></section> }
function TagList({ values }: { values: string[] }) { return <div className="analysis-tags">{values.map((value, index) => <span key={`${value}-${index}`}>{value}</span>)}</div> }

function originalPlanResources(plan: BookAnalysisResponse['result']['originalPlan']) {
  return [
    { name: '原创大纲', content: plan.outline.map(item => `【${item.stage}】\n${item.content}`).join('\n\n') },
    { name: '人物关系', content: plan.characters.map(item => `【${item.name}｜${item.role}】\n特征：${item.traits.join('、')}\n关系：${item.relationships.join('；')}`).join('\n\n') },
    { name: '完整故事线', content: plan.storyline.map(item => `【${item.stage}】\n${item.events.join('；')}\n因果推进：${item.causality}`).join('\n\n') },
    { name: '章节规划', content: plan.chapterPlan.map(item => `【${item.chapter}】\n目标：${item.goal}\n冲突：${item.conflict}\n章末钩子：${item.hook}`).join('\n\n') },
    { name: '去雷同检查', content: `实质差异：\n${plan.differentiation.map(item => `- ${item}`).join('\n')}\n\n风险与规避：\n${plan.riskCheck.map(item => `- ${item}`).join('\n')}` },
  ]
}
