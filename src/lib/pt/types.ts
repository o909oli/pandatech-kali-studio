/**
 * Pandatechs Desktop — shared data models and native integration contracts.
 *
 * The UI only ever talks to these interfaces. `demo/` implements them with
 * clearly labelled sample data; `native/` implements them against the local
 * Pandatechs bridge service that Copilot builds on the Linux machine.
 * See docs/COPILOT_INTEGRATION.md.
 */

/** Where a value came from. The UI renders a badge for every non-live source. */
export type DataSource = "live" | "sample" | "unavailable" | "error";

export interface Sourced<T> {
  source: DataSource;
  data: T | null;
  /** epoch ms */
  updatedAt: number;
  error?: string | undefined;
}

/* ---------------- system ---------------- */
export interface SystemMetrics {
  cpuPercent: number;
  cpuModel: string;
  cores: number;
  memUsedBytes: number;
  memTotalBytes: number;
  rootUsedBytes: number;
  rootTotalBytes: number;
  cpuHistory: number[];
  memHistory: number[];
  diskIoHistory: number[];
  uptimeSec: number;
  loadAvg: [number, number, number];
  hostname: string;
  desktop: string;
  kernel: string;
}

export interface ProcessInfo {
  pid: number;
  name: string;
  user: string;
  cpuPercent: number;
  memPercent: number;
}

/* ---------------- network ---------------- */
export type InterfaceKind = "ethernet" | "wifi" | "loopback" | "vpn";
export interface NetInterface {
  name: string;
  kind: InterfaceKind;
  address: string | null;
  state: "up" | "down";
  ssid?: string;
  signal?: number;
}
export interface NetworkState {
  connected: boolean;
  primary: string;
  downBps: number;
  upBps: number;
  downHistory: number[];
  upHistory: number[];
  interfaces: NetInterface[];
  bluetooth: "on" | "off" | "unavailable";
}
export interface Connection {
  proto: "tcp" | "udp";
  local: string;
  remote: string;
  state: "ESTABLISHED" | "LISTEN" | "TIME_WAIT" | "CLOSE_WAIT" | "UNCONN" | "SYN_SENT";
  pid: number;
  process: string;
}

/* ---------------- files ---------------- */
export type FolderGlyph =
  | "home" | "desktop" | "documents" | "downloads" | "music" | "pictures" | "videos"
  | "templates" | "public" | "projects" | "code" | "tools" | "workspace" | "pentest"
  | "recon" | "exploits" | "payloads" | "wordlists" | "scans" | "reports" | "logs"
  | "configs" | "scripts" | "bruteforce" | "wireless" | "forensics" | "malware"
  | "osint" | "webapp" | "trash" | "filesystem" | "drive" | "network" | "generic";

export interface FsEntry {
  name: string;
  path: string;
  kind: "folder" | "file";
  glyph?: FolderGlyph | undefined;
  ext?: string | undefined;
  sizeBytes?: number;
  items?: number;
  modified: string; // ISO
  permissions: string;
  owner: string;
  group: string;
}
export interface Place {
  id: string;
  label: string;
  path: string;
  glyph: FolderGlyph;
  section: "places" | "devices" | "network";
}

/* ---------------- apps ---------------- */
export type InternalAppId =
  | "terminal" | "files" | "editor" | "notes" | "monitor" | "network" | "security"
  | "assistant" | "settings" | "applications" | "workspaces" | "browser" | "location";

export type AppCategory =
  | "favorites" | "information-gathering" | "vulnerability-analysis" | "web-application"
  | "exploitation" | "post-exploitation" | "password-auditing" | "wireless" | "forensics"
  | "reporting" | "reverse-engineering" | "social-engineering" | "system" | "accessories"
  | "development" | "ai";

export type LaunchSpec =
  | { kind: "internal"; appId: InternalAppId; props?: Record<string, unknown> }
  | { kind: "native"; desktopFile: string };

export interface AppEntry {
  id: string;
  name: string;
  category: AppCategory;
  description: string;
  /** lucide icon name used by AppGlyph */
  icon: string;
  /** "unknown" until the native bridge confirms */
  installed: boolean | "unknown";
  launch: LaunchSpec;
  favorite?: boolean;
}

/* ---------------- security ---------------- */
export interface FirewallStatus {
  active: boolean;
  backend: string;
  totalRules: number;
  allow: number;
  deny: number;
}
export interface SecurityEvent {
  id: string;
  level: "info" | "warning" | "critical";
  title: string;
  at: string;
  source: string;
}
export interface UpdateInfo {
  available: number;
  security: number;
  lastChecked: string;
}

/* ---------------- windows & notifications ---------------- */
export interface NativeWindow {
  id: string;
  title: string;
  app: string;
  icon: string;
  workspace: number;
  focused: boolean;
}
export interface NotificationItem {
  id: string;
  kind: "system" | "ai" | "done" | "error" | "warning" | "network";
  title: string;
  body: string;
  at: string;
  read?: boolean;
}

/* ---------------- assistant ---------------- */
export type AssistantState =
  | "idle" | "listening" | "thinking" | "responding" | "working"
  | "approval" | "done" | "error" | "offline";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: number;
  proposal?: ActionProposal;
  error?: boolean | undefined;
}

export interface ModelStatus {
  available: boolean;
  label: string;
  detail: string;
  models?: string[];
}

export interface AssistantReply {
  content: string;
  proposal?: ActionProposal;
}

export interface AssistantProvider {
  id: "demo" | "ollama" | string;
  label: string;
  /** Whether replies may leave this machine. Local providers return false. */
  sendsDataOffDevice: boolean;
  status(): Promise<ModelStatus>;
  send(
    history: ChatMessage[],
    opts: { signal: AbortSignal; onToken: (chunk: string) => void; model?: string | undefined },
  ): Promise<AssistantReply>;
}

export interface SpeechProvider {
  available: boolean;
  listen(opts: { signal: AbortSignal; onPartial: (text: string) => void }): Promise<string>;
  speak(text: string): Promise<void>;
}

/* ---------------- approved local actions ---------------- */
export type BridgeOperation =
  | "open_app"
  | "open_folder"
  | "show_metrics"
  | "list_interfaces"
  | "find_file"
  | "read_file_for_summary"
  | "create_folder"
  | "delete_file"
  | "install_package"
  | "remove_package"
  | "change_setting"
  | "change_firewall"
  | "run_security_tool"
  | "run_elevated"
  | "send_external"
  | "modify_boot_or_auth"
  /* Pandatechs Studio */
  | "read_workspace"
  | "create_file"
  | "write_file"
  | "run_process"
  | "git_change"
  | "change_project_config"
  | "install_extension";

export interface ActionProposal {
  id: string;
  operation: BridgeOperation;
  title: string;
  target: string;
  /** exact action shown to the user before approval */
  detail: string;
}

export interface ActionResult {
  ok: boolean;
  /** true ONLY when the native bridge confirmed the effect on the real system */
  confirmedByNative: boolean;
  message: string;
}

/* ---------------- providers ---------------- */
export interface SystemProvider {
  getMetrics(): Promise<Sourced<SystemMetrics>>;
  getProcesses(): Promise<Sourced<ProcessInfo[]>>;
}
export interface NetworkProvider {
  getState(): Promise<Sourced<NetworkState>>;
  getConnections(): Promise<Sourced<Connection[]>>;
}
export interface FileSystemProvider {
  places(): Promise<Sourced<Place[]>>;
  list(path: string): Promise<Sourced<FsEntry[]>>;
  recent(): Promise<Sourced<FsEntry[]>>;
}
export interface LauncherProvider {
  listApps(): Promise<Sourced<AppEntry[]>>;
  launchNative(desktopFile: string): Promise<ActionResult>;
}
export interface WindowProvider {
  listWindows(): Promise<Sourced<NativeWindow[]>>;
}
export interface SecurityProvider {
  firewall(): Promise<Sourced<FirewallStatus>>;
  events(): Promise<Sourced<SecurityEvent[]>>;
  updates(): Promise<Sourced<UpdateInfo>>;
}
export interface NotificationProvider {
  list(): Promise<Sourced<NotificationItem[]>>;
}
export interface ActionBridge {
  execute(proposal: ActionProposal): Promise<ActionResult>;
}

export interface Integration {
  mode: "demo" | "native";
  system: SystemProvider;
  network: NetworkProvider;
  files: FileSystemProvider;
  launcher: LauncherProvider;
  windows: WindowProvider;
  security: SecurityProvider;
  notifications: NotificationProvider;
  assistants: Record<string, AssistantProvider>;
  speech: SpeechProvider;
  bridge: ActionBridge;
}
