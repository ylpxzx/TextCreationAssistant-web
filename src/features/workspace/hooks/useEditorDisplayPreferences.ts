import { useState } from 'react'

export const editorFontSizes = [14, 16, 18, 20, 22] as const
export const editorWidthMin = 55
export const editorWidthMax = 100
export const editorWidthStep = 5
export type EditorFontSize = (typeof editorFontSizes)[number]
export type EditorWidth = number

const storageKey = 'moyin.editor-display'
const defaults = { fontSize: 16 as EditorFontSize, width: 75 as EditorWidth }
const legacyWidths = new Map([[620, 60], [760, 75], [900, 90], [1040, 100]])

function normalizeWidth(value: unknown): EditorWidth {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return defaults.width
  const width = legacyWidths.get(parsed) ?? parsed
  const steppedWidth = Math.round(width / editorWidthStep) * editorWidthStep
  return Math.min(editorWidthMax, Math.max(editorWidthMin, steppedWidth))
}

function readPreferences() {
  try {
    const value = JSON.parse(localStorage.getItem(storageKey) || '{}') as Partial<typeof defaults>
    return {
      fontSize: editorFontSizes.includes(value.fontSize as EditorFontSize) ? value.fontSize as EditorFontSize : defaults.fontSize,
      width: normalizeWidth(value.width),
    }
  } catch {
    return defaults
  }
}

export function useEditorDisplayPreferences() {
  const [preferences, setPreferences] = useState(readPreferences)
  const update = (next: Partial<typeof preferences>) => {
    setPreferences(current => {
      const value = { ...current, ...next }
      localStorage.setItem(storageKey, JSON.stringify(value))
      return value
    })
  }
  return { ...preferences, setFontSize: (fontSize: EditorFontSize) => update({ fontSize }), setWidth: (width: EditorWidth) => update({ width }) }
}
