import type { AiTasteScan, CreativeSearchResult, CreativeState } from '../../types/domain'
import { apiUrl, responseError } from '../client/http'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(apiUrl(path), { credentials: 'include', headers: { 'Content-Type': 'application/json', ...init?.headers }, ...init })
  if (!response.ok) throw await responseError(response)
  return response.json() as Promise<T>
}
export const creativeIntelligenceApi = {
  creativeState: (projectId: string) => request<CreativeState>(`/v1/projects/${projectId}/creative-intelligence`),
  saveCreativeState: (projectId: string, data: CreativeState) => request<CreativeState>(`/v1/projects/${projectId}/creative-intelligence`, { method: 'PUT', body: JSON.stringify(data) }),
  scanAiTaste: (projectId: string, chapterId: string) => request<AiTasteScan>(`/v1/projects/${projectId}/creative-intelligence/scan`, { method: 'POST', body: JSON.stringify({ chapterId }) }),
  creativeSearch: (projectId: string, q: string) => request<CreativeSearchResult[]>(`/v1/projects/${projectId}/creative-intelligence/search?q=${encodeURIComponent(q)}`),
}
