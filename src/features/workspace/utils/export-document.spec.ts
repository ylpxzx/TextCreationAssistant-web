import { describe, expect, it } from 'vitest'
import { chapterAsTxt, projectAsMarkdown, projectAsTxt, safeFileName } from './export-document'

const chapters = [
  { title: '第一章 潮声', plainText: '潮水漫过石阶。' },
  { title: '第二章 空港', plainText: '  港口无人。\r\n风铃却响了。  ' },
]

describe('workspace export formatters', () => {
  it('exports a chapter and a complete work as readable plain text', () => {
    expect(chapterAsTxt(chapters[0]!)).toBe('第一章 潮声\n\n潮水漫过石阶。\n')
    expect(projectAsTxt({ title: '雾港拾遗' }, chapters)).toContain('雾港拾遗\n\n第一章 潮声')
    expect(projectAsTxt({ title: '雾港拾遗' }, chapters)).toContain('第二章 空港\n\n港口无人。\n风铃却响了。')
  })

  it('uses heading levels in Markdown and sanitizes download names', () => {
    expect(projectAsMarkdown({ title: '雾港拾遗' }, chapters)).toContain('# 雾港拾遗\n\n## 第一章 潮声')
    expect(safeFileName(' 雾港:拾遗?. ')).toBe('雾港_拾遗_')
  })
})
