/**
 * Studio operations: Git, tests, debugging, extensions, tools, tasks and the
 * terminal. Every effectful step goes through `approveAndRun` (approval card →
 * integration bridge). In demo mode the bridge never performs anything, so the
 * prototype only updates its own sample state and says so.
 */
import { uid } from "../format";
import { commandAction, makeAction } from "./actions";
import { getStudio } from "./integration";
import {
  approveAndRun, baseName, getStudioState, log, notify, openFile, relPath, setFileContent, setStudio, studioStore,
} from "./store";
import type { ProposedAction, TerminalLine } from "./types";

const isDemo = () => getStudio().mode === "demo";
const gitAction = (a: Parameters<typeof makeAction>[0]): ProposedAction => ({ ...makeAction(a), operation: "git_change" });

/* ---------------- source control ---------------- */
export function setStaged(path: string, staged: boolean) {
  studioStore.set((s) => (s.git ? { git: { ...s.git, changes: s.git.changes.map((c) => (c.path === path ? { ...c, staged } : c)) } } : {}));
  log("Git", `${staged ? "Staged" : "Unstaged"} ${relPath(path)}${isDemo() ? " (sample repository)" : ""}`);
}

export function stageAll(staged: boolean) {
  studioStore.set((s) => (s.git ? { git: { ...s.git, changes: s.git.changes.map((c) => ({ ...c, staged })) } } : {}));
}

export async function discardChanges(path: string) {
  const s = getStudioState();
  const change = s.git?.changes.find((c) => c.path === path);
  if (!change) return;
  const r = await approveAndRun(
    gitAction({
      actionClass: "edit_file",
      risk: "high",
      title: `Discard changes in ${baseName(path)}`,
      target: relPath(path),
      reason: "You asked to throw away the uncommitted changes in this file.",
      files: [relPath(path)],
      effect: "Restores the last committed version. Uncommitted work in this file is lost and cannot be undone.",
      command: `git restore -- ${relPath(path)}`,
    }),
  );
  if (!r) return;
  if (isDemo()) {
    const original = s.originals[change.oldPath ?? path];
    if (original !== undefined && change.kind !== "added") setFileContent(path, original);
    studioStore.set((x) => ({
      git: x.git ? { ...x.git, changes: x.git.changes.filter((c) => c.path !== path) } : null,
      saved: original !== undefined ? { ...x.saved, [path]: original } : x.saved,
    }));
  }
  notify({ kind: "git", tone: r.confirmedByNative ? "success" : "info", title: "Discard changes", body: r.message, confirmed: r.confirmedByNative, target: { view: "scm" } });
}

export async function commit(message: string) {
  const s = getStudioState();
  const staged = s.git?.changes.filter((c) => c.staged) ?? [];
  if (!message.trim()) {
    notify({ kind: "git", tone: "warning", title: "Commit message needed", body: "Write a short message describing the change.", confirmed: false, target: { view: "scm" } });
    return false;
  }
  if (!staged.length && s.settings.confirmCommitEmpty) {
    notify({ kind: "git", tone: "warning", title: "Nothing staged", body: "Stage at least one file before committing.", confirmed: false, target: { view: "scm" } });
    return false;
  }
  const r = await approveAndRun(
    gitAction({
      actionClass: "edit_file",
      title: "Commit staged changes",
      target: s.git?.branch ?? "repository",
      reason: message,
      files: staged.map((c) => relPath(c.path)),
      effect: "Records the staged files as a new commit on the current branch.",
      command: `git commit -m ${JSON.stringify(message)}`,
    }),
  );
  if (!r) return false;
  if (isDemo()) {
    studioStore.set((x) =>
      x.git
        ? {
            git: {
              ...x.git,
              ahead: x.git.ahead + 1,
              changes: x.git.changes.filter((c) => !c.staged),
              history: [{ hash: uid("").slice(-7), message: `${message} (simulated)`, author: "panda", at: new Date().toISOString() }, ...x.git.history],
            },
          }
        : {},
    );
  }
  notify({ kind: "git", tone: r.confirmedByNative ? "success" : "info", title: isDemo() ? "Commit simulated" : "Commit", body: r.message, confirmed: r.confirmedByNative, target: { view: "scm" } });
  return true;
}

export async function syncRemote(direction: "pull" | "push") {
  const s = getStudioState();
  const r = await approveAndRun(
    gitAction({
      actionClass: "external",
      title: direction === "push" ? "Push commits to the remote" : "Pull from the remote",
      target: `origin/${s.git?.branch ?? "main"}`,
      reason: direction === "push" ? `Upload ${s.git?.ahead ?? 0} local commit(s).` : "Download new commits from the remote.",
      files: [],
      effect: direction === "push" ? "Your commits become visible on the remote repository." : "Merges remote commits into your branch.",
      command: `git ${direction}`,
    }),
  );
  if (!r) return;
  notify({ kind: "git", tone: r.confirmedByNative ? "success" : "info", title: `Git ${direction}`, body: r.message, confirmed: r.confirmedByNative, target: { view: "scm" } });
}

export async function switchBranch(branch: string) {
  const s = getStudioState();
  if (!s.git || branch === s.git.branch) return;
  const r = await approveAndRun(
    gitAction({ actionClass: "edit_file", title: `Switch to branch ${branch}`, target: branch, reason: "You picked another branch.", files: [], effect: "Checks out the branch. Uncommitted changes are kept or Git refuses.", command: `git switch ${branch}` }),
  );
  if (!r) return;
  if (isDemo()) studioStore.set((x) => (x.git ? { git: { ...x.git, branch } } : {}));
  notify({ kind: "git", tone: "info", title: "Branch switch", body: r.message, confirmed: r.confirmedByNative });
}

/* ---------------- tests ---------------- */
export async function runTests(ids?: string[]) {
  const s = getStudioState();
  const target = ids ?? s.tests.map((t) => t.id);
  if (!target.length) return;
  const r = await approveAndRun(
    makeAction({ actionClass: "run_process", title: "Run tests", target: s.workspace?.name ?? "workspace", reason: `${target.length} test(s) selected.`, files: [], effect: "Starts the project's test runner and shows the results.", command: "npx vitest run" }),
  );
  if (!r) return;
  studioStore.set((x) => ({ tests: x.tests.map((t) => (target.includes(t.id) ? { ...t, status: "running" } : t)) }));
  await new Promise((res) => setTimeout(res, 900));
  const res = await getStudio().tests.run(target);
  const byId = new Map((res.data ?? []).map((t) => [t.id, t]));
  studioStore.set((x) => ({ tests: x.tests.map((t) => byId.get(t.id) ?? (target.includes(t.id) ? { ...t, status: "idle" } : t)) }));
  const results = res.data ?? [];
  const failed = results.filter((t) => t.status === "failed").length;
  const passed = results.filter((t) => t.status === "passed").length;
  const sampleTag = res.source === "sample" ? " (sample results)" : "";
  log("Tasks", `Tests: ${passed} passed, ${failed} failed${sampleTag}`);
  notify({
    kind: "test",
    tone: res.source !== "live" ? (res.data ? "info" : "warning") : failed ? "error" : "success",
    title: res.data ? `Test run: ${passed} passed, ${failed} failed${sampleTag}` : "Test runner unavailable",
    body: res.error ?? (res.source === "sample" ? "Simulated results from the sample workspace." : "Results from the test runner."),
    confirmed: res.source === "live",
    target: { view: "testing" },
  });
}

/* ---------------- debugging (simulated in demo) ---------------- */
export async function startDebug(configId = getStudioState().launchId) {
  const cfg = getStudioState().launch.find((l) => l.id === configId);
  if (!cfg) return;
  const r = await approveAndRun(
    makeAction({ actionClass: "run_process", title: `Start debugging: ${cfg.name}`, target: cfg.program, reason: "You pressed Start Debugging.", files: [cfg.program], effect: "Launches the program under the debugger.", command: `${cfg.type} ${cfg.program}` }),
  );
  if (!r) return;
  const script = await getStudio().debug.script(configId);
  if (!script.data?.length) {
    notify({ kind: "debug", tone: "warning", title: "Debugger unavailable", body: script.error ?? "No debug adapter is connected.", confirmed: false, target: { view: "debug" } });
    return;
  }
  const simulated = script.source !== "live";
  setStudio({ debug: { configId, state: "paused", stepIndex: 0, simulated }, debugSteps: script.data, panelVisible: true, panelTab: "debug", view: "debug", debugConsole: [`${simulated ? "[SIMULATED] " : ""}Debug session started: ${cfg.name}`, ...(script.data[0]?.output ? [script.data[0].output] : [])] });
  revealStep(0);
}

function revealStep(i: number) {
  const step = getStudioState().debugSteps[i];
  if (!step) return;
  openFile(step.path);
}

export function debugStep(kind: "over" | "into" | "out" | "continue") {
  const s = getStudioState();
  if (!s.debug || s.debug.state === "ended") return;
  const last = s.debugSteps.length - 1;
  const next = kind === "continue" ? last : Math.min(last, s.debug.stepIndex + (kind === "out" ? 2 : 1));
  const step = s.debugSteps[next];
  setStudio({ debug: { ...s.debug, stepIndex: next, state: "paused" }, debugConsole: [...s.debugConsole, `${s.debug.simulated ? "[SIMULATED] " : ""}step ${kind} → ${relPath(step?.path ?? "")}:${step?.line ?? "?"}`, ...(step?.output ? [step.output] : [])] });
  revealStep(next);
}

export function stopDebug() {
  const s = getStudioState();
  if (!s.debug) return;
  setStudio({ debug: { ...s.debug, state: "ended" }, debugConsole: [...s.debugConsole, `${s.debug.simulated ? "[SIMULATED] " : ""}Debug session ended.`] });
  notify({ kind: "debug", tone: "info", title: s.debug.simulated ? "Simulated debug session ended" : "Debug session ended", body: "No real program was run in demo mode.", confirmed: !s.debug.simulated, target: { panel: "debug" } });
}

export function restartDebug() {
  const s = getStudioState();
  if (!s.debug) return;
  setStudio({ debug: { ...s.debug, stepIndex: 0, state: "paused" }, debugConsole: [...s.debugConsole, "Restarted."] });
  revealStep(0);
}

export function toggleBreakpoint(path: string, line: number) {
  studioStore.set((s) => {
    const cur = s.breakpoints[path] ?? [];
    return { breakpoints: { ...s.breakpoints, [path]: cur.includes(line) ? cur.filter((l) => l !== line) : [...cur, line].sort((a, b) => a - b) } };
  });
}

/* ---------------- extensions & tools ---------------- */
export async function extensionAction(id: string, op: "install" | "uninstall" | "update") {
  const ext = getStudioState().extensions.find((e) => e.id === id);
  if (!ext) return;
  const r = await approveAndRun({
    ...makeAction({ actionClass: "install", risk: "medium", title: `${op[0]!.toUpperCase()}${op.slice(1)} ${ext.name}`, target: `${ext.publisher} · ${ext.id}`, reason: "You chose this in Pandatechs Extensions.", files: [], effect: op === "uninstall" ? "Removes the extension from Pandatechs Studio." : "Downloads and installs the extension. Review its publisher first." }),
    operation: "install_extension",
  });
  if (!r) return;
  notify({ kind: "extension", tone: r.confirmedByNative ? "success" : "info", title: `Extension ${op}`, body: r.message, confirmed: r.confirmedByNative, target: { view: "extensions" } });
}

export function setExtensionEnabled(id: string, enabled: boolean) {
  studioStore.set((s) => ({ extensions: s.extensions.map((e) => (e.id === id ? { ...e, enabled } : e)) }));
  log("Extensions", `${enabled ? "Enabled" : "Disabled"} ${id} for this session${isDemo() ? " (sample)" : ""}.`);
}

export async function detectTools() {
  const r = await approveAndRun(
    makeAction({ actionClass: "read", title: "Detect developer tools", target: "this machine", reason: "Checks which runtimes and tools are installed.", files: [], effect: "Runs version checks only (git --version, node --version …). Nothing is installed.", command: "git --version; node --version; python3 --version; php --version" }),
  );
  if (!r) return;
  notify({ kind: "extension", tone: "info", title: "Tool detection", body: r.confirmedByNative ? r.message : `${r.message} Tools stay "Unknown" until the native integration reports them.`, confirmed: r.confirmedByNative, target: { view: "extensions" } });
}

/* ---------------- tasks ---------------- */
export const TASKS = [
  { name: "dev", command: "npm run dev" },
  { name: "build", command: "npm run build" },
  { name: "test", command: "npm test" },
  { name: "report", command: "python3 scripts/report.py" },
];

export async function runTask(name: string, command: string) {
  const s = getStudioState();
  const id = uid("task");
  studioStore.set((x) => ({ tasks: [...x.tasks, { id, name, command, status: "proposed" }], panelVisible: true, panelTab: "tasks" }));
  const r = await approveAndRun(commandAction(command, `Task "${name}"`, s.workspace?.roots[0] ?? "~"));
  studioStore.set((x) => ({ tasks: x.tasks.map((t) => (t.id === id ? { ...t, status: r ? "approved" : "rejected" } : t)) }));
  if (r) {
    const out = await getStudio().terminal.run(command, s.workspace?.roots[0] ?? "~");
    for (const l of out.data?.lines ?? []) log("Tasks", l.text);
    notify({ kind: "build", tone: "info", title: `Task ${name}${out.source === "sample" ? " (sample output)" : ""}`, body: r.message, confirmed: r.confirmedByNative, target: { panel: "output" } });
  }
}

/* ---------------- terminal ---------------- */
export interface TermEntry {
  cwd: string;
  cmd?: string | undefined;
  lines: TerminalLine[];
}
const termBuffers = new Map<string, TermEntry[]>();
export const getTermBuffer = (id: string) => termBuffers.get(id) ?? [];

export async function runInTerminal(id: string, line: string) {
  const s = getStudioState();
  const t = s.terminals.find((x) => x.id === id);
  if (!t) return;
  const res = await getStudio().terminal.run(line, t.cwd);
  const out = res.data ?? { lines: [{ text: res.error ?? "Terminal unavailable.", tone: "err" as const }] };
  const prev = termBuffers.get(id) ?? [];
  termBuffers.set(id, out.clear ? [] : [...prev, { cwd: t.cwd, cmd: line, lines: out.lines }].slice(-Math.max(50, s.settings.scrollback / 10)));
  studioStore.set((x) => ({ terminals: x.terminals.map((tt) => (tt.id === id ? { ...tt, cwd: out.cwd ?? tt.cwd, title: line.split(" ")[0] || tt.title } : tt)) }));
}

export function clearTerminal(id: string) {
  termBuffers.set(id, []);
  studioStore.set((x) => ({ terminals: [...x.terminals] }));
}

export function terminalText(id: string) {
  return getTermBuffer(id)
    .map((e) => [e.cmd !== undefined ? `$ ${e.cmd}` : null, ...e.lines.map((l) => l.text)].filter(Boolean).join("\n"))
    .join("\n");
}
