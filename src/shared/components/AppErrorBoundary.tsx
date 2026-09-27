import { Component, type ErrorInfo, type ReactNode } from 'react'
import { WarningCircle } from '@phosphor-icons/react'

export class AppErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('Page rendering failed', error, info.componentStack) }
  render() {
    if (!this.state.failed) return this.props.children
    return <main className="page-error"><WarningCircle weight="duotone" /><h1>页面暂时无法显示</h1><p>你的本地草稿仍保存在浏览器中。可以重新加载页面后继续。</p><button className="button primary" onClick={() => window.location.reload()}>重新加载</button></main>
  }
}
