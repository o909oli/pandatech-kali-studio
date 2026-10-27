import { useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect } from "react";
import type { InternalAppId } from "./types";
import { closeOverlays, toast } from "./store";
import { getIntegration } from "./integration";
import { desktopStore } from "./store";

export interface InternalApp {
  id: InternalAppId;
  title: string;
  path: string;
  icon: string;
  subtitle: string;
}

export const INTERNAL_APPS: Record<InternalAppId, InternalApp> = {
  terminal: { id: "terminal", title: "Terminal", path: "/terminal", icon: "terminal", subtitle: "Command line" },
  files: { id: "files", title: "Files", path: "/files", icon: "folder", subtitle: "File manager" },
  editor: { id: "editor", title: "Editor", path: "/editor", icon: "code", subtitle: "Code and text" },
  notes: { id: "notes", title: "Notes", path: "/notes", icon: "notebook", subtitle: "Markdown notes" },
  monitor: { id: "monitor", title: "System Monitor", path: "/monitor", icon: "activity", subtitle: "Performance" },
  network: { id: "network", title: "Network Center", path: "/network", icon: "network", subtitle: "Connections" },
  security: { id: "security", title: "Security Center", path: "/security", icon: "shield", subtitle: "Protection" },
  assistant: { id: "assistant", title: "P - Personal AI", path: "/assistant", icon: "bot", subtitle: "Assistant workspace" },
  settings: { id: "settings", title: "Settings", path: "/settings", icon: "settings", subtitle: "Preferences" },
  applications: { id: "applications", title: "Applications", path: "/applications", icon: "layout", subtitle: "All apps" },
  workspaces: { id: "workspaces", title: "Workspaces", path: "/workspaces", icon: "clipboard", subtitle: "Projects" },
  location: { id: "location", title: "Location Center", path: "/location", icon: "map-pin", subtitle: "Consent-based sharing" },
  browser: { id: "browser", title: "Browser", path: "/applications", icon: "globe", subtitle: "Web" },
};

export function useOpenApp() {
  const navigate = useNavigate();
  return useCallback(
    (id: string, props?: { search?: Record<string, string> }) => {
      closeOverlays();
      const app = INTERNAL_APPS[id as InternalAppId];
      if (id === "browser") {
        void getIntegration(desktopStore.get().mode)
          .launcher.launchNative("firefox-esr.desktop")
          .then((r) => toast(r.message, r.ok ? "success" : "info"));
        return;
      }
      if (!app) return;
      void navigate({ to: app.path as never, search: (props?.search ?? {}) as never });
    },
    [navigate],
  );
}

/** Lets non-component code (the assistant controller) open apps. */
export function useNavigateEvents() {
  const open = useOpenApp();
  useEffect(() => {
    const h = (e: Event) => open((e as CustomEvent<{ appId: string }>).detail.appId);
    window.addEventListener("pt:navigate", h);
    return () => window.removeEventListener("pt:navigate", h);
  }, [open]);
}
