import { createFileRoute } from "@tanstack/react-router";
import { AppWindow } from "@/components/pt/shell/AppWindow";
import { NetworkApp } from "@/components/pt/apps/SystemApps";
import { pageHead } from "@/lib/pt/head";

export const Route = createFileRoute("/_shell/network")({
  head: () => pageHead("Network Center", "Interfaces, traffic graphs and active connections."),
  component: Page,
});

function Page() {
  return (
    <AppWindow title="Network Center" icon="network">
      <NetworkApp />
    </AppWindow>
  );
}
