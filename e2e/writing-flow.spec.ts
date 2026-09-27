import { expect, test, type Page, type Route } from '@playwright/test'

const now = '2026-09-25T00:00:00.000Z'
const user = { id: 'user-1', email: 'writer@example.com' }
const project = { id: 'project-1', title: '雾港拾遗', idea: '退潮后收到旧信。', genres: ['悬疑'], lengthType: '中长篇', styles: ['克制'], totalWords: 5, updatedAt: now, archivedAt: null }
const chapter = { id: 'chapter-1', projectId: project.id, title: '第一章 潮声', contentJson: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: '潮水正在上涨。' }] }] }, plainText: '潮水正在上涨。', wordCount: 8, version: 1, status: 'writing', orderIndex: 0, updatedAt: now }

async function json(route: Route, body: unknown, status = 200) {
  await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
}

async function mockBackend(page: Page, options: { projects?: typeof project[] } = {}) {
  let authenticated = false
  let projects = options.projects || [project]
  let chapters = options.projects?.length === 0 ? [] : [chapter]
  await page.route('http://localhost:3000/**', async route => {
    const request = route.request(); const url = new URL(request.url()); const path = url.pathname
    if (path === '/v1/auth/me') return authenticated ? json(route, { user }) : json(route, { error: { message: '未登录' } }, 401)
    if (path === '/v1/auth/login') { authenticated = true; return json(route, { user }) }
    if (path === '/v1/projects' && request.method() === 'GET') return json(route, projects)
    if (path === '/v1/projects' && request.method() === 'POST') { const input = request.postDataJSON(); projects = [{ ...project, title: input.title, idea: input.idea, genres: input.genres, lengthType: input.lengthType, styles: input.styles, totalWords: 0 }]; chapters = []; return json(route, projects[0]) }
    if (path === `/v1/projects/${project.id}`) return json(route, { ...projects[0], chapters })
    if (path === `/v1/projects/${project.id}/resources`) return json(route, [])
    if (path === `/v1/projects/${project.id}/chapters` && request.method() === 'POST') { chapters = [{ ...chapter, title: '未命名章节', plainText: '', wordCount: 0, contentJson: { type: 'doc', content: [{ type: 'paragraph' }] } }]; return json(route, chapters[0]) }
    if (path === '/v1/model-profiles') return json(route, [{ id: 'model-1', name: '测试模型', provider: 'openai-compatible', model: 'mock-model', baseUrl: 'https://example.com/v1', apiKeyHint: '****1234', isDefault: true, createdAt: now, updatedAt: now }])
    if (path === '/v1/ai/generations:stream') {
      const generationId = '11111111-1111-4111-8111-111111111111'
      const events = [
        ['generation.start', { event: 'generation.start', generationId, sequence: 0, model: 'mock-model' }],
        ['generation.context', { event: 'generation.context', generationId, sequence: 1, items: [{ sourceType: 'project', sourceId: project.id, label: '作品构想' }] }],
        ['generation.delta', { event: 'generation.delta', generationId, sequence: 2, text: '雾中的灯塔忽然亮了。' }],
        ['generation.usage', { event: 'generation.usage', generationId, sequence: 3, inputTokens: 24, outputTokens: 10, totalTokens: 34 }],
        ['generation.done', { event: 'generation.done', generationId, sequence: 4, finishReason: 'stop', outputCharacters: 11 }],
      ].map(([event, data]) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`).join('')
      return route.fulfill({ status: 200, contentType: 'text/event-stream', body: events })
    }
    if (path === `/v1/chapters/${chapter.id}` && request.method() === 'PATCH') return json(route, { ...chapters[0], ...request.postDataJSON(), version: 2 })
    return json(route, { error: { message: `未模拟接口：${request.method()} ${path}` } }, 404)
  })
}

async function login(page: Page) {
  await page.goto('/')
  await page.getByRole('button', { name: '登录' }).click()
  await expect(page.getByRole('heading', { name: '我的作品' })).toBeVisible()
}

test('登录后可以进入作品并开始写作', async ({ page }) => {
  await mockBackend(page)
  await login(page)
  await page.getByRole('heading', { name: project.title }).click()
  await expect(page.locator('.chapter-title')).toHaveValue(chapter.title)
  await expect(page.locator('.prose-editor')).toContainText('潮水正在上涨。')
})

test('新建作品后可以创建章节并接受 AI 续写', async ({ page }) => {
  await mockBackend(page, { projects: [] })
  await login(page)
  await page.getByRole('button', { name: '新建', exact: true }).click()
  await page.getByRole('textbox', { name: '作品名称' }).fill('雾港拾遗')
  await page.getByRole('button', { name: '创建作品' }).click()
  await page.locator('.chapter-head button').click()
  await expect(page.locator('.chapter-title')).toHaveValue('未命名章节')
  await page.getByPlaceholder('告诉 AI 接下来怎么写').fill('继续写一段有悬念的内容')
  await page.getByRole('button', { name: '发送给 AI' }).click()
  await expect(page.getByText('雾中的灯塔忽然亮了。')).toBeVisible()
  await expect(page.getByText('作品构想', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: /接受/ }).click()
  await expect(page.locator('.prose-editor')).toContainText('雾中的灯塔忽然亮了。')
})
