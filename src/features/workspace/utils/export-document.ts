import type { Chapter, Project } from '../../../types/domain'

type ExportChapter = Pick<Chapter, 'title' | 'plainText'>

const clean = (value: string) => value.trim().replace(/\r\n?/g, '\n')

export function chapterAsTxt(chapter: ExportChapter) {
  const body = clean(chapter.plainText)
  return `${clean(chapter.title) || '未命名章节'}${body ? `\n\n${body}` : ''}\n`
}

export function projectAsTxt(project: Pick<Project, 'title'>, chapters: ExportChapter[]) {
  const content = chapters.map(chapterAsTxt).join('\n')
  return `${clean(project.title) || '未命名作品'}${content ? `\n\n${content.trimEnd()}` : ''}\n`
}

export function projectAsMarkdown(project: Pick<Project, 'title'>, chapters: ExportChapter[]) {
  const title = clean(project.title) || '未命名作品'
  const content = chapters.map(chapter => {
    const chapterTitle = clean(chapter.title) || '未命名章节'
    const body = clean(chapter.plainText)
    return `## ${chapterTitle}${body ? `\n\n${body}` : ''}`
  }).join('\n\n')
  return `# ${title}${content ? `\n\n${content}` : ''}\n`
}

export function safeFileName(value: string) {
  const name = value.trim().replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_').replace(/[. ]+$/g, '')
  return name || '未命名作品'
}

export function downloadTextFile(fileName: string, content: string, mimeType: string) {
  const blob = new Blob(['\uFEFF', content], { type: `${mimeType};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  anchor.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}
