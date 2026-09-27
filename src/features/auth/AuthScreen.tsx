import { useState, type FormEvent } from 'react'
import { SpinnerGap } from '@phosphor-icons/react'
import { BrandMark } from '../../shared/components/BrandMark'
import { api } from '../../services/api'

type AuthScreenProps = { onReady: () => void }

export function AuthScreen({ onReady }: AuthScreenProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('writer@example.com')
  const [password, setPassword] = useState('ChangeMe123!')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError('')
    try {
      if (mode === 'login') await api.login(email, password)
      else await api.register(email, password)
      onReady()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '操作失败')
    } finally {
      setLoading(false)
    }
  }

  return <main className="auth-shell">
    <section className="auth-note">
      <BrandMark />
      <blockquote>故事不是从第一句话开始，而是从你决定把它写下来的那一刻开始。</blockquote>
      <p>把大纲、角色、伏笔和正文放在同一个安静的空间里。</p>
    </section>
    <form className="auth-card" onSubmit={submit}>
      <div className="eyebrow">PERSONAL WRITING SPACE</div>
      <h1>{mode === 'login' ? '继续你的故事' : '建立创作空间'}</h1>
      <label>邮箱<input type="email" value={email} onChange={event => setEmail(event.target.value)} required /></label>
      <label>密码<input type="password" value={password} onChange={event => setPassword(event.target.value)} minLength={8} required /></label>
      {error && <div className="notice error">{error}</div>}
      <button className="button primary" disabled={loading}>{loading ? <SpinnerGap className="spin" /> : mode === 'login' ? '登录' : '创建账户'}</button>
      <button type="button" className="text-button" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>{mode === 'login' ? '第一次使用？创建账户' : '已有账户？返回登录'}</button>
    </form>
  </main>
}
