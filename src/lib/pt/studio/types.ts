/**
 * Pandatechs Studio — data models and integration contracts.
 *
 * Studio screens only talk to `StudioIntegration`. The demo implementation
 * lives in `src/lib/pt/demo/studio.ts` (sample data, always labelled), the
 * native stub in `src/lib/pt/native/studio.ts`. See docs/STUDIO_INTEGRATION.md.
 */
import type { ActionResult, BridgeOperation, DataSource, Sourced } from "../types";

export type LanguageId =
  | "typescript" | "tsx" | "javascript" | "json" | "python" | "php" | "css"
  | "markdown" | "shell" | "yaml" | "plaintext";

/* ---------------- workspace & files ---------------- */
export interface FileEntry {
  path: string;
  name: string;
  kind: "file" | "folder";
  language?: LanguageId | undefined;
  readOnly?: boolean | undefined;
  /** credential-like files are never added to P's context automatically */
  secret?: boolean | undefined;
}

export interface Workspace {
  id: string;
  name: string;
  roots: string[];
  projectType: string;
  notes: string;
}

export interface RecentWorkspace {
  id: string;
  name: string;
  path: string;
  projectType: string;
  openedAt: string;
}

export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  /** runtimes the template expects; never assumed installed */
  requires: string[];
}

export interface EditorTab {
  path: string;
  /** virtual tabs: settings, welcome, diff */
  kind?: "file" | "settings" | "welcome" | "diff" | "extension";
  title?: string | undefined;
}

export interface Diagnostic {
  id: string;
  path: string;
  line: number;
  col: number;
  length: number;
  severity: "error" | "warning" | "info";
  message: string;
  source: string;
}

/* ---------------- git ---------------- */
export type GitChangeKind = "added" | "modified" | "deleted" | "renamed" | "conflict";
export interface GitChange {
  path: string;
  kind: GitChangeKind;
  staged: boolean;
  oldPath?: string | undefined;
}
export interface GitCommit {
  hash: string;
  message: string;
  author: string;
  at: string;
}
export interface GitStatus {
  branch: string;
  ahead: number;
  behind: number;
  branches: string[];
  changes: GitChange[];
  history: GitCommit[];
}

/* ---------------- terminal ---------------- */
export interface TerminalProfile {
  id: string;
  label: string;
  shell: string;
}
export interface TerminalSessionInfo {
  id: string;
  title: string;
  profile: string;
  cwd: string;
}

export interface TerminalLine {
  text: string;
  tone?: "out" | "err" | "dim" | "ok" | "cmd" | undefined;
}
export interface TerminalOutput {
  lines: TerminalLine[];
  clear?: boolean | undefined;
  cwd?: string | undefined;
}

/* ---------------- debug ---------------- */
export interface LaunchConfig {
  id: string;
  name: string;
  type: string;
  program: string;
}
export interface DebugFrame {
  name: string;
  path: string;
  line: number;
}
export interface DebugVariable {
  name: string;
  value: string;
  type: string;
  scope: "Local" | "Closure" | "Global";
}
export interface DebugStep {
  path: string;
  line: number;
  frames: DebugFrame[];
  variables: DebugVariable[];
  output?: string | undefined;
}
export interface DebugSession {
  configId: string;
  state: "running" | "paused" | "ended";
  stepIndex: number;
  /** prototype sessions are always simulated */
  simulated: boolean;
}

/* ---------------- extensions & tools ---------------- */
export interface Extension {
  id: string;
  name: string;
  publisher: string;
  version: string;
  description: string;
  category: string;
  installed: boolean;
  enabled: boolean;
  recommended?: boolean | undefined;
  updateAvailable?: string | undefined;
  /** "unknown" until the native extension host confirms */
  compatibility: "unknown" | "compatible" | "incompatible";
}
export interface DevTool {
  id: string;
  name: string;
  command: string;
  /** only "detected" when the native integration confirmed it */
  status: "unknown" | "detected" | "missing";
  version?: string | undefined;
}

/* ---------------- testing ---------------- */
export type TestStatus = "idle" | "running" | "passed" | "failed" | "skipped";
export interface TestCase {
  id: string;
  suite: string;
  name: string;
  path: string;
  line: number;
  status: TestStatus;
  durationMs?: number | undefined;
  message?: string | undefined;
}

/* ---------------- search ---------------- */
export interface SearchOptions {
  query: string;
  matchCase: boolean;
  wholeWord: boolean;
  regex: boolean;
  include: string;
  exclude: string;
}
export interface SearchMatch {
  path: string;
  line: number;
  col: number;
  length: number;
  preview: string;
}

/* ---------------- P coding assistant ---------------- */
export type AIContextKind =
  | "selection" | "file" | "tabs" | "files" | "project" | "terminal" | "problems" | "diff" | "logs";
export interface AIContextItem {
  id: string;
  kind: AIContextKind;
  label: string;
  detail: string;
  content: string;
}

export type AITaskKind =
  | "chat" | "explain" | "explain_function" | "find_bug" | "refactor" | "tests" | "docs"
  | "review_diff" | "explain_error" | "fix" | "new_file" | "project" | "env"
  | "explain_command" | "explain_output" | "draft_command" | "improve";

export interface AIEditProposal {
  id: string;
  path: string;
  before: string;
  after: string;
  summary: string;
  status: "pending" | "accepted" | "rejected";
}

export interface AIPlanStep {
  id: string;
  text: string;
  status: "todo" | "doing" | "done";
}
export interface AITask {
  id: string;
  goal: string;
  steps: AIPlanStep[];
  files: string[];
  dependencies: string[];
  risks: string[];
  permissions: string[];
  status: "draft" | "running" | "done" | "rejected";
  report?: string | undefined;
}

export interface AIMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
  context?: string[] | undefined;
  edit?: AIEditProposal | undefined;
  plan?: AITask | undefined;
  command?: ProposedAction | undefined;
  error?: boolean | undefined;
}
export interface AIConversation {
  id: string;
  title: string;
  messages: AIMessage[];
}

export interface AIRequest {
  task: AITaskKind;
  prompt: string;
  context: AIContextItem[];
  history: AIMessage[];
  /** active file, used by edit-style tasks */
  file?: { path: string; content: string; selection?: string | undefined } | undefined;
}
export interface AIResponse {
  content: string;
  /** replacement for `file.selection` (or the whole file) */
  replacement?: string | undefined;
  plan?: Omit<AITask, "id" | "status"> | undefined;
  command?: string | undefined;
}

export interface ProviderStatus {
  id: string;
  label: string;
  available: boolean;
  /** true when prompts leave this machine */
  offDevice: boolean;
  model: string;
  detail: string;
}

export interface StudioAIProvider {
  id: string;
  label: string;
  offDevice: boolean;
  status(): Promise<ProviderStatus>;
  stream(req: AIRequest, opts: { signal: AbortSignal; onToken: (t: string) => void }): Promise<AIResponse>;
}

/* ---------------- actions & approvals ---------------- */
export type ActionClass =
  | "read" | "create_file" | "edit_file" | "run_process" | "project_config"
  | "system_config" | "install" | "elevated" | "external";

export interface ProposedAction {
  id: string;
  actionClass: ActionClass;
  operation: BridgeOperation;
  title: string;
  target: string;
  reason: string;
  files: string[];
  risk: "low" | "medium" | "high";
  effect: string;
  /** exact command, when the action runs a process */
  command?: string | undefined;
}
export interface Approval {
  actionId: string;
  decision: "approved" | "rejected";
  at: number;
  result?: ActionResult | undefined;
}

/* ---------------- notifications ---------------- */
export interface StudioNotification {
  id: string;
  kind: "build" | "test" | "debug" | "git" | "ai" | "approval" | "provider" | "extension" | "save";
  tone: "info" | "success" | "warning" | "error";
  title: string;
  body: string;
  at: number;
  /** what "Inspect" navigates to */
  target?: { view?: string | undefined; panel?: string | undefined; path?: string | undefined } | undefined;
  /** true only when the native integration confirmed the result */
  confirmed: boolean;
}

/* ---------------- integration contract ---------------- */
export interface IntegrationStatus {
  workspace: DataSource;
  git: DataSource;
  terminal: DataSource;
  debug: DataSource;
  extensions: DataSource;
  tests: DataSource;
}

export interface StudioIntegration {
  mode: "demo" | "native";
  status(): IntegrationStatus;
  workspace: {
    current(): Promise<Sourced<Workspace>>;
    recent(): Promise<Sourced<RecentWorkspace[]>>;
    templates(): Promise<Sourced<ProjectTemplate[]>>;
    tree(): Promise<Sourced<FileEntry[]>>;
    read(path: string): Promise<Sourced<string>>;
    write(path: string, content: string): Promise<ActionResult>;
  };
  diagnostics(): Promise<Sourced<Diagnostic[]>>;
  git: {
    status(): Promise<Sourced<GitStatus>>;
    /** HEAD version of a file, for diffs */
    original(path: string): Promise<Sourced<string>>;
  };
  terminal: {
    profiles(): Promise<Sourced<TerminalProfile[]>>;
    /** demo: simulated output; native: the line is written to the user's real PTY */
    run(line: string, cwd: string): Promise<Sourced<TerminalOutput>>;
  };
  debug: {
    configs(): Promise<Sourced<LaunchConfig[]>>;
    script(configId: string): Promise<Sourced<DebugStep[]>>;
  };
  extensions: {
    list(): Promise<Sourced<Extension[]>>;
    tools(): Promise<Sourced<DevTool[]>>;
  };
  tests: {
    list(): Promise<Sourced<TestCase[]>>;
    /** results come from the real test runner in native mode */
    run(ids: string[]): Promise<Sourced<TestCase[]>>;
  };
  /** every effectful action goes through the approved-action bridge */
  execute(action: ProposedAction): Promise<ActionResult>;
}
