import { createFileRoute } from "@tanstack/react-router";
import { AppWindow } from "@/components/pt/shell/AppWindow";
import { WorkspacesApp } from "@/components/pt/apps/MoreApps";
import { pageHead } from "@/lib/pt/head";

export const Route = createFileRoute("/_shell/workspaces")({
  head: () => pageHead("Workspaces", "Projects and task lists for your sessions."),
  component: Page,
});

function Page() {
  return (
    <AppWindow title="Workspaces" icon="clipboard">
      <WorkspacesApp />
    </AppWindow>
  );
}
