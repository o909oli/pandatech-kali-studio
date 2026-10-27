import { createFileRoute } from "@tanstack/react-router";
import { AppWindow } from "@/components/pt/shell/AppWindow";
import { NotesApp } from "@/components/pt/apps/NotesApp";
import { pageHead } from "@/lib/pt/head";

export const Route = createFileRoute("/_shell/notes")({
  head: () => pageHead("Notes", "Write Markdown notes with live preview."),
  component: Page,
});

function Page() {
  return (
    <AppWindow title="Notes" icon="notebook">
      <NotesApp />
    </AppWindow>
  );
}
