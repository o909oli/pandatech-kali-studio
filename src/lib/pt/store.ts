import { useSyncExternalStore } from "react";
import type { AssistantState, NotificationItem } from "./types";

/** Tiny external store with selectors (no extra dependency). */
export function createStore<T extends object>(initial: T, persistKeys: (keyof T)[] = [], storageKey?: string) {
  let state = initial;
  const listeners = new Set<() => void>();

  const hydrate = () => {
    if (!storageKey || typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        state = { ...state, ...JSON.parse(raw) };
        listeners.forEach((l) => l());
      }
    } catch {
      /* ignore corrupt storage */
    }
  };

  const persist = () => {
    if (!storageKey || typeof window === "undefined") return;
    const subset: Partial<T> = {};
    persistKeys.forEach((k) => (subset[k] = state[k]));
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(subset));
    } catch {
      /* quota */
    }
  };

  return {
    get: () => state,
    set: (patch: Partial<T> | ((s: T) => Partial<T>)) => {
      const p = typeof patch === "function" ? patch(state) : patch;
      state = { ...state, ...p };
      persist();
      listeners.forEach((l) => l());
    },
    subscribe: (l: () => void) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    hydrate,
  };
}

export type AccentId = "electric" | "cyan" | "ice" | "violet" | "emerald";
export type WallpaperId = "panda" | "network";
export type Density = "compact" | "comfortable";

export interface DesktopState {
  /* persisted preferences */
  accent: AccentId;
  wallpaper: WallpaperId;
  density: Density;
  reduceMotion: boolean;
  /** central demo / native switch. The UI never branches on this itself. */
  mode: "demo" | "native";
  assistantProvider: string;
  assistantModel: string;
  autoApproveReadOnly: boolean;
  voiceEnabled: boolean;
  sidebarCollapsed: boolean;
  dockFavorites: string[];
  welcomeSeen: boolean;
  wifi: boolean;
  bluetooth: boolean;
  dnd: boolean;
  volume: number;
  brightness: number;
  /* transient UI state */
  assistantOpen: boolean;
  paletteOpen: boolean;
  notifOpen: boolean;
  quickOpen: boolean;
  launcherOpen: boolean;
  assistantState: AssistantState;
  workspace: number;
  notifications: NotificationItem[];
  toast: { id: number; text: string; tone: "info" | "success" | "warning" | "error" } | null;
}

const PERSISTED: (keyof DesktopState)[] = [
  "accent", "wallpaper", "density", "reduceMotion", "mode", "assistantProvider",
  "assistantModel", "autoApproveReadOnly", "voiceEnabled", "sidebarCollapsed",
  "dockFavorites", "welcomeSeen", "wifi", "bluetooth", "dnd", "volume", "brightness", "workspace",
];

export const DEFAULT_DOCK = [
  "files", "terminal", "browser", "editor", "monitor", "network", "location", "security", "assistant", "workspaces", "settings",
];

export const desktopStore = createStore<DesktopState>(
  {
    accent: "electric",
    wallpaper: "panda",
    density: "comfortable",
    reduceMotion: false,
    mode: "demo",
    assistantProvider: "brain",
    assistantModel: "",
    autoApproveReadOnly: true,
    voiceEnabled: true,
    sidebarCollapsed: false,
    dockFavorites: DEFAULT_DOCK,
    welcomeSeen: false,
    wifi: true,
    bluetooth: false,
    dnd: false,
    volume: 62,
    brightness: 80,
    assistantOpen: false,
    paletteOpen: false,
    notifOpen: false,
    quickOpen: false,
    launcherOpen: false,
    assistantState: "idle",
    workspace: 1,
    notifications: [],
    toast: null,
  },
  PERSISTED,
  "pandatechs.desktop.v2",
);

export function useDesktop<S>(selector: (s: DesktopState) => S): S {
  return useSyncExternalStore(
    desktopStore.subscribe,
    () => selector(desktopStore.get()),
    () => selector(desktopStore.get()),
  );
}

export const setDesktop = desktopStore.set;

let toastId = 0;
let toastTimer: ReturnType<typeof setTimeout> | undefined;
export function toast(text: string, tone: "info" | "success" | "warning" | "error" = "info") {
  const id = ++toastId;
  desktopStore.set({ toast: { id, text, tone } });
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    if (desktopStore.get().toast?.id === id) desktopStore.set({ toast: null });
  }, 3600);
}

export function closeOverlays(except?: "notifOpen" | "quickOpen" | "launcherOpen" | "paletteOpen") {
  const patch: Partial<DesktopState> = {
    notifOpen: false,
    quickOpen: false,
    launcherOpen: false,
    paletteOpen: false,
  };
  if (except) patch[except] = true;
  desktopStore.set(patch);
}
