export type Project = {
  id: string
  title: string
  idea: string
  genres: string[]
  lengthType: string
  style: string[]
  totalWords: number
  updatedAt: string
  archivedAt?: string | null
}

export type Chapter = {
  id: string
  projectId: string
  title: string
  contentJson: Record<string, unknown>
  plainText: string
  wordCount: number
  version: number
  status: 'draft' | 'writing' | 'done'
  orderIndex: number
  updatedAt: string
}

export type KnowledgeItem = {
  id: string
  name: string
  content: string
  useInAi: boolean
}

export type ResourceGroup = {
  id: string
  projectId: string
  name: string
  useInAi: boolean
  items: KnowledgeItem[]
}

export type Workspace = {
  project: Project
  chapters: Chapter[]
  resourceGroups: ResourceGroup[]
}

export type ModelProfile = {
  id: string
  name: string
  provider: 'openai' | 'openai-compatible'
  model: string
  baseUrl: string
  apiKeyHint: string
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

export type GenerationUsage = {
  model: string
  inputTokens: number
  outputTokens: number
  totalTokens: number
  references: GenerationReference[]
}

export type GenerationReference = { sourceType: string; sourceId?: string; label: string }

export type BookOutlineItem = { stage: string; content: string }
export type BookCharacter = { name: string; role: string; traits: string[]; relationships: string[] }
export type BookStoryStage = { stage: string; events: string[]; causality: string }
export type BookChapterAnalysis = { chapter: string; summary: string; turningPoint: string; characterChanges: string[] }
export type OriginalChapterPlan = { chapter: string; goal: string; conflict: string; hook: string }
export type BookAnalysisResult = {
  sourceAnalysis: { summary: string; themes: string[]; outline: BookOutlineItem[]; characters: BookCharacter[]; storyline: BookStoryStage[]; chapters: BookChapterAnalysis[] }
  originalPlan: { title: string; positioning: string; corePremise: string; outline: BookOutlineItem[]; characters: BookCharacter[]; storyline: BookStoryStage[]; chapterPlan: OriginalChapterPlan[]; differentiation: string[]; riskCheck: string[] }
}
export type SourceBookAnalysis = BookAnalysisResult['sourceAnalysis']
export type OriginalBookPlan = BookAnalysisResult['originalPlan']
export type BookAnalysisSummary = { id: string; filename: string; title: string; characterCount: number; model: string; createdAt: string; updatedAt: string }
export type BookAnalysisResponse = BookAnalysisSummary & { result: BookAnalysisResult }

export type ChapterRevisionSummary = {
  id: string
  chapterId: string
  version: number
  title: string
  wordCount: number
  excerpt: string
  createdAt: string
}

export type ChapterRevision = Omit<ChapterRevisionSummary, 'excerpt'> & {
  contentJson: Record<string, unknown>
  plainText: string
}

export type CreativeState = {
  styleProfile: { summary: string; preferredPatterns: string[]; bannedPatterns: string[] }
  characterVoices: Array<{ id: string; name: string; description: string; catchphrases: string[]; bannedPatterns: string[] }>
  sceneCards: Array<{ id: string; chapterId: string; goal: string; conflict: string; characters: string[]; location: string; requiredEvents: string[]; forbiddenReveals: string[]; emotionalArc: string; targetWords: number; hook: string; beats: string[] }>
  editMarks: Array<{ id: string; chapterId: string; excerpt: string; kind: string; note: string; resolved: boolean; createdAt: string }>
  branches: Array<{ id: string; name: string; description: string; chapterId: string; content: string; createdAt: string }>
  stateSuggestions: Array<{ id: string; chapterId: string; category: string; subject: string; before: string; after: string; status: 'pending' | 'accepted' | 'rejected' }>
  consistencyIssues: Array<{ id: string; chapterId?: string; severity: 'certain' | 'possible' | 'notice'; title: string; description: string; evidence: string[]; status: 'open' | 'ignored' | 'resolved' }>
}
export type AiTasteScan = { score: number; findings: Array<{ kind: string; label: string; excerpt: string; offset: number }> }
export type CreativeSearchResult = { type: 'chapter' | 'resource'; id: string; title: string; excerpt: string }
