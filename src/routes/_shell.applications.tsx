import { createFileRoute } from "@tanstack/react-router";
import { AppWindow } from "@/components/pt/shell/AppWindow";
import { ApplicationsApp } from "@/components/pt/apps/MoreApps";
import { pageHead } from "@/lib/pt/head";

export const Route = createFileRoute("/_shell/applications")({
  head: () => pageHead("Applications", "Every application grouped by category."),
  component: Page,
});

function Page() {
  return (
    <AppWindow title="Applications" icon="layout">
      <ApplicationsApp />
    </AppWindow>
  );
}
