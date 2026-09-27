import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { ArrowLeft } from '@phosphor-icons/react'
import { BrandMark } from '../../shared/components/BrandMark'
import { api } from '../../services/api'
import type { ModelProfile } from '../../types/domain'
import { useConfirm, useToast } from '../../shared/components/FeedbackProvider'
import { emptyModelProfileForm, ModelProfileForm, type ModelProfileFormValue } from './ModelProfileForm'
import { ModelProfileList } from './ModelProfileList'

type SettingsPageProps = { onBack: () => void }

export function SettingsPage({ onBack }: SettingsPageProps) {
  const confirm = useConfirm(); const toast = useToast()
  const [profiles, setProfiles] = useState<ModelProfile[]>([])
  const [editing, setEditing] = useState<ModelProfile | null>(null)
  const [form, setForm] = useState<ModelProfileFormValue>(emptyModelProfileForm)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState('')
  const [saving, setSaving] = useState(false)
  const load = useCallback(() => api.modelProfiles().then(setProfiles), [])
  useEffect(() => { load().catch(cause => setError(errorMessage(cause))) }, [load])

  const resetForm = () => { setEditing(null); setForm(emptyModelProfileForm) }
  const edit = (profile: ModelProfile) => {
    setEditing(profile); setMessage(''); setError('')
    setForm({ name: profile.name, provider: profile.provider, model: profile.model, baseUrl: profile.baseUrl, apiKey: '' })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const save = async (event: FormEvent) => {
    event.preventDefault(); setSaving(true); setMessage(''); setError('')
    try {
      if (editing) {
        const { apiKey, ...changes } = form
        await api.updateModelProfile(editing.id, { ...changes, ...(apiKey ? { apiKey } : {}) })
        setMessage('模型配置已更新')
      } else {
        await api.createModelProfile({ ...form, isDefault: profiles.length === 0 })
        setMessage('模型配置已加密保存')
      }
      resetForm(); await load()
    } catch (cause) { setError(errorMessage(cause)) } finally { setSaving(false) }
  }

  const test = async (profile: ModelProfile) => {
    setBusyId(profile.id); setMessage(''); setError('')
    try { const result = await api.testModelProfile(profile.id); setMessage(`${profile.name} 连接成功${result.latencyMs ? `，耗时 ${result.latencyMs}ms` : ''}`) }
    catch (cause) { setError(errorMessage(cause)) } finally { setBusyId('') }
  }

  const makeDefault = async (profile: ModelProfile) => {
    setBusyId(profile.id); setMessage(''); setError('')
    try { await api.setDefaultModelProfile(profile.id); setMessage(`已将 ${profile.name} 设为默认模型`); await load() }
    catch (cause) { setError(errorMessage(cause)) } finally { setBusyId('') }
  }

  const remove = async (profile: ModelProfile) => {
    if (!await confirm({ title: '删除模型配置', message: `确定删除“${profile.name}”吗？`, confirmLabel: '删除配置', danger: true })) return
    setBusyId(profile.id); setMessage(''); setError('')
    try { await api.deleteModelProfile(profile.id); if (editing?.id === profile.id) resetForm(); await load(); toast({ message: '模型配置已删除', tone: 'success' }) }
    catch (cause) { setError(errorMessage(cause)) } finally { setBusyId('') }
  }

  return <main className="settings-page">
    <header className="simple-header"><button className="icon-button" onClick={onBack}><ArrowLeft /></button><BrandMark label="模型设置" compact /></header>
    <div className="settings-layout">
      <section><div className="eyebrow">MODEL CONNECTIONS</div><h1>{editing ? '编辑模型配置' : '连接写作模型'}</h1><p className="lead">密钥只会提交给核心 API 加密保存；生成时由内部服务调用模型，不会返回浏览器。</p><ModelProfileForm value={form} editing={editing} saving={saving} message={message} error={error} onChange={setForm} onSubmit={save} onCancel={resetForm} /></section>
      <ModelProfileList profiles={profiles} busyId={busyId} onEdit={edit} onTest={test} onMakeDefault={makeDefault} onRemove={remove} />
    </div>
  </main>
}

function errorMessage(cause: unknown) { return cause instanceof Error ? cause.message : '操作失败，请稍后重试' }
