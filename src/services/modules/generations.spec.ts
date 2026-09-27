import { beforeEach, describe, expect, it, vi } from 'vitest'
import { streamSse } from '../client/sse'
import { modelsApi } from './models'
import { generationsApi } from './generations'

vi.mock('../client/sse', () => ({ streamSse: vi.fn() }))
vi.mock('./models', () => ({ modelsApi: { modelProfiles: vi.fn() } }))

const profiles = [
  { id: 'profile-1', name: '备用', provider: 'openai-compatible' as const, model: 'model-a', baseUrl: 'https://example.com/v1', apiKeyHint: '••••1234', isDefault: false, createdAt: '', updatedAt: '' },
  { id: 'profile-2', name: '默认', provider: 'openai' as const, model: 'model-b', baseUrl: 'https://api.openai.com/v1', apiKeyHint: '••••5678', isDefault: true, createdAt: '', updatedAt: '' },
]

describe('generationsApi.streamGenerate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(modelsApi.modelProfiles).mockResolvedValue(profiles)
  })

  it('uses the default profile and streams completion deltas and usage', async () => {
    const onDelta = vi.fn()
    vi.mocked(streamSse).mockImplementation(async (_path, _body, onEvent) => {
      onEvent({ event: 'generation.delta', generationId: 'generation-1', sequence: 1, text: '潮水上涨。' })
      onEvent({ event: 'generation.context', generationId: 'generation-1', sequence: 2, items: [{ sourceType: 'project', sourceId: 'project-1', label: '作品构想' }] })
      onEvent({ event: 'generation.usage', generationId: 'generation-1', sequence: 3, inputTokens: 20, outputTokens: 6, totalTokens: 26 })
    })
    const usage = await generationsApi.streamGenerate({ projectId: 'project-1', chapterId: 'chapter-1', chapterVersion: 3, instruction: '继续写', cursorContext: '上一段' }, onDelta)
    expect(onDelta).toHaveBeenCalledWith('潮水上涨。')
    expect(streamSse).toHaveBeenCalledWith('/v1/ai/generations:stream', expect.objectContaining({ operation: 'completion', modelProfileId: 'profile-2', chapterVersion: 3 }), expect.any(Function), undefined)
    expect(usage).toEqual({ model: 'model-b', inputTokens: 20, outputTokens: 6, totalTokens: 26, references: [{ sourceType: 'project', sourceId: 'project-1', label: '作品构想' }] })
  })

  it('switches to rewrite when selected text is provided', async () => {
    vi.mocked(streamSse).mockResolvedValue(undefined)
    await generationsApi.streamGenerate({ projectId: 'project-1', chapterId: 'chapter-1', chapterVersion: 3, instruction: '写得悲伤一些', selectedText: '他离开了。' }, vi.fn())
    expect(streamSse).toHaveBeenCalledWith('/v1/ai/generations:stream', expect.objectContaining({ operation: 'rewrite', selectedText: '他离开了。' }), expect.any(Function), undefined)
  })

  it('requires a configured model before generation', async () => {
    vi.mocked(modelsApi.modelProfiles).mockResolvedValue([])
    await expect(generationsApi.streamGenerate({ projectId: 'project-1', chapterId: 'chapter-1', chapterVersion: 1, instruction: '继续写' }, vi.fn())).rejects.toThrow('请先在模型设置中添加并测试一个模型配置')
    expect(streamSse).not.toHaveBeenCalled()
  })
})
