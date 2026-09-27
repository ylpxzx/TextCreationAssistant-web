import { useEffect, useState } from "react";
import { SpinnerGap } from "@phosphor-icons/react";
import { AuthScreen } from "../features/auth/AuthScreen";
import { ProjectList } from "../features/projects/ProjectList";
import { SettingsPage } from "../features/settings/SettingsPage";
import { WorkspacePage } from "../features/workspace/WorkspacePage";
import { api } from "../services/api";

type View = "projects" | "workspace" | "settings";

export default function App() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [view, setView] = useState<View>("projects");
  const [projectId, setProjectId] = useState("");

  const logout = async () => {
    await api.logout();
    setProjectId("");
    setView("projects");
    setAuthenticated(false);
  };

  useEffect(() => {
    api
      .me()
      .then(() => setAuthenticated(true))
      .catch(() => setAuthenticated(false));
  }, []);
  if (authenticated === null)
    return (
      <div className="loading">
        <SpinnerGap className="spin" />
        正在加载
      </div>
    );
  if (!authenticated)
    return <AuthScreen onReady={() => setAuthenticated(true)} />;
  if (view === "settings")
    return (
      <SettingsPage
        onBack={() => setView(projectId ? "workspace" : "projects")}
      />
    );
  if (view === "workspace" && projectId)
    return (
      <WorkspacePage
        projectId={projectId}
        onBack={() => {
          setProjectId("");
          setView("projects");
        }}
        onSettings={() => setView("settings")}
      />
    );
  return (
    <ProjectList
      onSettings={() => setView("settings")}
      onLogout={logout}
      onOpen={(id) => {
        setProjectId(id);
        setView("workspace");
      }}
    />
  );
}
