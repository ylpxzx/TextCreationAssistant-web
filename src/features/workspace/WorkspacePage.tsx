import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, CaretDown, Gear, SpinnerGap, Sparkle } from "@phosphor-icons/react";
import { api } from "../../services/api";
import type { ModelProfile, Workspace } from "../../types/domain";
import { ResourcePopover } from "./components/ResourcePopover";
import { ChapterHistoryPanel } from "./components/ChapterHistoryPanel";
import { ChapterConflictPanel } from "./components/ChapterConflictPanel";
import { WorkspaceSidebar } from "./components/WorkspaceSidebar";
import { WritingCanvas } from "./components/WritingCanvas";
import { CandidateVersionsSidebar } from "./components/CandidateVersionsSidebar";
import { CreativeStudio } from "./components/CreativeStudio";
import { useChapterEditor } from "./hooks/useChapterEditor";
import { localDb, type LocalDraft } from "../../storage/localDb";
import type { Chapter } from "../../types/domain";
import { textDocument } from "./utils/draft-sync";
import { ExportMenu } from "./components/ExportMenu";
import {
  chapterAsTxt,
  downloadTextFile,
  projectAsMarkdown,
  projectAsTxt,
  safeFileName,
} from "./utils/export-document";
import { useConfirm, useToast } from "../../shared/components/FeedbackProvider";
import { estimateUsageCost, formatUsd } from "./utils/model-usage";

type WorkspacePageProps = {
  projectId: string;
  onBack: () => void;
  onSettings: () => void;
};

export function WorkspacePage({
  projectId,
  onBack,
  onSettings,
}: WorkspacePageProps) {
  const confirm = useConfirm();
  const toast = useToast();
  const [data, setData] = useState<Workspace | null>(null);
  const [modelProfiles, setModelProfiles] = useState<ModelProfile[]>([]);
  const [modelProfile, setModelProfile] = useState<ModelProfile | null>(null);
  const [modelSwitching, setModelSwitching] = useState(false);
  const [chapterId, setChapterId] = useState("");
  const [leftOpen, setLeftOpen] = useState(true);
  const [resourceGroupId, setResourceGroupId] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [creativeOpen, setCreativeOpen] = useState(false);
  const [conflict, setConflict] = useState<{
    server: Chapter;
    draft: LocalDraft;
  } | null>(null);
  const [conflictLoading, setConflictLoading] = useState(false);
  const active = data?.chapters.find((chapter) => chapter.id === chapterId);
  const chapterEditor = useChapterEditor({ active, chapterId, setData });

  const load = useCallback(async () => {
    const workspace = await api.workspace(projectId);
    setData(workspace);
    setChapterId((current) => current || workspace.chapters[0]?.id || "");
  }, [projectId]);

  useEffect(() => {
    load().catch(() => undefined);
  }, [load]);
  useEffect(() => {
    api
      .modelProfiles()
      .then((profiles) => {
        setModelProfiles(profiles);
        setModelProfile(
          profiles.find((profile) => profile.isDefault) || profiles[0] || null,
        );
      })
      .catch(() => {
        setModelProfiles([]);
        setModelProfile(null);
      });
  }, []);
  const switchModel = async (profileId: string) => {
    const next = modelProfiles.find((profile) => profile.id === profileId);
    if (!next || next.id === modelProfile?.id) return;
    setModelSwitching(true);
    try {
      const updated = await api.setDefaultModelProfile(next.id);
      setModelProfile(updated);
      setModelProfiles((current) =>
        current.map((profile) => ({
          ...profile,
          isDefault: profile.id === updated.id,
        })),
      );
      toast({ message: `已切换到 ${updated.model}`, tone: "success" });
    } catch (cause) {
      toast({
        message: cause instanceof Error ? cause.message : "模型切换失败",
        tone: "error",
      });
    } finally {
      setModelSwitching(false);
    }
  };
  const createChapter = async () => {
    await chapterEditor.flushCurrentDraft();
    const chapter = await api.createChapter(projectId);
    setData((current) =>
      current
        ? { ...current, chapters: [...current.chapters, chapter] }
        : current,
    );
    setChapterId(chapter.id);
  };
  const changeChapter = async (nextChapterId: string) => {
    if (nextChapterId === chapterId) return;
    await chapterEditor.flushCurrentDraft();
    setChapterId(nextChapterId);
  };
  const leaveWorkspace = async () => {
    await chapterEditor.flushCurrentDraft();
    onBack();
  };
  const createResourceGroup = async (name: string) => {
    const group = await api.addResourceGroup(projectId, name);
    await load();
    setResourceGroupId(group.id);
  };
  const saveTitle = async (title: string) => {
    if (!active) return;
    await api.saveChapter(active.id, { title, version: active.version });
    await load();
  };
  const updateChapterStatus = async (
    status: NonNullable<typeof active>["status"],
  ) => {
    if (!active) return;
    await api.saveChapter(active.id, { status, version: active.version });
    await load();
  };
  const deleteChapter = async () => {
    if (
      !active ||
      !(await confirm({
        title: "删除章节",
        message: `确定删除“${active.title}”吗？删除后无法恢复。`,
        confirmLabel: "删除章节",
        danger: true,
      }))
    )
      return;
    const currentIndex =
      data?.chapters.findIndex((chapter) => chapter.id === active.id) ?? 0;
    await api.deleteChapter(active.id);
    await localDb.drafts.delete(active.id);
    const workspace = await api.workspace(projectId);
    setData(workspace);
    setChapterId(
      workspace.chapters[Math.min(currentIndex, workspace.chapters.length - 1)]
        ?.id || "",
    );
    toast({ message: "章节已删除", tone: "success" });
  };
  const restoreChapter = async (chapter: NonNullable<typeof active>) => {
    setData((current) =>
      current
        ? {
            ...current,
            chapters: current.chapters.map((item) =>
              item.id === chapter.id ? chapter : item,
            ),
          }
        : current,
    );
    await chapterEditor.replaceChapter(chapter);
  };
  const openConflict = async () => {
    if (!active || conflictLoading) return;
    setConflictLoading(true);
    try {
      const [workspace, draft] = await Promise.all([
        api.workspace(projectId),
        localDb.drafts.get(active.id),
      ]);
      const server = workspace.chapters.find(
        (chapter) => chapter.id === active.id,
      );
      if (server && draft) setConflict({ server, draft });
      else if (server) await useServerChapter(server);
    } finally {
      setConflictLoading(false);
    }
  };
  const useServerChapter = async (chapter: Chapter) => {
    await chapterEditor.replaceChapter(chapter);
    setData((current) =>
      current
        ? {
            ...current,
            chapters: current.chapters.map((item) =>
              item.id === chapter.id ? chapter : item,
            ),
          }
        : current,
    );
    setConflict(null);
  };
  const saveConflictContent = async (
    server: Chapter,
    draft: LocalDraft,
    plainText?: string,
  ) => {
    const text = plainText ?? draft.plainText;
    const contentJson =
      plainText === undefined ? draft.contentJson : textDocument(text);
    const saved = await api.saveChapter(server.id, {
      contentJson,
      plainText: text,
      version: server.version,
    });
    await chapterEditor.replaceChapter(saved);
    setData((current) =>
      current
        ? {
            ...current,
            chapters: current.chapters.map((item) =>
              item.id === saved.id ? saved : item,
            ),
          }
        : current,
    );
    setConflict(null);
  };

  const exportChapters = async () =>
    Promise.all(
      data!.chapters.map(async (chapter) => {
        const draft = await localDb.drafts.get(chapter.id);
        const currentText =
          chapter.id === chapterId
            ? chapterEditor.editor?.getText()
            : undefined;
        return {
          ...chapter,
          plainText: currentText ?? draft?.plainText ?? chapter.plainText,
        };
      }),
    );
  const exportCurrentChapter = async () => {
    if (!active) return;
    const chapters = await exportChapters();
    const chapter = chapters.find((item) => item.id === active.id) || active;
    downloadTextFile(
      `${safeFileName(chapter.title)}.txt`,
      chapterAsTxt(chapter),
      "text/plain",
    );
    toast({ message: "章节 TXT 已开始下载", tone: "success" });
  };
  const exportProjectTxt = async () => {
    downloadTextFile(
      `${safeFileName(data!.project.title)}.txt`,
      projectAsTxt(data!.project, await exportChapters()),
      "text/plain",
    );
    toast({ message: "作品 TXT 已开始下载", tone: "success" });
  };
  const exportProjectMarkdown = async () => {
    downloadTextFile(
      `${safeFileName(data!.project.title)}.md`,
      projectAsMarkdown(data!.project, await exportChapters()),
      "text/markdown",
    );
    toast({ message: "作品 Markdown 已开始下载", tone: "success" });
  };

  useEffect(() => {
    if (chapterEditor.saveState === "conflict")
      openConflict().catch(() => undefined);
  }, [chapterEditor.saveState]);

  if (!data)
    return (
      <div className="loading">
        <SpinnerGap className="spin" />
        正在打开作品
      </div>
    );
  const activeResourceGroup = data.resourceGroups.find(
    (group) => group.id === resourceGroupId,
  );
  const visibleUsage = modelProfile
    ? chapterEditor.usageTotals[modelProfile.model] || null
    : null;
  const usageCost = estimateUsageCost(visibleUsage, modelProfile);

  return (
    <main className={`workspace ${leftOpen ? "" : "left-closed"}`}>
      <header className="workspace-top">
        <button className="icon-button" onClick={() => void leaveWorkspace()}>
          <ArrowLeft />
        </button>
        <div className="project-name">
          {data.project.title}
          <CaretDown size={13} />
        </div>
        <div className="top-spacer" />
        <div className="model-usage-summary" aria-label="当前模型用量">
          <label title={modelProfile?.name || "尚未配置模型"}>
            <select
              aria-label="切换 AI 模型"
              value={modelProfile?.id || ""}
              disabled={modelSwitching || modelProfiles.length === 0}
              onChange={(event) => void switchModel(event.target.value)}
            >
              {modelProfiles.length === 0 && <option value="">未配置模型</option>}
              {modelProfiles.map((profile) => (
                <option value={profile.id} key={profile.id}>{profile.model}</option>
              ))}
            </select>
          </label>
          <span>{(visibleUsage?.totalTokens || 0).toLocaleString()} Token</span>
          <span title={usageCost?.note || "当前模型暂无价格配置"}>
            {usageCost ? `预估 ${formatUsd(usageCost.usd)}` : "费用 —"}
          </span>
        </div>
        <button
          className={`save-state ${chapterEditor.saveState}`}
          disabled={
            chapterEditor.saveState === "saved" ||
            chapterEditor.saveState === "saving" ||
            (chapterEditor.saveState === "local" && !chapterEditor.isOnline)
          }
          onClick={
            chapterEditor.saveState === "conflict"
              ? openConflict
              : chapterEditor.retrySave
          }
        >
          {chapterEditor.saveState === "saved"
            ? "已保存"
            : chapterEditor.saveState === "saving"
              ? "同步中"
              : chapterEditor.saveState === "conflict"
                ? conflictLoading
                  ? "加载冲突内容…"
                  : "版本冲突，点击处理"
                : chapterEditor.isOnline
                  ? "同步失败，点击重试"
                  : "离线草稿"}
        </button>
        <ExportMenu
          disabled={!active}
          onChapterTxt={() => void exportCurrentChapter()}
          onProjectTxt={() => void exportProjectTxt()}
          onProjectMarkdown={() => void exportProjectMarkdown()}
        />
        <button className="button small" onClick={() => setCreativeOpen(true)}><Sparkle />创作智能</button>
        <button className="icon-button" onClick={onSettings}>
          <Gear />
        </button>
      </header>
      <WorkspaceSidebar
        data={data}
        chapterId={chapterId}
        resourceGroupId={resourceGroupId}
        onResourceOpen={setResourceGroupId}
        onResourceCreate={createResourceGroup}
        onChapterChange={(id) => void changeChapter(id)}
        onChapterCreate={() => void createChapter()}
        onClose={() => setLeftOpen(false)}
      />
      {activeResourceGroup && (
        <ResourcePopover
          group={activeResourceGroup}
          onClose={() => setResourceGroupId(null)}
          onChanged={load}
        />
      )}
      {historyOpen && active && (
        <ChapterHistoryPanel
          chapter={active}
          canRestore={chapterEditor.saveState === "saved"}
          onClose={() => setHistoryOpen(false)}
          onRestored={restoreChapter}
        />
      )}
      {conflict && (
        <ChapterConflictPanel
          server={conflict.server}
          draft={conflict.draft}
          onClose={() => setConflict(null)}
          onUseServer={() => useServerChapter(conflict.server)}
          onKeepLocal={() =>
            saveConflictContent(conflict.server, conflict.draft)
          }
          onMerge={(text) =>
            saveConflictContent(conflict.server, conflict.draft, text)
          }
        />
      )}
      <WritingCanvas
        data={data}
        active={active}
        chapterId={chapterId}
        editor={chapterEditor.editor}
        wordCount={chapterEditor.wordCount}
        aiMode={chapterEditor.aiMode}
        suggestion={chapterEditor.suggestion}
        instruction={chapterEditor.instruction}
        generating={chapterEditor.generating}
        generationError={chapterEditor.generationError}
        usage={chapterEditor.usage}
        selectedPassage={chapterEditor.selectedPassage}
        rewriteRange={chapterEditor.rewriteRange}
        leftOpen={leftOpen}
        setData={setData}
        setInstruction={chapterEditor.setInstruction}
        setAiMode={chapterEditor.setAiMode}
        onTitleSave={saveTitle}
        onStatusChange={updateChapterStatus}
        onDelete={deleteChapter}
        onHistory={() => setHistoryOpen(true)}
        onGenerate={chapterEditor.generate}
        onStop={chapterEditor.stop}
        onAccept={chapterEditor.accept}
        onDiscard={chapterEditor.discard}
        onStashAndRegenerate={() => void chapterEditor.stashAndRegenerate()}
        onLeftOpen={() => setLeftOpen(true)}
      />
      <CandidateVersionsSidebar
        variants={chapterEditor.variants}
        activeVariantId={chapterEditor.activeVariantId}
        onSelect={chapterEditor.selectVariant}
        onDelete={chapterEditor.deleteVariant}
      />
      {creativeOpen && <CreativeStudio projectId={projectId} active={active} chapters={data.chapters} onClose={() => setCreativeOpen(false)} onPrompt={(prompt) => { chapterEditor.setAiMode("question"); chapterEditor.setInstruction(prompt); setCreativeOpen(false); }} />}
    </main>
  );
}
