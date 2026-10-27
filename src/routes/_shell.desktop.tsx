import { createFileRoute } from "@tanstack/react-router";
import { DesktopDashboard } from "@/components/pt/apps/DesktopDashboard";
import { pageHead } from "@/lib/pt/head";

export const Route = createFileRoute("/_shell/desktop")({
  head: () => pageHead("Desktop", "Your Pandatechs desktop with system widgets, app categories, shortcuts and the P assistant."),
  component: DesktopDashboard,
});
