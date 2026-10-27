import { createFileRoute } from "@tanstack/react-router";
import { AppWindow } from "@/components/pt/shell/AppWindow";
import { AssistantWorkspace } from "@/components/pt/apps/AssistantWorkspace";
import { pageHead } from "@/lib/pt/head";

export const Route = createFileRoute("/_shell/assistant")({
  head: () => pageHead("P - Personal AI", "Talk to P, your private on-device assistant, with approvals for every action that changes your system."),
  component: Page,
});

function Page() {
  return (
    <AppWindow title="P - Personal AI" icon="bot" bodyClassName="relative">
      <AssistantWorkspace />
    </AppWindow>
  );
}
