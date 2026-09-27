import { ArrowsOutLineHorizontal, TextAa } from '@phosphor-icons/react'
import { editorFontSizes, editorWidthMax, editorWidthMin, editorWidthStep, type EditorFontSize, type EditorWidth } from '../hooks/useEditorDisplayPreferences'

type EditorDisplayControlsProps = {
  fontSize: EditorFontSize
  width: EditorWidth
  onFontSizeChange: (value: EditorFontSize) => void
  onWidthChange: (value: EditorWidth) => void
}

export function EditorDisplayControls({ fontSize, width, onFontSizeChange, onWidthChange }: EditorDisplayControlsProps) {
  return <div className="editor-display-controls" aria-label="编辑器显示设置">
    <label title="正文字号"><TextAa aria-hidden="true"/><select aria-label="正文字号" value={fontSize} onChange={event => onFontSizeChange(Number(event.target.value) as EditorFontSize)}>{editorFontSizes.map(value => <option value={value} key={value}>{value}px</option>)}</select></label>
    <label className="editor-width-control" title="正文宽度"><ArrowsOutLineHorizontal aria-hidden="true"/><input type="range" aria-label="正文宽度" min={editorWidthMin} max={editorWidthMax} step={editorWidthStep} value={width} onChange={event => onWidthChange(Number(event.target.value))}/><output>{width}%</output></label>
  </div>
}
