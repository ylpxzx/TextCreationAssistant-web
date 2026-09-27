import { DownloadSimple } from '@phosphor-icons/react'

type ExportMenuProps = {
  disabled: boolean
  onChapterTxt: () => void
  onProjectTxt: () => void
  onProjectMarkdown: () => void
}

export function ExportMenu({ disabled, onChapterTxt, onProjectTxt, onProjectMarkdown }: ExportMenuProps) {
  return <details className="export-menu">
    <summary aria-label="导出作品"><DownloadSimple /><span>导出</span></summary>
    <div className="export-menu-popover">
      <button disabled={disabled} onClick={onChapterTxt}><strong>当前章节</strong><span>纯文本 .txt</span></button>
      <button onClick={onProjectTxt}><strong>整部作品</strong><span>纯文本 .txt</span></button>
      <button onClick={onProjectMarkdown}><strong>整部作品</strong><span>Markdown .md</span></button>
    </div>
  </details>
}
