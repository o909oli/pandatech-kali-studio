import { createFileRoute } from "@tanstack/react-router";
import { AppWindow } from "@/components/pt/shell/AppWindow";
import { SecurityApp } from "@/components/pt/apps/SystemApps";
import { pageHead } from "@/lib/pt/head";

export const Route = createFileRoute("/_shell/security")({
  head: () => pageHead("Security Center", "Firewall, updates and security events with approvals for changes."),
  component: Page,
});

function Page() {
  return (
    <AppWindow title="Security Center" icon="shield">
      <SecurityApp />
    </AppWindow>
  );
}
