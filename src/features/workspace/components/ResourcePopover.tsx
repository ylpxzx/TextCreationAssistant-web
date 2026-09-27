import { useEffect, useState } from 'react'
import { Eye, EyeSlash, Plus, Trash, X } from '@phosphor-icons/react'
import { api } from '../../../services/api'
import type { KnowledgeItem, ResourceGroup } from '../../../types/domain'
import { useConfirm, useToast } from '../../../shared/components/FeedbackProvider'

type ResourcePopoverProps = { group: ResourceGroup; onClose: () => void; onChanged: () => Promise<void> }

export function ResourcePopover({ group, onClose, onChanged }: ResourcePopoverProps) {
  const confirm = useConfirm(); const toast = useToast()
  const items = group.items
  const [selectedId, setSelectedId] = useState(items[0]?.id || '')
  const selected = items.find(item => item.id === selectedId)
  const [name, setName] = useState(selected?.name || '')
  const [content, setContent] = useState(selected?.content || '')
  const [useInAi, setUseInAi] = useState(selected?.useInAi ?? true)
  const [groupName, setGroupName] = useState(group.name)
  const [status, setStatus] = useState('')

  useEffect(() => {
    const next = items.find(item => item.id === selectedId) || items[0]
    setSelectedId(next?.id || '')
    setName(next?.name || '')
    setContent(next?.content || '')
    setUseInAi(next?.useInAi ?? true)
    setGroupName(group.name)
  }, [group.id, items, selectedId])

  const choose = (item: KnowledgeItem) => { setSelectedId(item.id); setName(item.name); setContent(item.content); setUseInAi(item.useInAi); setStatus('') }
  const add = async () => { const created = await api.addResourceItem(group.id, { name: '未命名资料', content: '' }); await onChanged(); setSelectedId(created.id); setName(created.name); setContent(''); setStatus('') }
  const save = async () => { if (!selectedId) return; await api.saveResourceItem(selectedId, { name: name.trim() || '未命名资料', content, useInAi }); await onChanged(); setStatus('已保存'); window.setTimeout(() => setStatus(''), 1400) }
  const renameGroup = async () => { const nextName = groupName.trim() || '未命名资料'; setGroupName(nextName); if (nextName === group.name) return; await api.saveResourceGroup(group.id, { name: nextName }); await onChanged() }
  const toggleGroupReference = async () => { await api.saveResourceGroup(group.id, { useInAi: !group.useInAi }); await onChanged() }
  const removeGroup = async () => { if (!await confirm({ title: '删除资料分类', message: `确定删除“${group.name}”及其中的全部资料吗？删除后无法恢复。`, confirmLabel: '删除分类', danger: true })) return; await api.deleteResourceGroup(group.id); await onChanged(); toast({ message: '资料分类已删除', tone: 'success' }); onClose() }
  const removeItem = async () => { if (!selectedId || !await confirm({ title: '删除资料', message: `确定删除“${name || '未命名资料'}”吗？删除后无法恢复。`, confirmLabel: '删除资料', danger: true })) return; await api.deleteResourceItem(selectedId); setSelectedId(''); await onChanged(); toast({ message: '资料已删除', tone: 'success' }) }

  return <section className="resource-popover" role="dialog" aria-modal="false" aria-label={group.name}>
    <header className="resource-popover-head"><div className="resource-group-heading"><span className="resource-overline">创作资料</span><input value={groupName} onChange={event => setGroupName(event.target.value)} onBlur={renameGroup} onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.blur() }} aria-label="资料分类名称"/><p>由你自定义这组资料的内容和用途。</p></div><div className="resource-head-actions"><button className={group.useInAi ? 'reference-toggle enabled' : 'reference-toggle'} onClick={toggleGroupReference} title={group.useInAi ? '此分类会用于 AI 参考' : '此分类不会用于 AI 参考'}>{group.useInAi ? <Eye/> : <EyeSlash/>}<span>{group.useInAi ? 'AI 参考' : '不参考'}</span></button><button className="icon-button danger" onClick={removeGroup} aria-label={`删除${group.name}`} title="删除资料分类"><Trash /></button><button className="icon-button" onClick={onClose} aria-label={`关闭${group.name}`}><X /></button></div></header>
    <div className="resource-body"><nav className="resource-list" aria-label={`${group.name}列表`}>{items.map(item => <button key={item.id} className={item.id === selectedId ? 'resource-list-row active' : 'resource-list-row'} onClick={() => choose(item)}><strong>{item.name}</strong><span>{item.useInAi ? '用于 AI 参考' : '不用于 AI'} · {item.content || '尚未填写内容'}</span></button>)}<button className="resource-add" onClick={add}><Plus />新建资料</button></nav><article className="resource-detail">{selectedId ? <><input className="resource-title-input" value={name} onChange={event => setName(event.target.value)} aria-label="资料名称"/><textarea value={content} onChange={event => setContent(event.target.value)} placeholder="记录与创作有关的文字内容……" /><footer><button className={useInAi ? 'reference-toggle enabled' : 'reference-toggle'} onClick={() => setUseInAi(value => !value)}>{useInAi ? <Eye/> : <EyeSlash/>}<span>{useInAi ? '用于 AI 参考' : '不用于 AI 参考'}</span></button><button className="icon-button danger" onClick={removeItem} aria-label="删除这条资料" title="删除这条资料"><Trash /></button><span className="resource-save-state">{status}</span><button className="button small primary" onClick={save}>保存</button></footer></> : <div className="resource-empty"><p>这组资料还没有内容。</p><button className="button small" onClick={add}><Plus />新建资料</button></div>}</article></div>
  </section>
}
