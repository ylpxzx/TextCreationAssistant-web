import type { GenerationReference, GenerationUsage, ModelProfile } from '../../types/domain'
import { streamSse } from '../client/sse'
import { modelsApi } from './models'
type GenerateInput = { projectId: string; chapterId: string; chapterVersion: number; instruction: string; mode?: 'writing' | 'question'; selectedText?: string; cursorContext?: string }
export const generationsApi = {
  async streamGenerate(input: GenerateInput, onDelta: (text: string) => void, signal?: AbortSignal): Promise<GenerationUsage | undefined> {
    const profiles = await modelsApi.modelProfiles(); const profile: ModelProfile | undefined = profiles.find(item => item.isDefault) || profiles[0]
    if (!profile) throw new Error('请先在模型设置中添加并测试一个模型配置')
    let usage: GenerationUsage | undefined
    let references: GenerationReference[] = []
    await streamSse('/v1/ai/generations:stream', { operation: input.mode === 'question' ? 'question' : input.selectedText?.trim() ? 'rewrite' : 'completion', projectId: input.projectId, chapterId: input.chapterId, chapterVersion: input.chapterVersion, modelProfileId: profile.id, instruction: input.instruction, selectedText: input.selectedText || '', cursorContext: input.cursorContext || '', maxOutputTokens: 2048, temperature: 0.8 }, event => {
      if (event.event === 'generation.delta') onDelta(event.text)
      if (event.event === 'generation.context') references = event.items
      if (event.event === 'generation.usage') usage = { model: profile.model, inputTokens: event.inputTokens, outputTokens: event.outputTokens, totalTokens: event.totalTokens, references }
    }, signal)
    return usage
  },
}
