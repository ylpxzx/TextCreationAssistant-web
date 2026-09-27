import { create } from 'zustand'
import { api } from '../../services/api'
import type { BookAnalysisResponse } from '../../types/domain'

type TaskStatus = 'idle' | 'running' | 'completed' | 'failed'

type BookAnalysisTask = {
  status: TaskStatus
  filename: string
  progress: number
  stage: string
  result: BookAnalysisResponse | null
  error: string
  start: (file: File) => Promise<void>
  reset: () => void
}

let progressTimer: ReturnType<typeof setInterval> | undefined

function stopProgress() {
  if (progressTimer) clearInterval(progressTimer)
  progressTimer = undefined
}

function stageFor(progress: number) {
  if (progress < 24) return '正在读取并整理书籍内容'
  if (progress < 48) return '正在分析大纲与章节结构'
  if (progress < 70) return '正在梳理角色关系与故事线'
  return '正在生成原创转化方案'
}

export const useBookAnalysisTask = create<BookAnalysisTask>((set, get) => ({
  status: 'idle',
  filename: '',
  progress: 0,
  stage: '',
  result: null,
  error: '',
  async start(file) {
    if (get().status === 'running') return
    stopProgress()
    set({ status: 'running', filename: file.name, progress: 4, stage: stageFor(4), result: null, error: '' })
    progressTimer = setInterval(() => {
      const current = get()
      if (current.status !== 'running') return stopProgress()
      const increment = current.progress < 35 ? 4 : current.progress < 70 ? 2 : 1
      const progress = Math.min(92, current.progress + increment)
      set({ progress, stage: stageFor(progress) })
    }, 1200)
    try {
      const result = await api.analyzeBook(file)
      stopProgress()
      set({ status: 'completed', progress: 100, stage: '拆解完成', result, error: '' })
    } catch (cause) {
      stopProgress()
      set({ status: 'failed', progress: 0, stage: '', error: cause instanceof Error ? cause.message : '拆书失败，请稍后重试。' })
    }
  },
  reset() {
    if (get().status === 'running') return
    stopProgress()
    set({ status: 'idle', filename: '', progress: 0, stage: '', result: null, error: '' })
  },
}))
