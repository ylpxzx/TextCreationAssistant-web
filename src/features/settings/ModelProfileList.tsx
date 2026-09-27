import { PencilSimple, Plug, Robot, Trash } from '@phosphor-icons/react'
import type { ModelProfile } from '../../types/domain'

type Props = { profiles: ModelProfile[]; busyId: string; onEdit: (profile: ModelProfile) => void; onTest: (profile: ModelProfile) => void; onMakeDefault: (profile: ModelProfile) => void; onRemove: (profile: ModelProfile) => void }

export function ModelProfileList({ profiles, busyId, onEdit, onTest, onMakeDefault, onRemove }: Props) {
  return <aside><h2>已有配置</h2>{profiles.length === 0 ? <p className="muted">尚未添加模型。</p> : profiles.map(profile => <div className="profile-row" key={profile.id}><Robot size={22} /><div className="profile-summary"><strong>{profile.name}{profile.isDefault && <small>默认</small>}</strong><span>{profile.model} · {profile.apiKeyHint}</span><div className="profile-actions"><button type="button" onClick={() => onEdit(profile)} disabled={Boolean(busyId)}><PencilSimple />编辑</button><button type="button" onClick={() => onTest(profile)} disabled={Boolean(busyId)}><Plug />测试</button>{!profile.isDefault && <button type="button" onClick={() => onMakeDefault(profile)} disabled={Boolean(busyId)}>设为默认</button>}<button type="button" className="danger" onClick={() => onRemove(profile)} disabled={Boolean(busyId)}><Trash />删除</button></div></div></div>)}</aside>
}
