import type { BookAnalysisResponse, BookAnalysisSummary, GeneratedShortStory } from '../../types/domain'
import { apiUrl, responseError } from '../client/http'

export const bookAnalysesApi = {
  async analyzeBook(file: File) {
    const body = new FormData()
    body.append('file', file)
    const response = await fetch(apiUrl('/v1/book-analyses'), { method: 'POST', credentials: 'include', body })
    if (!response.ok) throw await responseError(response)
    return response.json() as Promise<BookAnalysisResponse>
  },
  async bookAnalyses() {
    const response = await fetch(apiUrl('/v1/book-analyses'), { credentials: 'include' })
    if (!response.ok) throw await responseError(response)
    return response.json() as Promise<BookAnalysisSummary[]>
  },
  async bookAnalysis(id: string) {
    const response = await fetch(apiUrl(`/v1/book-analyses/${id}`), { credentials: 'include' })
    if (!response.ok) throw await responseError(response)
    return response.json() as Promise<BookAnalysisResponse>
  },
  async regenerateOriginalPlan(id: string) {
    const response = await fetch(apiUrl(`/v1/book-analyses/${id}/originalize`), { method: 'POST', credentials: 'include' })
    if (!response.ok) throw await responseError(response)
    return response.json() as Promise<BookAnalysisResponse>
  },
  async deleteBookAnalysis(id: string) {
    const response = await fetch(apiUrl(`/v1/book-analyses/${id}`), { method: 'DELETE', credentials: 'include' })
    if (!response.ok) throw await responseError(response)
  },
  async createShortStory(id: string, chapterIndexes: number[], targetWords: number) {
    const response = await fetch(apiUrl(`/v1/book-analyses/${id}/short-stories`), { method: 'POST', credentials: 'include', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ chapterIndexes, targetWords }) })
    if (!response.ok) throw await responseError(response)
    return response.json() as Promise<GeneratedShortStory>
  },
}
