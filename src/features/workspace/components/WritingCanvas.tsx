import { useLayoutEffect, useRef, useState, type CSSProperties, type Dispatch, type SetStateAction } from "react";
import { EditorContent, type Editor } from "@tiptap/react";
import {
  ArrowLeft,
  Clock,
  ClockCounterClockwise,
  ChatCircleText,
  Info,
  ListBullets,
  Sparkle,
  PenNib,
  Trash,
  X,
} from "@phosphor-icons/react";
import type {
  Chapter,
  GenerationUsage,
  Workspace,
} from "../../../types/domain";
import { useEditorDisplayPreferences } from "../hooks/useEditorDisplayPreferences";
import { EditorDisplayControls } from "./EditorDisplayControls";
import type { AiInteractionMode } from "../hooks/useChapterEditor";

type WritingCanvasProps = {
  data: Workspace;
  active?: Chapter;
  chapterId: string;
  editor: Editor | null;
  wordCount: number;
  aiMode: AiInteractionMode;
  suggestion: string;
  instruction: string;
  generating: boolean;
  generationError: string;
  usage: GenerationUsage | null;
  selectedPassage: { text: string } | null;
  rewriteRange: { from: number; to: number } | null;
  leftOpen: boolean;
  setData: Dispatch<SetStateAction<Workspace | null>>;
  setInstruction: (value: string) => void;
  setAiMode: (mode: AiInteractionMode) => void;
  onTitleSave: (title: string) => void;
  onStatusChange: (status: Chapter["status"]) => void;
  onDelete: () => void;
  onHistory: () => void;
  onGenerate: () => void;
  onStop: () => void;
  onAccept: () => void;
  onDiscard: () => void;
  onStashAndRegenerate: () => void;
  onLeftOpen: () => void;
};

export function WritingCanvas(props: WritingCanvasProps) {
  const {
    data,
    active,
    chapterId,
    editor,
    wordCount,
    aiMode,
    suggestion,
    instruction,
    generating,
    generationError,
    usage,
    selectedPassage,
    rewriteRange,
    leftOpen,
    setData,
    setInstruction,
    setAiMode,
    onTitleSave,
    onStatusChange,
    onDelete,
    onHistory,
    onGenerate,
    onStop,
    onAccept,
    onDiscard,
    onStashAndRegenerate,
    onLeftOpen,
  } = props;
  const chapterNumber = String(
    Math.max(
      1,
      data.chapters.findIndex((chapter) => chapter.id === chapterId) + 1,
    ),
  ).padStart(2, "0");
  const display = useEditorDisplayPreferences();
  const editorShellRef = useRef<HTMLDivElement>(null);
  const suggestionRef = useRef<HTMLDivElement>(null);
  const [suggestionTop, setSuggestionTop] = useState<number | null>(null);
  useLayoutEffect(() => {
    setSuggestionTop(null);
    if (!suggestion || !rewriteRange || !editor?.view || !editorShellRef.current) return;
    const docSize = editor.state.doc.content.size;
    const anchorPosition = Math.max(1, Math.min(docSize - 1, rewriteRange.to - 1));
    const position = editor.view.domAtPos(anchorPosition);
    const origin = position.node.nodeType === Node.TEXT_NODE ? position.node.parentElement : position.node as HTMLElement;
    let block = origin?.closest?.("p,h1,h2,h3,blockquote,li,pre") as HTMLElement | null;
    if (!block) {
      const fallbackPosition = editor.view.domAtPos(Math.max(1, Math.min(docSize - 1, rewriteRange.from)));
      const fallbackOrigin = fallbackPosition.node.nodeType === Node.TEXT_NODE ? fallbackPosition.node.parentElement : fallbackPosition.node as HTMLElement;
      block = fallbackOrigin?.closest?.("p,h1,h2,h3,blockquote,li,pre") as HTMLElement | null;
    }
    if (!block) return;
    const previousMargin = block.style.marginBottom;
    const currentMargin = Number.parseFloat(getComputedStyle(block).marginBottom) || 0;
    const previewHeight = suggestionRef.current?.offsetHeight || 150;
    block.style.marginBottom = `${currentMargin + previewHeight + 18}px`;
    const shellRect = editorShellRef.current.getBoundingClientRect();
    const blockRect = block.getBoundingClientRect();
    setSuggestionTop(blockRect.bottom - shellRect.top + 8);
    return () => { block.style.marginBottom = previousMargin; };
  }, [editor, rewriteRange, suggestion, generating]);
  const documentStyle = {
    "--editor-width": `${display.width}%`,
    "--editor-font-size": `${display.fontSize}px`,
  } as CSSProperties;
  return (
    <section className="writing-area">
      {!leftOpen && (
        <button className="floating-toggle left" onClick={onLeftOpen}>
          <ListBullets />
        </button>
      )}
      {active ? (
        <div className="document" style={documentStyle}>
          <div className="chapter-kicker">CHAPTER {chapterNumber}</div>
          <input
            className="chapter-title"
            value={active.title}
            onChange={(event) =>
              setData((current) =>
                current
                  ? {
                      ...current,
                      chapters: current.chapters.map((chapter) =>
                        chapter.id === chapterId
                          ? { ...chapter, title: event.target.value }
                          : chapter,
                      ),
                    }
                  : current,
              )
            }
            onBlur={(event) => onTitleSave(event.target.value)}
            placeholder="章节标题"
          />
          <div className="document-meta">
            <span>{wordCount} 字</span>
            <span>
              <Clock />
              预计阅读 {Math.max(1, Math.ceil(wordCount / 400))} 分钟
            </span>
            <label className="chapter-status">
              <span className={`status-dot ${active.status}`} />
              <select
                value={active.status}
                onChange={(event) =>
                  onStatusChange(event.target.value as Chapter["status"])
                }
                aria-label="章节状态"
              >
                <option value="draft">草稿</option>
                <option value="writing">写作中</option>
                <option value="done">已完成</option>
              </select>
            </label>
            <EditorDisplayControls
              fontSize={display.fontSize}
              width={display.width}
              onFontSizeChange={display.setFontSize}
              onWidthChange={display.setWidth}
            />
            <div className="document-meta-spacer" />
            <div className="chapter-actions">
              <button className="chapter-history" onClick={onHistory} aria-label="章节历史" title="章节历史"><ClockCounterClockwise /></button>
              <button className="chapter-delete" onClick={onDelete} aria-label="删除章节" title="删除章节"><Trash /></button>
            </div>
          </div>
          <div className={`editor-content-shell${suggestion ? " has-suggestion" : ""}`} ref={editorShellRef}>
            <EditorContent editor={editor} />
            {suggestion && (
            <div ref={suggestionRef} className={`editor-suggestion-inline${aiMode === "question" ? " question" : ""}${rewriteRange && suggestionTop !== null ? " anchored" : ""}`} style={rewriteRange && suggestionTop !== null ? { top: suggestionTop } : undefined} aria-label={aiMode === "question" ? "AI 问答内容" : "AI 生成内容预览"}>
              <div className="editor-suggestion-header">
                <span>{aiMode === "question" ? <ChatCircleText weight="fill" /> : <Sparkle weight="fill" />}{generating ? "生成中…" : aiMode === "question" ? "AI 创作解答" : rewriteRange ? "AI 改写预览" : "AI 续写预览"}</span>
              </div>
              <p>{suggestion}</p>
              {usage?.references.length ? (
                <div className="generation-references">
                  <span>本次参考</span>
                  {usage.references.map((reference) => (
                    <span className="generation-reference" key={`${reference.sourceType}-${reference.sourceId || reference.label}`}>{reference.label}</span>
                  ))}
                </div>
              ) : null}
              <div className="editor-suggestion-actions">
                {aiMode === "writing" && <button className="keep" onClick={onAccept} disabled={generating}>保留</button>}
                <button onClick={onDiscard}>{aiMode === "question" ? "关闭回答" : "丢弃"}</button>
                {aiMode === "writing" && <button onClick={onStashAndRegenerate} disabled={generating}>暂存并再生成</button>}
                <button onClick={onGenerate} disabled={generating}>{aiMode === "question" ? "重新回答" : "重新生成"}</button>
              </div>
            </div>
            )}
          </div>
          {generationError && (
            <div className="generation-message error">
              生成失败：{generationError}
            </div>
          )}
          <div className="ai-disclosure">
            <Info />
            发送时会将当前章节上下文、作品构想及已开启“AI
            参考”的资料交给所选模型服务商。
          </div>
          <div
            className={`ai-composer${selectedPassage ? " has-selection" : ""}${suggestion ? " preview-open" : ""}`}
          >
            <div className="ai-mode-switch" role="group" aria-label="AI 使用模式">
              <button type="button" className={aiMode === "writing" ? "active" : ""} onClick={() => setAiMode("writing")} title="续写或优化正文"><PenNib />写作</button>
              <button type="button" className={aiMode === "question" ? "active" : ""} onClick={() => setAiMode("question")} title="询问设计理由或创作建议"><ChatCircleText />问答</button>
            </div>
            <Sparkle weight="fill" />
            {selectedPassage && (
              <span className="selection-chip" title={selectedPassage.text}>
                已选 {selectedPassage.text.replace(/\s/g, "").length} 字
              </span>
            )}
            <input
              value={instruction}
              onChange={(event) => setInstruction(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") onGenerate();
              }}
              placeholder={
                aiMode === "question"
                  ? selectedPassage ? "询问关于选中内容的问题" : "例如：为什么这里要这样设计？"
                  : selectedPassage
                  ? "例如：帮我用悲伤的写法优化下这段内容"
                  : "告诉 AI 接下来怎么写"
              }
            />
            <button
              onClick={generating ? onStop : onGenerate}
              aria-label={generating ? "停止生成" : "发送给 AI"}
            >
              {generating ? <X /> : <ArrowLeft className="send-arrow" />}
            </button>
          </div>
        </div>
      ) : (
        <div className="no-chapter">
          <ListBullets />
          <h2>还没有章节</h2>
          <p>从左侧章节区域新建一章后开始写作。</p>
        </div>
      )}
    </section>
  );
}
