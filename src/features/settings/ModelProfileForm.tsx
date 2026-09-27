import type { FormEvent } from 'react'
import { Check, SpinnerGap } from '@phosphor-icons/react'
import type { ModelProfile } from '../../types/domain'

export type ModelProfileFormValue = { name: string; provider: 'openai' | 'openai-compatible'; model: string; baseUrl: string; apiKey: string }
type Props = { value: ModelProfileFormValue; editing: ModelProfile | null; saving: boolean; message: string; error: string; onChange: (value: ModelProfileFormValue) => void; onSubmit: (event: FormEvent) => void; onCancel: () => void }
export const emptyModelProfileForm: ModelProfileFormValue = { name: '我的模型', provider: 'openai-compatible', model: '', baseUrl: 'https://api.openai.com/v1', apiKey: '' }

export function ModelProfileForm({ value, editing, saving, message, error, onChange, onSubmit, onCancel }: Props) {
  return <form className="settings-form" onSubmit={onSubmit}>
    <label>配置名称<input value={value.name} onChange={event => onChange({ ...value, name: event.target.value })} required /></label>
    <label>接口类型<select value={value.provider} onChange={event => onChange({ ...value, provider: event.target.value as ModelProfileFormValue['provider'] })}><option value="openai">OpenAI</option><option value="openai-compatible">OpenAI-compatible</option></select></label>
    <label>Base URL<input type="url" value={value.baseUrl} onChange={event => onChange({ ...value, baseUrl: event.target.value })} required /></label>
    <label>模型名称<input value={value.model} onChange={event => onChange({ ...value, model: event.target.value })} placeholder="例如：deepseek-v4-pro" required /></label>
    <label>API Key<input type="password" value={value.apiKey} onChange={event => onChange({ ...value, apiKey: event.target.value })} minLength={value.apiKey ? 8 : undefined} required={!editing} placeholder={editing ? `留空则继续使用 ${editing.apiKeyHint}` : '输入模型服务商 API Key'} /></label>
    {editing && <p className="form-hint">正在编辑“{editing.name}”。API Key 留空时不会修改现有密钥。</p>}
    {message && <div className="notice success"><Check />{message}</div>}{error && <div className="notice error">{error}</div>}
    <div className="settings-form-actions">{editing && <button type="button" className="button" onClick={onCancel}>取消编辑</button>}<button className="button primary" disabled={saving}>{saving ? <SpinnerGap className="spin" /> : editing ? '保存修改' : '保存配置'}</button></div>
  </form>
}
