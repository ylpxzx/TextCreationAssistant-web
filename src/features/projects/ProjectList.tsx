import { useCallback, useEffect, useState, type CSSProperties, type KeyboardEvent, type MouseEvent } from 'react'
import { Archive, ArrowCounterClockwise, BookOpen, BookOpenText, Books, Gear, House, MagnifyingGlass, PencilSimple, Plus, SignOut, Trash, X } from '@phosphor-icons/react'
import { BrandMark } from '../../shared/components/BrandMark'
import { api } from '../../services/api'
import type { Project } from '../../types/domain'
import { useConfirm, useToast } from '../../shared/components/FeedbackProvider'
import { BookAnalysisDialog } from './BookAnalysisDialog'

type ProjectListProps = { onOpen: (id: string) => void; onSettings: () => void; onLogout: () => Promise<void> }
type ProjectForm = { title: string; idea: string; genres: string[]; style: string[]; lengthType: string }
const genres = ['玄幻', '古代', '科幻', '穿越', '现实', '悬疑', '言情']
const writingStyles = ['克制', '诗意', '幽默', '古言', '简单易懂']
const emptyForm = (): ProjectForm => ({ title: '', idea: '', genres: [], style: ['克制'], lengthType: '中长篇' })

export function ProjectList({ onOpen, onSettings, onLogout }: ProjectListProps) {
  const confirm = useConfirm(); const toast = useToast()
  const [projects, setProjects] = useState<Project[]>([])
  const [editing, setEditing] = useState<Project | 'new' | null>(null)
  const [form, setForm] = useState<ProjectForm>(emptyForm)
  const [showArchived, setShowArchived] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [bookAnalysisOpen, setBookAnalysisOpen] = useState(false)
  const load = useCallback(() => api.projects().then(setProjects), [])
  useEffect(() => { load().catch(cause => setError(message(cause))) }, [load])

  const visible = projects.filter(project => Boolean(project.archivedAt) === showArchived)
  const openCreate = () => { setForm(emptyForm()); setEditing('new'); setError('') }
  const openEdit = (project: Project, event: MouseEvent) => { event.stopPropagation(); setForm({ title: project.title, idea: project.idea, genres: project.genres, style: project.style, lengthType: project.lengthType }); setEditing(project); setError('') }
  const toggle = (key: 'genres' | 'style', value: string) => setForm(current => ({ ...current, [key]: current[key].includes(value) ? current[key].filter(item => item !== value) : [...current[key], value] }))
  const save = async () => {
    setSaving(true); setError('')
    try {
      if (editing === 'new') { const created = await api.createProject(form); setEditing(null); onOpen(created.id) }
      else if (editing) { await api.updateProject(editing.id, form); setEditing(null); await load() }
    } catch (cause) { setError(message(cause)) } finally { setSaving(false) }
  }
  const archive = async (project: Project, event: MouseEvent) => { event.stopPropagation(); setError(''); try { await api.updateProject(project.id, { archived: !project.archivedAt }); await load(); toast({ message: project.archivedAt ? '作品已恢复' : '作品已归档', tone: 'success' }) } catch (cause) { setError(message(cause)) } }
  const remove = async (project: Project, event: MouseEvent) => { event.stopPropagation(); if (!await confirm({ title: '删除作品', message: `确定删除“${project.title}”吗？作品、章节和创作资料将不可再访问。`, confirmLabel: '删除作品', danger: true })) return; setError(''); try { await api.deleteProject(project.id); await load(); toast({ message: '作品已删除', tone: 'success' }) } catch (cause) { setError(message(cause)) } }
  const openByKeyboard = (event: KeyboardEvent, id: string) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onOpen(id) } }

  return <main className="library">
    <aside className="library-sidebar">
      <div className="library-brand"><BrandMark /><button className="icon-button" aria-label="搜索"><MagnifyingGlass /></button></div>
      <nav className="library-nav"><button className="library-nav-row"><House weight="fill" />主页</button><button className={!showArchived ? 'library-nav-row active' : 'library-nav-row'} onClick={() => setShowArchived(false)}><Books weight="fill" />我的作品</button><button className="library-nav-row" onClick={() => setBookAnalysisOpen(true)}><BookOpenText weight="fill" />拆书仿写</button><button className={showArchived ? 'library-nav-row active' : 'library-nav-row'} onClick={() => setShowArchived(true)}><Archive weight="fill" />归档</button></nav>
      <div className="library-sidebar-bottom"><button className="library-nav-row" onClick={onSettings}><Gear weight="bold" />模型设置</button><button className="library-nav-row" onClick={() => onLogout().catch(cause => setError(message(cause)))}><SignOut weight="bold" />退出登录</button></div>
    </aside>
    <section className="library-main">
      <header className="library-header"><span>{showArchived ? '归档作品' : '我的作品'}</span><button className="icon-button" onClick={onSettings} aria-label="模型设置"><Gear /></button></header>
      <div className="library-content">
        <div className="section-heading"><div><div className="page-icon">{showArchived ? <Archive weight="duotone" /> : <Books weight="duotone" />}</div><h1>{showArchived ? '归档作品' : '我的作品'}</h1><p>{showArchived ? '暂时收起，但仍然保留的故事。' : '记录正在发生的故事。'}</p></div>{!showArchived && <div className="library-heading-actions"><button className="button" onClick={() => setBookAnalysisOpen(true)}><BookOpenText />拆书仿写</button><button className="button primary" onClick={openCreate}><Plus weight="bold" />新建</button></div>}</div>
        {error && <div className="notice error project-notice">{error}</div>}
        {visible.length === 0 ? <div className="empty-state"><BookOpen size={34} /><h2>{showArchived ? '没有归档作品' : '写下第一部作品'}</h2><p>{showArchived ? '归档后的作品会显示在这里。' : '从一个名字或一句尚未成形的想法开始。'}</p>{!showArchived && <button className="button" onClick={openCreate}>新建作品</button>}</div> : <div className="project-grid">{visible.map((project, index) => <article className="project-card reveal" style={{ '--index': index } as CSSProperties} key={project.id} role="button" tabIndex={0} onClick={() => onOpen(project.id)} onKeyDown={event => openByKeyboard(event, project.id)}><div className="project-card-actions"><button onClick={event => openEdit(project, event)} title="编辑作品"><PencilSimple /></button><button onClick={event => archive(project, event)} title={project.archivedAt ? '恢复作品' : '归档作品'}>{project.archivedAt ? <ArrowCounterClockwise /> : <Archive />}</button><button className="danger" onClick={event => remove(project, event)} title="删除作品"><Trash /></button></div><div className="project-index">{String(index + 1).padStart(2, '0')}</div><h2>{project.title}</h2><p>{project.idea || '尚未添加故事简介'}</p><div className="project-meta"><span>{project.totalWords.toLocaleString()} 字</span><span>{new Date(project.updatedAt).toLocaleDateString()}</span></div></article>)}</div>}
      </div>
    </section>
    {editing && <div className="modal-backdrop" onMouseDown={() => setEditing(null)}><section className="modal" onMouseDown={event => event.stopPropagation()}><header><h2>{editing === 'new' ? '新建创作' : '编辑作品'}</h2><button className="icon-button" onClick={() => setEditing(null)}><X /></button></header><label>作品名称<input value={form.title} onChange={event => setForm({ ...form, title: event.target.value })} placeholder="例如：雾港拾遗" autoFocus /></label><label>一句话灵感<textarea value={form.idea} onChange={event => setForm({ ...form, idea: event.target.value })} placeholder="一个摆渡人开始收到来自未来的信。" /></label><label>创作类型<select value={form.lengthType} onChange={event => setForm({ ...form, lengthType: event.target.value })}><option>短篇</option><option>中长篇</option><option>长篇</option></select></label><fieldset><legend>题材（可多选）</legend><div className="choice-row">{genres.map(item => <button type="button" className={form.genres.includes(item) ? 'chip selected' : 'chip'} onClick={() => toggle('genres', item)} key={item}>{item}</button>)}</div></fieldset><fieldset><legend>笔风</legend><div className="choice-row">{writingStyles.map(item => <button type="button" className={form.style.includes(item) ? 'chip selected' : 'chip'} onClick={() => toggle('style', item)} key={item}>{item}</button>)}</div></fieldset>{error && <div className="notice error">{error}</div>}<footer><button className="button" onClick={() => setEditing(null)}>取消</button><button className="button primary" onClick={save} disabled={saving || !form.title.trim()}>{saving ? '保存中…' : editing === 'new' ? '创建作品' : '保存修改'}</button></footer></section></div>}
    {bookAnalysisOpen && <BookAnalysisDialog onClose={() => setBookAnalysisOpen(false)} onOpenProject={onOpen} />}
  </main>
}

function message(cause: unknown) { return cause instanceof Error ? cause.message : '操作失败，请稍后重试' }
