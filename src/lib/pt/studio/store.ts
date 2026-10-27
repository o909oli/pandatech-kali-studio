import { useSyncExternalStore } from "react";
import { createStore } from "../store";
import { uid } from "../format";
import type { DataSource } from "../types";
import { getStudio } from "./integration";
import type {
  Diagnostic, DebugSession, DebugStep, DevTool, EditorTab, Extension, FileEntry, GitStatus, LaunchConfig,
  ProjectTemplate, ProposedAction, RecentWorkspace, StudioNotification, TerminalProfile, TerminalSessionInfo,
  TestCase, Workspace,
} from "./types";

export type ActivityView = "explorer" | "search" | "scm" | "debug" | "extensions" | "testing" | "remote" | "p";
export type PanelTab = "terminal" | "problems" | "output" | "debug" | "ports" | "tasks";

export interface StudioSettings {
  theme: "midnight" | "abyss" | "graphite";
  accent: "electric" | "cyan" | "violet" | "emerald";
  iconTheme: "pandatechs" | "minimal";
  fontFamily: "JetBrains Mono" | "IBM Plex Mono" | "monospace";
  fontSize: number;
  lineHeight: number;
  minimap: boolean;
  wordWrap: boolean;
  lineNumbers: boolean;
  folding: boolean;
  tabSize: number;
  insertSpaces: boolean;
  formatOnSave: boolean;
  autoSave: "off" | "afterDelay";
  suggestions: boolean;
  diagnostics: boolean;
  motion: "full" | "reduced" | "none";
  activityBar: boolean;
  statusBar: boolean;
  terminalFont: number;
  terminalCursor: "block" | "bar" | "underline";
  scrollback: number;
  defaultProfile: string;
  diffLayout: "split" | "inline";
  confirmDiscard: boolean;
  confirmCommitEmpty: boolean;
  gitAutoFetch: boolean;
  aiProvider: "sample" | "online";
  aiMode: "ask" | "edit" | "plan";
  aiDetail: "concise" | "detailed";
  aiHistory: boolean;
  aiMemory: boolean;
  aiRemoteWarning: boolean;
  aiApproveReadOnly: boolean;
  aiDefaultContext: { selection: boolean; file: boolean; problems: boolean; terminal: boolean; diff: boolean };
  extAutoUpdate: boolean;
  extRecommendations: boolean;
  keybindings: Record<string, string>;
}

export const DEFAULT_KEYS: Record<string, string> = {
  "palette.open": "Ctrl+Shift+P",
  "palette.files": "Ctrl+P",
  "file.save": "Ctrl+S",
  "view.sidebar": "Ctrl+B",
  "view.panel": "Ctrl+J",
  "view.terminal": "Ctrl+`",
  "editor.split": "Ctrl+\\",
  "editor.find": "Ctrl+F",
  "editor.replace": "Ctrl+H",
  "view.explorer": "Ctrl+Shift+E",
  "view.search": "Ctrl+Shift+F",
  "view.scm": "Ctrl+Shift+G",
  "view.debug": "Ctrl+Shift+D",
  "view.extensions": "Ctrl+Shift+X",
  "debug.start": "F5",
  "p.open": "Ctrl+Shift+I",
  "p.explain": "Ctrl+Shift+L",
  "settings.open": "Ctrl+,",
};

export const DEFAULT_SETTINGS: StudioSettings = {
  theme: "midnight",
  accent: "electric",
  iconTheme: "pandatechs",
  fontFamily: "JetBrains Mono",
  fontSize: 13,
  lineHeight: 1.6,
  minimap: true,
  wordWrap: false,
  lineNumbers: true,
  folding: true,
  tabSize: 2,
  insertSpaces: true,
  formatOnSave: false,
  autoSave: "off",
  suggestions: true,
  diagnostics: true,
  motion: "reduced",
  activityBar: true,
  statusBar: true,
  terminalFont: 12,
  terminalCursor: "block",
  scrollback: 1000,
  defaultProfile: "bash",
  diffLayout: "split",
  confirmDiscard: true,
  confirmCommitEmpty: true,
  gitAutoFetch: false,
  aiProvider: "sample",
  aiMode: "ask",
  aiDetail: "concise",
  aiHistory: true,
  aiMemory: false,
  aiRemoteWarning: true,
  aiApproveReadOnly: true,
  aiDefaultContext: { selection: true, file: true, problems: false, terminal: false, diff: false },
  extAutoUpdate: false,
  extRecommendations: true,
  keybindings: DEFAULT_KEYS,
};

export interface EditorGroup {
  tabs: EditorTab[];
  active: string | null;
}

export interface OutputLine {
  channel: "Pandatechs Studio" | "Git" | "Tasks" | "P AI" | "Extensions";
  text: string;
  at: number;
}

export interface TaskRun {
  id: string;
  name: string;
  command: string;
  status: "proposed" | "approved" | "rejected";
}

export interface StudioState {
  /* persisted */
  settings: StudioSettings;
  onboarded: boolean;
  sideWidth: number;
  panelHeight: number;
  recentCommands: string[];
  /* layout */
  view: ActivityView;
  sideVisible: boolean;
  panelVisible: boolean;
  panelMax: boolean;
  panelTab: PanelTab;
  pOpen: boolean;
  paletteOpen: boolean;
  paletteQuery: string;
  notifOpen: boolean;
  onboardingOpen: boolean;
  /* workspace */
  loading: boolean;
  source: DataSource;
  workspaceOpen: boolean;
  workspace: Workspace | null;
  recent: RecentWorkspace[];
  templates: ProjectTemplate[];
  tree: FileEntry[];
  expanded: string[];
  selected: string | null;
  files: Record<string, string>;
  saved: Record<string, string>;
  groups: EditorGroup[];
  focusedGroup: number;
  cursor: { line: number; col: number; selection: number };
  selectionText: string;
  diagnostics: Diagnostic[];
  /* git */
  git: GitStatus | null;
  originals: Record<string, string>;
  scmSelected: string | null;
  /* testing */
  tests: TestCase[];
  /* debug */
  launch: LaunchConfig[];
  launchId: string;
  debug: DebugSession | null;
  debugSteps: DebugStep[];
  breakpoints: Record<string, number[]>;
  watch: string[];
  debugConsole: string[];
  /* extensions & tools */
  extensions: Extension[];
  tools: DevTool[];
  /* terminal */
  profiles: TerminalProfile[];
  terminals: TerminalSessionInfo[];
  activeTerminal: string | null;
  splitTerminal: string | null;
  terminalSelection: string;
  /* panels */
  output: OutputLine[];
  tasks: TaskRun[];
  ports: { port: number; label: string; process: string }[];
  notifications: StudioNotification[];
  /* approvals */
  approvals: ProposedAction[];
  /* inline AI suggestion */
  inline: { path: string; pos: number; options: string[]; index: number; explanation: string } | null;
}

const ROOT_GROUP: EditorGroup = { tabs: [{ path: "studio:welcome", kind: "welcome", title: "Welcome" }], active: "studio:welcome" };

export const studioStore = createStore<StudioState>(
  {
    settings: DEFAULT_SETTINGS,
    onboarded: false,
    sideWidth: 268,
    panelHeight: 210,
    recentCommands: [],
    view: "explorer",
    sideVisible: true,
    panelVisible: true,
    panelMax: false,
    panelTab: "terminal",
    pOpen: false,
    paletteOpen: false,
    paletteQuery: "",
    notifOpen: false,
    onboardingOpen: false,
    loading: false,
    source: "sample",
    workspaceOpen: false,
    workspace: null,
    recent: [],
    templates: [],
    tree: [],
    expanded: [],
    selected: null,
    files: {},
    saved: {},
    groups: [ROOT_GROUP],
    focusedGroup: 0,
    cursor: { line: 1, col: 1, selection: 0 },
    selectionText: "",
    diagnostics: [],
    git: null,
    originals: {},
    scmSelected: null,
    tests: [],
    launch: [],
    launchId: "tests",
    debug: null,
    debugSteps: [],
    breakpoints: {},
    watch: ["samples.length", "total"],
    debugConsole: [],
    extensions: [],
    tools: [],
    profiles: [],
    terminals: [],
    activeTerminal: null,
    splitTerminal: null,
    terminalSelection: "",
    output: [],
    tasks: [],
    ports: [],
    notifications: [],
    approvals: [],
    inline: null,
  },
  ["settings", "onboarded", "sideWidth", "panelHeight", "recentCommands"],
  "pandatechs.studio.v1",
);

export const setStudio = studioStore.set;
export const getStudioState = studioStore.get;

export function useStudio<S>(selector: (s: StudioState) => S): S {
  return useSyncExternalStore(studioStore.subscribe, () => selector(studioStore.get()), () => selector(studioStore.get()));
}

export function updateSettings(patch: Partial<StudioSettings>) {
  studioStore.set((s) => ({ settings: { ...s.settings, ...patch } }));
}

/* ---------------- helpers ---------------- */
export const baseName = (p: string) => p.split("/").pop() ?? p;
export const relPath = (p: string, ws: Workspace | null = studioStore.get().workspace) => {
  const root = ws?.roots[0];
  return root && p.startsWith(root + "/") ? p.slice(root.length + 1) : p;
};
export const isDirty = (s: StudioState, path: string) => s.saved[path] !== undefined && s.files[path] !== s.saved[path];

export function log(channel: OutputLine["channel"], text: string) {
  studioStore.set((s) => ({ output: [...s.output.slice(-400), { channel, text, at: Date.now() }] }));
}

export function notify(n: Omit<StudioNotification, "id" | "at">) {
  studioStore.set((s) => ({ notifications: [{ ...n, id: uid("n"), at: Date.now() }, ...s.notifications].slice(0, 50) }));
}

/* ---------------- workspace ---------------- */
export async function loadStartData() {
  const st = getStudio();
  const [recent, templates] = await Promise.all([st.workspace.recent(), st.workspace.templates()]);
  setStudio({ recent: recent.data ?? [], templates: templates.data ?? [], source: recent.source });
}

export async function openWorkspace() {
  const st = getStudio();
  setStudio({ loading: true });
  const [ws, tree, diags, git, tests, exts, tools, launch, profiles] = await Promise.all([
    st.workspace.current(), st.workspace.tree(), st.diagnostics(), st.git.status(), st.tests.list(),
    st.extensions.list(), st.extensions.tools(), st.debug.configs(), st.terminal.profiles(),
  ]);
  if (!ws.data || !tree.data) {
    setStudio({ loading: false, source: ws.source, workspaceOpen: false });
    notify({ kind: "provider", tone: "warning", title: "Workspace unavailable", body: ws.error ?? "The native integration is not connected.", confirmed: false });
    return;
  }
  const files: Record<string, string> = {};
  await Promise.all(
    tree.data.filter((f) => f.kind === "file").map(async (f) => {
      const r = await st.workspace.read(f.path);
      if (r.data !== null) files[f.path] = r.data;
    }),
  );
  const originals: Record<string, string> = {};
  if (git.data) {
    await Promise.all(
      git.data.changes.flatMap((c) => [c.path, c.oldPath].filter(Boolean) as string[]).map(async (p) => {
        const r = await st.git.original(p);
        if (r.data !== null) originals[p] = r.data;
      }),
    );
  }
  const root = ws.data.roots[0]!;
  const term: TerminalSessionInfo = { id: uid("term"), title: "bash", profile: "bash", cwd: root };
  setStudio((s) => ({
    loading: false,
    source: ws.source,
    workspaceOpen: true,
    workspace: ws.data,
    tree: tree.data!,
    expanded: [root, `${root}/src`, `${root}/src/lib`],
    files,
    saved: { ...files },
    diagnostics: diags.data ?? [],
    git: git.data,
    originals,
    tests: tests.data ?? [],
    extensions: exts.data ?? [],
    tools: tools.data ?? [],
    launch: launch.data ?? [],
    profiles: profiles.data ?? [],
    terminals: s.terminals.length ? s.terminals : [term],
    activeTerminal: s.activeTerminal ?? term.id,
    ports: [{ port: 5173, label: "Portal dev server (sample)", process: "vite" }],
  }));
  openFile(`${root}/src/lib/metrics.ts`);
  log("Pandatechs Studio", `Opened workspace ${ws.data.name} (${ws.source}).`);
}

export function closeWorkspace() {
  setStudio({ workspaceOpen: false, workspace: null, tree: [], files: {}, saved: {}, groups: [ROOT_GROUP], focusedGroup: 0, git: null, diagnostics: [], tests: [], debug: null, inline: null });
}

/* ---------------- tabs & groups ---------------- */
export function openTab(tab: EditorTab, group?: number) {
  studioStore.set((s) => {
    const g = group ?? s.focusedGroup;
    const groups = s.groups.map((x, i) =>
      i !== g ? x : { tabs: x.tabs.some((t) => t.path === tab.path) ? x.tabs : [...x.tabs, tab], active: tab.path },
    );
    return { groups, focusedGroup: g, selected: tab.kind && tab.kind !== "file" ? s.selected : tab.path };
  });
}

export function openFile(path: string, group?: number) {
  openTab({ path, kind: "file" }, group);
}

export function closeTab(path: string, group: number) {
  studioStore.set((s) => {
    let groups = s.groups.map((x, i) => {
      if (i !== group) return x;
      const idx = x.tabs.findIndex((t) => t.path === path);
      const tabs = x.tabs.filter((t) => t.path !== path);
      const active = x.active === path ? (tabs[Math.min(idx, tabs.length - 1)]?.path ?? null) : x.active;
      return { tabs, active };
    });
    if (groups.length > 1 && groups[group]!.tabs.length === 0) groups = groups.filter((_, i) => i !== group);
    return { groups, focusedGroup: Math.min(s.focusedGroup, groups.length - 1) };
  });
}

export function moveTab(group: number, from: number, to: number) {
  studioStore.set((s) => ({
    groups: s.groups.map((g, i) => {
      if (i !== group) return g;
      const tabs = [...g.tabs];
      const [t] = tabs.splice(from, 1);
      if (t) tabs.splice(to, 0, t);
      return { ...g, tabs };
    }),
  }));
}

export function splitEditor() {
  studioStore.set((s) => {
    if (s.groups.length > 1) return { focusedGroup: 1 };
    const cur = s.groups[0]!;
    const active = cur.tabs.find((t) => t.path === cur.active) ?? cur.tabs[0];
    return { groups: [cur, { tabs: active ? [active] : [], active: active?.path ?? null }], focusedGroup: 1 };
  });
}

export function activeTab(s: StudioState = studioStore.get()): EditorTab | null {
  const g = s.groups[s.focusedGroup] ?? s.groups[0];
  return g?.tabs.find((t) => t.path === g.active) ?? null;
}

export function activeFile(s: StudioState = studioStore.get()): string | null {
  const t = activeTab(s);
  return t && (t.kind ?? "file") === "file" ? t.path : null;
}

/* ---------------- editing ---------------- */
export function setFileContent(path: string, content: string) {
  studioStore.set((s) => (s.files[path] === content ? {} : { files: { ...s.files, [path]: content } }));
}

export async function saveFile(path: string) {
  const s = studioStore.get();
  const content = s.files[path];
  if (content === undefined) return;
  const r = await getStudio().workspace.write(path, content);
  if (r.ok) {
    studioStore.set((x) => ({ saved: { ...x.saved, [path]: content } }));
    // saving a tracked file shows up in source control (sample git)
    studioStore.set((x) => {
      if (!x.git || x.git.changes.some((c) => c.path === path)) return {};
      if (x.originals[path] === undefined) return { originals: { ...x.originals, [path]: x.saved[path] ?? "" }, git: { ...x.git, changes: [...x.git.changes, { path, kind: "modified", staged: false }] } };
      return {};
    });
  }
  notify({ kind: "save", tone: r.ok ? "success" : "error", title: r.ok ? `Saved ${baseName(path)}` : "File save failed", body: r.message, confirmed: r.confirmedByNative, target: { path } });
  log("Pandatechs Studio", r.message);
  return r;
}

export function createEntry(parent: string, name: string, kind: "file" | "folder") {
  const path = `${parent}/${name}`;
  studioStore.set((s) => {
    if (s.tree.some((t) => t.path === path)) return {};
    const entry: FileEntry = { path, name, kind, language: kind === "file" ? undefined : undefined };
    return {
      tree: [...s.tree, entry],
      expanded: s.expanded.includes(parent) ? s.expanded : [...s.expanded, parent],
      ...(kind === "file" ? { files: { ...s.files, [path]: "" }, saved: { ...s.saved, [path]: "" } } : {}),
    };
  });
  if (kind === "file") openFile(path);
  return path;
}

export function renameEntry(path: string, nextName: string) {
  const parent = path.slice(0, path.lastIndexOf("/"));
  const next = `${parent}/${nextName}`;
  const swap = (p: string) => (p === path || p.startsWith(path + "/") ? next + p.slice(path.length) : p);
  const remap = <T,>(rec: Record<string, T>) => Object.fromEntries(Object.entries(rec).map(([k, v]) => [swap(k), v]));
  studioStore.set((s) => ({
    tree: s.tree.map((t) => (t.path === path || t.path.startsWith(path + "/") ? { ...t, path: swap(t.path), name: t.path === path ? nextName : t.name } : t)),
    files: remap(s.files),
    saved: remap(s.saved),
    expanded: s.expanded.map(swap),
    groups: s.groups.map((g) => ({ tabs: g.tabs.map((t) => ({ ...t, path: swap(t.path) })), active: g.active ? swap(g.active) : null })),
    selected: s.selected ? swap(s.selected) : null,
  }));
}

export function deleteEntry(path: string) {
  const hit = (p: string) => p === path || p.startsWith(path + "/");
  studioStore.set((s) => ({
    tree: s.tree.filter((t) => !hit(t.path)),
    files: Object.fromEntries(Object.entries(s.files).filter(([k]) => !hit(k))),
    saved: Object.fromEntries(Object.entries(s.saved).filter(([k]) => !hit(k))),
    groups: s.groups.map((g) => {
      const tabs = g.tabs.filter((t) => !hit(t.path));
      return { tabs, active: g.active && hit(g.active) ? (tabs[0]?.path ?? null) : g.active };
    }),
  }));
}

/* ---------------- terminal ---------------- */
export function newTerminal(profile?: string, split = false) {
  const s = studioStore.get();
  const prof = profile ?? s.settings.defaultProfile;
  const t: TerminalSessionInfo = { id: uid("term"), title: prof, profile: prof, cwd: s.workspace?.roots[0] ?? "/home/panda" };
  studioStore.set((x) => ({
    terminals: [...x.terminals, t],
    ...(split ? { splitTerminal: t.id } : { activeTerminal: t.id }),
    panelVisible: true,
    panelTab: "terminal",
  }));
}

export function closeTerminal(id: string) {
  studioStore.set((s) => {
    const terminals = s.terminals.filter((t) => t.id !== id);
    return {
      terminals,
      activeTerminal: s.activeTerminal === id ? (terminals[0]?.id ?? null) : s.activeTerminal,
      splitTerminal: s.splitTerminal === id ? null : s.splitTerminal,
    };
  });
}

/* ---------------- approvals ---------------- */
const resolvers = new Map<string, (ok: boolean) => void>();

/** Shows the approval card and resolves with the user's decision. Nothing runs before. */
export function requestApproval(action: ProposedAction): Promise<boolean> {
  return new Promise((resolve) => {
    resolvers.set(action.id, resolve);
    studioStore.set((s) => ({ approvals: [...s.approvals, action] }));
    notify({ kind: "approval", tone: "warning", title: "P needs your approval", body: action.title, confirmed: false });
  });
}

export function resolveApproval(id: string, ok: boolean) {
  resolvers.get(id)?.(ok);
  resolvers.delete(id);
  studioStore.set((s) => ({ approvals: s.approvals.filter((a) => a.id !== id) }));
}

/** Approval → bridge. Returns the honest bridge result, or null when rejected. */
export async function approveAndRun(action: ProposedAction) {
  const ok = await requestApproval(action);
  if (!ok) {
    log("P AI", `Rejected: ${action.title}${action.command ? ` (${action.command})` : ""}`);
    return null;
  }
  const r = await getStudio().execute(action);
  log("P AI", r.message);
  return r;
}
