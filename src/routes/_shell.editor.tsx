import { createFileRoute } from "@tanstack/react-router";
import { AppWindow } from "@/components/pt/shell/AppWindow";
import { EditorApp } from "@/components/pt/apps/EditorApp";
import { pageHead } from "@/lib/pt/head";

export const Route = createFileRoute("/_shell/editor")({
  head: () => pageHead("Editor", "Code and text editor with tabs, syntax colours, find and an integrated terminal."),
  validateSearch: (s: Record<string, unknown>): { file?: string | undefined } => ({ file: typeof s["file"] === "string" ? s["file"] : undefined }),
  component: Page,
});

function Page() {
  const { file } = Route.useSearch();
  return (
    <AppWindow title="Editor" icon="code" source="sample">
      <EditorApp initial={file} />
    </AppWindow>
  );
}
