import { createFileRoute } from "@tanstack/react-router";
import { AppWindow } from "@/components/pt/shell/AppWindow";
import { MonitorApp } from "@/components/pt/apps/SystemApps";
import { pageHead } from "@/lib/pt/head";

export const Route = createFileRoute("/_shell/monitor")({
  head: () => pageHead("System Monitor", "Live CPU, memory, disk and process view."),
  component: Page,
});

function Page() {
  return (
    <AppWindow title="System Monitor" icon="activity">
      <MonitorApp />
    </AppWindow>
  );
}
