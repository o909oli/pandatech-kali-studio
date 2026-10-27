import { createFileRoute } from "@tanstack/react-router";
import { AppWindow } from "@/components/pt/shell/AppWindow";
import { FilesApp } from "@/components/pt/apps/FilesApp";
import { pageHead } from "@/lib/pt/head";

export const Route = createFileRoute("/_shell/files")({
  head: () => pageHead("Files", "Browse folders and files with a places sidebar and details pane."),
  component: Page,
});

function Page() {
  return (
    <AppWindow title="Files" icon="folder" source="sample">
      <FilesApp />
    </AppWindow>
  );
}
