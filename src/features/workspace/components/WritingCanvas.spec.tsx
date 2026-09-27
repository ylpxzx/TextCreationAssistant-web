import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Chapter, Workspace } from "../../../types/domain";
import { WritingCanvas } from "./WritingCanvas";

const chapter: Chapter = {
  id: "chapter-1",
  projectId: "project-1",
  title: "潮痕",
  contentJson: { type: "doc" },
  plainText: "",
  wordCount: 0,
  version: 1,
  status: "writing",
  orderIndex: 0,
  updatedAt: "2026-09-25T00:00:00.000Z",
};
const data: Workspace = {
  project: {
    id: "project-1",
    title: "雾港拾遗",
    idea: "",
    genres: [],
    lengthType: "中长篇",
    style: [],
    totalWords: 0,
    updatedAt: chapter.updatedAt,
  },
  chapters: [chapter],
  resourceGroups: [],
};

function props(
  overrides: Partial<Parameters<typeof WritingCanvas>[0]> = {},
): Parameters<typeof WritingCanvas>[0] {
  return {
    data,
    active: chapter,
    chapterId: chapter.id,
    editor: null,
    wordCount: 0,
    aiMode: "writing",
    suggestion: "",
    instruction: "",
    generating: false,
    generationError: "",
    usage: null,
    selectedPassage: null,
    rewriteRange: null,
    leftOpen: true,
    setData: vi.fn(),
    setInstruction: vi.fn(),
    setAiMode: vi.fn(),
    onTitleSave: vi.fn(),
    onStatusChange: vi.fn(),
    onDelete: vi.fn(),
    onHistory: vi.fn(),
    onGenerate: vi.fn(),
    onStop: vi.fn(),
    onAccept: vi.fn(),
    onDiscard: vi.fn(),
    onStashAndRegenerate: vi.fn(),
    onLeftOpen: vi.fn(),
    ...overrides,
  };
}

describe("WritingCanvas AI controls", () => {
  beforeEach(() => localStorage.clear());

  it("starts generation from the AI composer and stops an active stream", async () => {
    const user = userEvent.setup();
    const onGenerate = vi.fn();
    const onStop = vi.fn();
    const { rerender } = render(
      <WritingCanvas {...props({ onGenerate, onStop })} />,
    );
    await user.click(screen.getByRole("button", { name: "发送给 AI" }));
    expect(onGenerate).toHaveBeenCalledOnce();
    rerender(
      <WritingCanvas {...props({ generating: true, onGenerate, onStop })} />,
    );
    await user.click(screen.getByRole("button", { name: "停止生成" }));
    expect(onStop).toHaveBeenCalledOnce();
  });

  it("switches between writing and question modes", async () => {
    const user = userEvent.setup();
    const setAiMode = vi.fn();
    render(<WritingCanvas {...props({ setAiMode })} />);
    await user.click(screen.getByRole("button", { name: "问答" }));
    expect(setAiMode).toHaveBeenCalledWith("question");
  });

  it("shows question answers without正文 acceptance actions", () => {
    render(<WritingCanvas {...props({ aiMode: "question", suggestion: "沉默能延迟信息揭示，并强化人物防御心理。" })} />);
    expect(screen.getByLabelText("AI 问答内容")).toBeTruthy();
    expect(screen.getByRole("button", { name: "关闭回答" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "重新回答" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "保留" })).toBeNull();
  });


  it("keeps or discards a translucent suggestion inside the editor area", async () => {
    const user = userEvent.setup();
    const onAccept = vi.fn();
    const onDiscard = vi.fn();
    const onGenerate = vi.fn();
    render(
      <WritingCanvas
        {...props({
          suggestion: "潮水越过石阶。",
          usage: {
            model: "model-b",
            inputTokens: 20,
            outputTokens: 6,
            totalTokens: 26,
            references: [
              {
                sourceType: "project",
                sourceId: "project-1",
                label: "作品构想",
              },
            ],
          },
          onAccept,
          onDiscard,
          onGenerate,
        })}
      />,
    );
    const preview = screen.getByLabelText("AI 生成内容预览");
    expect(preview.textContent).toContain("潮水越过石阶。");
    expect(preview.classList.contains("editor-suggestion-inline")).toBe(true);
    expect(screen.getByRole("button", { name: "发送给 AI" }).parentElement?.classList.contains("preview-open")).toBe(true);
    expect(screen.getByText("作品构想")).toBeTruthy();
    expect(screen.getByText("潮水越过石阶。").compareDocumentPosition(screen.getByRole("button", { name: "保留" })) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "保留" }));
    await user.click(screen.getByRole("button", { name: /丢弃/ }));
    await user.click(screen.getByRole("button", { name: "重新生成" }));
    expect(onAccept).toHaveBeenCalledOnce();
    expect(onDiscard).toHaveBeenCalledOnce();
    expect(onGenerate).toHaveBeenCalledOnce();
  });

  it("explains which content is sent to the selected model provider", () => {
    render(<WritingCanvas {...props()} />);
    expect(
      screen.getByText(/当前章节上下文、作品构想及已开启“AI 参考”的资料/),
    ).toBeTruthy();
  });

  it("presents selected text as a rewrite operation", () => {
    render(
      <WritingCanvas
        {...props({
          suggestion: "悲伤的改写。",
          selectedPassage: { text: "原句。" },
          rewriteRange: { from: 1, to: 4 },
        })}
      />,
    );
    expect(screen.getByText("已选 3 字")).toBeTruthy();
    expect(screen.getByText("AI 改写预览")).toBeTruthy();
    expect(screen.getByRole("button", { name: "保留" })).toBeTruthy();
    expect(
      screen.getByPlaceholderText("例如：帮我用悲伤的写法优化下这段内容"),
    ).toBeTruthy();
  });

  it("adjusts and persists the editor font size and page width", async () => {
    const user = userEvent.setup();
    const { container } = render(<WritingCanvas {...props()} />);
    await user.selectOptions(screen.getByLabelText("正文字号"), "20");
    fireEvent.change(screen.getByLabelText("正文宽度"), {
      target: { value: "100" },
    });
    expect(
      container.querySelector(".document")?.getAttribute("style"),
    ).toContain("--editor-font-size: 20px");
    expect(
      container.querySelector(".document")?.getAttribute("style"),
    ).toContain("--editor-width: 100%");
    expect(
      JSON.parse(localStorage.getItem("moyin.editor-display") || "{}"),
    ).toEqual({ fontSize: 20, width: 100 });
  });

  it("keeps chapter history and delete controls in the right-side action group", () => {
    render(<WritingCanvas {...props()} />);
    const actions = screen.getByLabelText("章节历史").parentElement;
    expect(actions?.classList.contains("chapter-actions")).toBe(true);
    expect(actions?.contains(screen.getByLabelText("删除章节"))).toBe(true);
  });
});
