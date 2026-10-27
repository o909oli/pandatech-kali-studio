import { createFileRoute } from "@tanstack/react-router";
import { AppWindow } from "@/components/pt/shell/AppWindow";
import { SettingsApp } from "@/components/pt/apps/MoreApps";
import { pageHead } from "@/lib/pt/head";

export const Route = createFileRoute("/_shell/settings")({
  head: () => pageHead("Settings", "Appearance, P assistant, privacy and system options."),
  component: Page,
});

function Page() {
  return (
    <AppWindow title="Settings" icon="settings">
      <SettingsApp />
    </AppWindow>
  );
}
