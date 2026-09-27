import { authApi } from './modules/auth'
import { chaptersApi } from './modules/chapters'
import { generationsApi } from './modules/generations'
import { modelsApi } from './modules/models'
import { projectsApi } from './modules/projects'
import { resourcesApi } from './modules/resources'
import { bookAnalysesApi } from './modules/book-analyses'
import { creativeIntelligenceApi } from './modules/creative-intelligence'
export const api = { ...authApi, ...projectsApi, ...chaptersApi, ...resourcesApi, ...modelsApi, ...generationsApi, ...bookAnalysesApi, ...creativeIntelligenceApi }
