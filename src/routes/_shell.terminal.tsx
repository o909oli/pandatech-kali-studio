import { createFileRoute } from "@tanstack/react-router";
import { AppWindow } from "@/components/pt/shell/AppWindow";
import { TerminalSession } from "@/components/pt/apps/TerminalView";
import { pageHead } from "@/lib/pt/head";

export const Route = createFileRoute("/_shell/terminal")({
  head: () => pageHead("Terminal", "Command line with a safe demo shell, tabs and history."),
  component: Page,
});

function Page() {
  return (
    <AppWindow title="Terminal" icon="terminal" source="sample">
      <TerminalSession fontSize={14} autoFocus className="h-full" />
    </AppWindow>
  );
}
