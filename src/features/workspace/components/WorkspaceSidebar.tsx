import { useState } from "react";
import { FileText, Plus, X } from "@phosphor-icons/react";
import type { Workspace } from "../../../types/domain";

type WorkspaceSidebarProps = {
  data: Workspace;
  chapterId: string;
  resourceGroupId: string | null;
  onResourceOpen: (groupId: string) => void;
  onResourceCreate: (name: string) => Promise<void>;
  onChapterChange: (id: string) => void;
  onChapterCreate: () => void;
  onClose: () => void;
};

export function WorkspaceSidebar({
  data,
  chapterId,
  resourceGroupId,
  onResourceOpen,
  onResourceCreate,
  onChapterChange,
  onChapterCreate,
  onClose,
}: WorkspaceSidebarProps) {
  const [creatingResource, setCreatingResource] = useState(false);
  const [resourceName, setResourceName] = useState("");
  const createResource = async () => {
    const name = resourceName.trim();
    if (!name) return;
    await onResourceCreate(name);
    setResourceName("");
    setCreatingResource(false);
  };

  return (
    <aside className="left-panel">
      <div className="panel-title">
        <span>创作资料</span>
        <div className="panel-actions">
          <button
            className="icon-button"
            onClick={() => setCreatingResource(true)}
            aria-label="新建资料类型"
          >
            <Plus />
          </button>
          <button className="icon-button" onClick={onClose}>
            <X />
          </button>
        </div>
      </div>
      <nav className="resource-groups">
        {data.resourceGroups.length === 0 && !creatingResource && (
          <button
            className="sidebar-empty"
            onClick={() => setCreatingResource(true)}
          >
            <Plus />
            新建资料类型
          </button>
        )}
        {data.resourceGroups.map((group) => (
          <button
            key={group.id}
            className={
              resourceGroupId === group.id ? "nav-row active" : "nav-row"
            }
            onClick={() => onResourceOpen(group.id)}
            title={group.useInAi ? "用于 AI 参考" : "不用于 AI 参考"}
          >
            <FileText weight="bold" />
            {group.name}
            <span>{group.useInAi ? group.items.length : "—"}</span>
          </button>
        ))}
      </nav>
      {creatingResource && (
        <div className="new-resource-form">
          <input
            value={resourceName}
            onChange={(event) => setResourceName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") createResource();
              if (event.key === "Escape") setCreatingResource(false);
            }}
            placeholder="例如：角色卡"
            autoFocus
          />
          <div>
            <button onClick={() => setCreatingResource(false)}>取消</button>
            <button onClick={createResource} disabled={!resourceName.trim()}>
              创建
            </button>
          </div>
        </div>
      )}
      <div className="chapter-head">
        <span>章节</span>
        <button className="icon-button" onClick={onChapterCreate}>
          <Plus />
        </button>
      </div>
      <div className="chapter-list">
        {data.chapters.map((chapter, index) => (
          <button
            className={
              chapter.id === chapterId ? "chapter-row active" : "chapter-row"
            }
            onClick={() => onChapterChange(chapter.id)}
            key={chapter.id}
          >
            <span>{String(index + 1).padStart(2, "0")}</span>
            <div>
              <strong>{chapter.title}</strong>
              <small>
                {chapter.status === "draft"
                  ? "草稿"
                  : chapter.status === "done"
                    ? "已完成"
                    : "写作中"}{" "}
                · {chapter.wordCount} 字
              </small>
            </div>
          </button>
        ))}
      </div>
    </aside>
  );
}
