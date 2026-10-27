/**
 * P AI Coding Assistant — provider abstraction and conversation controller.
 *
 * Providers: "sample" (offline mock, default) and "online" (P through the
 * app's /api/p-code route). Remote providers only receive the context items
 * the user can see and remove, after an explicit send_external approval.
 */
import { useSyncExternalStore } from "react";
import { createStore } from "../store";
import { uid } from "../format";
import { commandAction, makeAction } from "./actions";
import { diffLines, summarize } from "./diff";
import {
  activeFile, approveAndRun, baseName, createEntry, getStudioState, log, notify, relPath, requestApproval,
  setFileContent, setStudio,
} from "./store";
import type {
  AIContextItem, AIMessage, AIRequest, AIResponse, AITask, AITaskKind, ProviderStatus, StudioAIProvider,
} from "./types";

/* ---------------- sample provider (offline, deterministic) ---------------- */

const wait = (ms: number, signal: AbortSignal) =>
  new Promise<void>((res, rej) => {
    const t = setTimeout(res, ms);
    signal.addEventListener("abort", () => {
      clearTimeout(t);
      rej(new DOMException("Aborted", "AbortError"));
    });
  });

async function typeOut(text: string, signal: AbortSignal, onToken: (t: string) => void) {
  const parts = text.match(/\S+\s*/g) ?? [text];
  for (const p of parts) {
    await wait(14, signal);
    onToken(p);
  }
}

const exportedFns = (code: string) =>
  [...code.matchAll(/export\s+(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)/g)].map((m) => ({ name: m[1]!, params: m[2]!.trim() }));

/** Adds a short doc comment above exported functions that have none. */
function addDocs(code: string): string {
  const lines = code.split("\n");
  const out: string[] = [];
  lines.forEach((l, i) => {
    const m = l.match(/^export\s+(?:async\s+)?function\s+(\w+)/);
    const prev = lines[i - 1]?.trim() ?? "";
    if (m && !prev.endsWith("*/")) out.push(`/** ${m[1]!.replace(/([A-Z])/g, " $1").toLowerCase().trim()} — documented by P (sample). */`);
    out.push(l);
  });
  return out.join("\n");
}

const FIXED_METRICS = (code: string) =>
  code
    .replace(
      /export function averageLoad\(samples: Sample\[\]\): number \{[\s\S]*?\n\}/,
      `export function averageLoad(samples: Sample[]): number {
  if (samples.length === 0) return 0;
  let total = 0;
  for (const s of samples) total += s.cpu;
  return total / samples.length;
}`,
    );

function sampleEdit(req: AIRequest): string | undefined {
  const f = req.file;
  if (!f) return undefined;
  const src = f.selection || f.content;
  if (/averageLoad/.test(src) && /i <= samples\.length/.test(src)) return FIXED_METRICS(src);
  if (req.task === "docs" || req.task === "refactor" || req.task === "improve") {
    const next = addDocs(src).replace(/[ \t]+$/gm, "");
    return next !== src ? next : undefined;
  }
  return undefined;
}

function sampleReply(req: AIRequest): AIResponse {
  const f = req.file;
  const name = f ? baseName(f.path) : "this file";
  const problems = req.context.find((c) => c.kind === "problems")?.content ?? "";
  const term = req.context.find((c) => c.kind === "terminal")?.content ?? "";
  const diff = req.context.find((c) => c.kind === "diff")?.content ?? "";
  const fns = f ? exportedFns(f.selection || f.content) : [];
  switch (req.task) {
    case "explain":
    case "explain_function": {
      const what = f?.selection ? "The selected code" : `\`${name}\``;
      return {
        content:
          `${what} ${fns.length ? `exports ${fns.map((x) => `\`${x.name}(${x.params})\``).join(", ")}.` : "has no exported functions."}\n\n` +
          (fns.some((x) => x.name === "averageLoad")
            ? "`averageLoad` sums the `cpu` field of every sample and divides by the count. The loop uses `i <= samples.length`, so the last iteration reads past the end of the array.\n\n"
            : "") +
          "*Sample provider: this explanation is generated offline from the file structure.*",
      };
    }
    case "find_bug":
    case "fix":
    case "explain_error": {
      const replacement = sampleEdit(req);
      const found = problems || (f && /i <= samples\.length/.test(f.content) ? "Off-by-one in averageLoad loop" : "");
      return {
        content: found
          ? `I found ${problems ? "these problems" : "a likely bug"}:\n\n${(problems || found).split("\n").slice(0, 5).map((l) => `- ${l}`).join("\n")}\n\n${replacement ? "Here is a proposed fix. Review the diff before accepting." : "I don't have a safe automatic fix for this one."}`
          : `I didn't spot an obvious bug in \`${name}\`. Try sharing Problems or terminal output as context.`,
        replacement,
      };
    }
    case "refactor":
    case "improve":
    case "docs": {
      const replacement = sampleEdit(req);
      return {
        content: replacement
          ? `Proposed ${req.task === "docs" ? "documentation" : "improvement"} for \`${name}\`. Nothing changes until you accept the diff.`
          : `\`${name}\` already looks tidy to the sample provider. Switch to P Online for a deeper refactor.`,
        replacement,
      };
    }
    case "tests":
      return {
        content: `I drafted a test file for \`${name}\` covering ${fns.length || "its"} exported function${fns.length === 1 ? "" : "s"}. Accepting creates a new file.`,
        replacement: `import { describe, expect, it } from "vitest";\nimport { ${fns.map((x) => x.name).join(", ") || "subject"} } from "./${name.replace(/\.(tsx?|jsx?)$/, "")}";\n\ndescribe("${name}", () => {\n${(fns.length ? fns : [{ name: "subject" }]).map((x) => `  it("${x.name} works", () => {\n    expect(${x.name}).toBeDefined();\n  });`).join("\n\n")}\n});\n`,
      };
    case "review_diff": {
      const files = [...diff.matchAll(/^### (.+)$/gm)].map((m) => m[1]);
      return {
        content:
          `**Review summary (sample)**\n\n- ${files.length} file${files.length === 1 ? "" : "s"} changed: ${files.join(", ") || "none"}.\n` +
          (diff.includes("i <= samples.length") ? "- `metrics.ts`: the new loop `i <= samples.length` introduces an off-by-one read; the previous `for…of` was safer.\n" : "") +
          (diff.includes("old-auth.php") ? "- `legacy/old-auth.php` is deleted — confirm nothing still includes it.\n" : "") +
          "- Suggest adding a test for the empty-samples case before committing.",
      };
    }
    case "explain_output":
    case "explain_command": {
      const text = req.prompt || term;
      const err = text.split("\n").find((l) => /error|not found|denied|failed/i.test(l));
      return {
        content: err
          ? `The important line is:\n\n\`${err.trim()}\`\n\n${/command not found/.test(err) ? "The demo shell doesn't know that command. In the native build your real shell runs it." : "It means the previous step failed; check the file and line it mentions."}`
          : `This ${req.task === "explain_command" ? "command" : "output"} looks normal:\n\n\`\`\`\n${text.slice(0, 400)}\n\`\`\``,
      };
    }
    case "draft_command": {
      const p = req.prompt.toLowerCase();
      const command = /test/.test(p) ? "npm test" : /install|depend/.test(p) ? "npm install" : /build/.test(p) ? "npm run build" : /lint/.test(p) ? "npx eslint src" : /status|change/.test(p) ? "git status" : "npm run dev";
      return { content: `Here's a command for that. It will not run until you approve it.`, command };
    }
    case "project": {
      const tree = req.context.find((c) => c.kind === "project")?.content ?? "";
      return { content: `**Project structure (sample)**\n\n\`\`\`\n${tree.slice(0, 900)}\n\`\`\`\n\n- \`src/\` holds the React portal, \`api/\` a tiny Node server, \`scripts/\` Python reporting and \`legacy/\` older PHP code.` };
    }
    case "env":
      return { content: "To set up this workspace you'll likely need **Node.js 20+** and **npm**; `scripts/report.py` needs **Python 3**. I can't see which tools are installed — open Extensions › Developer tools and run detection through the native integration." };
    case "new_file":
      return { content: "I drafted a new file. Accepting creates it in the workspace (in this session only in demo mode).", replacement: `// ${req.prompt || "new module"}\nexport function todo() {\n  return null;\n}\n` };
    default: {
      const p = req.prompt.toLowerCase();
      if (/plan|implement|build|add .* feature/.test(p)) {
        return {
          content: "Here's a plan. Edit any step before you start it.",
          plan: {
            goal: req.prompt,
            steps: [
              { id: uid("s"), text: "Fix averageLoad off-by-one and empty input", status: "todo" },
              { id: uid("s"), text: "Add tests for empty samples and peak()", status: "todo" },
              { id: uid("s"), text: "Show a loading state in App.tsx while samples are empty", status: "todo" },
              { id: uid("s"), text: "Run the test suite and review the diff", status: "todo" },
            ],
            files: ["src/lib/metrics.ts", "src/lib/metrics.test.ts", "src/App.tsx"],
            dependencies: ["vitest (already in devDependencies)"],
            risks: ["Changing averageLoad's return for empty input may affect callers expecting NaN."],
            permissions: ["Edit files", "Run a process (npm test)"],
          },
        };
      }
      return {
        content:
          "I'm on the **sample provider**, so I answer offline from the workspace structure. I can explain code, find bugs, propose fixes and tests, review diffs and draft commands. Switch to **P Online** in the provider menu for open conversation.",
      };
    }
  }
}

export const sampleProvider: StudioAIProvider = {
  id: "sample",
  label: "P · Sample (offline)",
  offDevice: false,
  async status(): Promise<ProviderStatus> {
    return { id: "sample", label: "Sample", available: true, offDevice: false, model: "pandatechs-sample", detail: "Offline mock. Nothing leaves this machine." };
  },
  async stream(req, { signal, onToken }) {
    await wait(260, signal);
    const r = sampleReply(req);
    await typeOut(r.content, signal, onToken);
    return r;
  },
};

/* ---------------- online provider (P via /api/p-code) ---------------- */

const fence = (text: string, langs?: RegExp) => {
  const blocks = [...text.matchAll(/```([\w-]*)\n([\s\S]*?)```/g)];
  const pick = langs ? blocks.filter((b) => langs.test(b[1] ?? "")) : blocks;
  return pick.at(-1)?.[2];
};

export const onlineProvider: StudioAIProvider = {
  id: "online",
  label: "P · Online (Lovable AI)",
  offDevice: true,
  async status() {
    return { id: "online", label: "Online", available: true, offDevice: true, model: "P online", detail: "Prompts and the context you share are processed online." };
  },
  async stream(req, { signal, onToken }) {
    const res = await fetch("/api/p-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal,
      body: JSON.stringify({
        task: req.task,
        prompt: req.prompt.slice(0, 4000),
        detail: getStudioState().settings.aiDetail,
        context: req.context.map((c) => ({ label: c.label, content: c.content.slice(0, 12000) })),
        history: req.history.filter((m) => !m.error && m.content.trim()).slice(-12).map((m) => ({ role: m.role, content: m.content.slice(0, 4000) })),
        file: req.file ? { path: relPath(req.file.path), selection: Boolean(req.file.selection) } : undefined,
      }),
    });
    if (!res.ok || !res.body) {
      const j = (await res.json().catch(() => null)) as { error?: string } | null;
      throw new Error(j?.error ?? `P could not reply (error ${res.status}).`);
    }
    const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
    let buf = "";
    let content = "";
    let failure: string | undefined;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += value;
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";
      for (const l of lines) {
        if (!l.trim()) continue;
        const ev = JSON.parse(l) as { t: string; d?: string; message?: string };
        if (ev.t === "text" && ev.d) {
          content += ev.d;
          onToken(ev.d);
        } else if (ev.t === "error") failure = ev.message ?? "P could not reply.";
      }
    }
    if (failure && !content) throw new Error(failure);
    const out: AIResponse = { content };
    if (EDIT_TASKS.includes(req.task)) out.replacement = fence(content, /^(?!bash|sh|shell|json$)/);
    if (req.task === "draft_command") out.command = fence(content, /^(bash|sh|shell|)$/)?.trim().split("\n")[0];
    if (/plan/.test(req.prompt.toLowerCase())) {
      const raw = fence(content, /^json$/);
      try {
        const p = raw ? (JSON.parse(raw) as Partial<NonNullable<AIResponse["plan"]>> & { steps?: (string | { text: string })[] }) : null;
        if (p?.steps?.length)
          out.plan = {
            goal: String(p.goal ?? req.prompt),
            steps: p.steps.map((s) => ({ id: uid("s"), text: typeof s === "string" ? s : s.text, status: "todo" as const })),
            files: (p.files ?? []).map(String),
            dependencies: (p.dependencies ?? []).map(String),
            risks: (p.risks ?? []).map(String),
            permissions: (p.permissions ?? []).map(String),
          };
      } catch {
        /* plan stays as text */
      }
    }
    return out;
  },
};

export const STUDIO_PROVIDERS: Record<string, StudioAIProvider> = { sample: sampleProvider, online: onlineProvider };
const EDIT_TASKS: AITaskKind[] = ["find_bug", "fix", "refactor", "improve", "docs", "tests", "explain_error", "new_file"];

/* ---------------- context ---------------- */

const SECRET = /(^|\/)(\.env(\..*)?|id_rsa.*|.*\.pem|.*\.key|credentials.*|secrets?\..*)$/i;
export const isSecretPath = (p: string) => SECRET.test(p);

export function projectOutline(): string {
  const s = getStudioState();
  const root = s.workspace?.roots[0] ?? "";
  return s.tree
    .filter((t) => t.path !== root)
    .map((t) => relPath(t.path))
    .sort()
    .map((p) => `${"  ".repeat(p.split("/").length - 1)}${p.split("/").pop()}${s.tree.find((t) => relPath(t.path) === p)?.kind === "folder" ? "/" : ""}`)
    .join("\n");
}

export function gitDiffText(): string {
  const s = getStudioState();
  if (!s.git) return "";
  return s.git.changes
    .map((c) => {
      const before = s.originals[c.oldPath ?? c.path] ?? "";
      const after = c.kind === "deleted" ? "" : (s.files[c.path] ?? "");
      const d = diffLines(before, after).filter((l) => l.kind !== "same").slice(0, 60);
      return `### ${relPath(c.path)} (${c.kind})\n${d.map((l) => `${l.kind === "add" ? "+" : "-"} ${l.text}`).join("\n")}`;
    })
    .join("\n\n");
}

/** Builds one context item. Credential files are never included. */
export function buildContext(kind: AIContextItem["kind"], extra?: { paths?: string[]; text?: string }): AIContextItem | null {
  const s = getStudioState();
  const file = activeFile(s);
  switch (kind) {
    case "selection":
      if (!s.selectionText.trim() || !file) return null;
      return { id: "selection", kind, label: "Selected text", detail: `${s.selectionText.split("\n").length} lines in ${baseName(file)}`, content: s.selectionText };
    case "file":
      if (!file || isSecretPath(file)) return null;
      return { id: `file:${file}`, kind, label: baseName(file), detail: relPath(file), content: s.files[file] ?? "" };
    case "tabs": {
      const paths = [...new Set(s.groups.flatMap((g) => g.tabs).filter((t) => (t.kind ?? "file") === "file").map((t) => t.path))].filter((p) => !isSecretPath(p));
      if (!paths.length) return null;
      return { id: "tabs", kind, label: "Open tabs", detail: paths.map(baseName).join(", "), content: paths.map((p) => `### ${relPath(p)}\n${s.files[p] ?? ""}`).join("\n\n") };
    }
    case "files": {
      const paths = (extra?.paths ?? []).filter((p) => !isSecretPath(p));
      if (!paths.length) return null;
      return { id: `files:${paths.join(",")}`, kind, label: `${paths.length} selected file${paths.length === 1 ? "" : "s"}`, detail: paths.map(baseName).join(", "), content: paths.map((p) => `### ${relPath(p)}\n${s.files[p] ?? ""}`).join("\n\n") };
    }
    case "project":
      return { id: "project", kind, label: "Project structure", detail: `${s.tree.length} entries (names only)`, content: projectOutline() };
    case "terminal": {
      const t = extra?.text ?? s.terminalSelection;
      if (!t.trim()) return null;
      return { id: "terminal", kind, label: "Terminal output", detail: `${t.split("\n").length} lines`, content: t };
    }
    case "problems": {
      if (!s.diagnostics.length) return null;
      return { id: "problems", kind, label: "Problems", detail: `${s.diagnostics.length} diagnostics`, content: s.diagnostics.map((d) => `${relPath(d.path)}:${d.line}:${d.col} ${d.severity}: ${d.message}`).join("\n") };
    }
    case "diff": {
      const d = gitDiffText();
      if (!d) return null;
      return { id: "diff", kind, label: "Git diff", detail: `${s.git?.changes.length ?? 0} changed files`, content: d };
    }
    case "logs": {
      const text = extra?.text ?? s.files[`${s.workspace?.roots[0]}/logs/build.log`] ?? "";
      if (!text) return null;
      return { id: "logs", kind, label: "Selected logs", detail: "logs/build.log", content: text };
    }
  }
}

/* ---------------- conversation controller ---------------- */

interface AIState {
  messages: AIMessage[];
  streaming: boolean;
  context: AIContextItem[];
  /** remote sharing approved for this session */
  remoteConsent: boolean;
  task: string | null;
}

const WELCOME: AIMessage = {
  id: "p-welcome",
  role: "assistant",
  createdAt: Date.now(),
  content: "P here, boss. Select code and ask me to explain it, find a bug, or improve it. I'll show a diff first — nothing changes until you accept.",
};

export const aiStore = createStore<AIState>({ messages: [WELCOME], streaming: false, context: [], remoteConsent: false, task: null });
export const useAI = <S,>(sel: (s: AIState) => S): S =>
  useSyncExternalStore(aiStore.subscribe, () => sel(aiStore.get()), () => sel(aiStore.get()));

export function addContext(item: AIContextItem | null) {
  if (!item) return;
  aiStore.set((s) => ({ context: [...s.context.filter((c) => c.id !== item.id), item] }));
}
export function removeContext(id: string) {
  aiStore.set((s) => ({ context: s.context.filter((c) => c.id !== id) }));
}
export function clearConversation() {
  controller?.abort();
  aiStore.set({ messages: [WELCOME], streaming: false, task: null });
}

/** Refreshes default context (selection, file …) according to settings. */
export function defaultContext(): AIContextItem[] {
  const d = getStudioState().settings.aiDefaultContext;
  const out: AIContextItem[] = [];
  const push = (c: AIContextItem | null) => c && out.push(c);
  if (d.selection) push(buildContext("selection"));
  if (d.file) push(buildContext("file"));
  if (d.problems) push(buildContext("problems"));
  if (d.terminal) push(buildContext("terminal"));
  if (d.diff) push(buildContext("diff"));
  return out;
}

export const TASK_LABEL: Record<AITaskKind, string> = {
  chat: "Ask", explain: "Explain selected code", explain_function: "Explain this function", find_bug: "Find a bug",
  refactor: "Suggest a refactor", tests: "Generate tests", docs: "Draft documentation", review_diff: "Review the diff",
  explain_error: "Explain this error", fix: "Suggest a fix", new_file: "Propose a new file", project: "Explain project structure",
  env: "Help configure the environment", explain_command: "Explain command", explain_output: "Explain output",
  draft_command: "Draft a command", improve: "Improve this code",
};

let controller: AbortController | null = null;

export function stopAI() {
  controller?.abort();
}

export async function askP(task: AITaskKind, prompt = "", extraContext: AIContextItem[] = []) {
  if (aiStore.get().streaming) return;
  setStudio({ pOpen: true });
  const st = getStudioState();
  const providerId = st.settings.aiProvider;
  const provider = STUDIO_PROVIDERS[providerId] ?? sampleProvider;

  // merge context: user-curated chips + defaults for this task + extras
  const auto = [...defaultContext(), ...extraContext];
  if (task === "review_diff") auto.push(buildContext("diff")!);
  if (task === "project") auto.push(buildContext("project")!);
  if (task === "explain_error" || task === "fix") {
    const p = buildContext("problems");
    if (p) auto.push(p);
  }
  for (const c of auto.filter(Boolean)) addContext(c);
  const context = aiStore.get().context;

  // remote providers need an explicit approval listing exactly what is shared
  if (provider.offDevice && (!aiStore.get().remoteConsent || st.settings.aiRemoteWarning)) {
    const ok = await requestApproval(
      makeAction({
        actionClass: "external",
        title: "Send this context to P Online",
        target: "Lovable AI (online)",
        reason: "The online provider processes your prompt and the context items below on a remote server.",
        files: context.map((c) => `${c.label} — ${c.detail}`),
        effect: "The listed items leave this machine for this request only. Credential files are never included.",
      }),
    );
    if (!ok) {
      notify({ kind: "ai", tone: "info", title: "Nothing was sent", body: "You rejected sharing context with P Online.", confirmed: false });
      return;
    }
    aiStore.set({ remoteConsent: true });
  }

  const file = activeFile(st);
  const userText = prompt || TASK_LABEL[task];
  const userMsg: AIMessage = { id: uid("m"), role: "user", content: userText, createdAt: Date.now(), context: context.map((c) => c.label) };
  const botId = uid("m");
  const history = aiStore.get().messages;
  aiStore.set({ messages: [...history, userMsg, { id: botId, role: "assistant", content: "", createdAt: Date.now() }], streaming: true, task: TASK_LABEL[task] });
  const patch = (p: Partial<AIMessage>) => aiStore.set((s) => ({ messages: s.messages.map((m) => (m.id === botId ? { ...m, ...p } : m)) }));

  controller = new AbortController();
  const req: AIRequest = {
    task,
    prompt,
    context,
    history: [...history, userMsg],
    file: file ? { path: file, content: st.files[file] ?? "", selection: context.some((c) => c.kind === "selection") ? st.selectionText : undefined } : undefined,
  };
  try {
    let acc = "";
    const r = await provider.stream(req, { signal: controller.signal, onToken: (t) => patch({ content: (acc += t) }) });
    const extra: Partial<AIMessage> = { content: r.content };
    if (r.replacement !== undefined && file) {
      const isNew = task === "tests" || task === "new_file";
      const path = isNew ? newFilePath(file, task) : file;
      const before = isNew ? "" : (st.files[file] ?? "");
      const after = isNew ? r.replacement : req.file?.selection ? before.replace(req.file.selection, r.replacement) : r.replacement;
      if (after !== before) extra.edit = { id: uid("edit"), path, before, after, summary: summaryOf(before, after), status: "pending" };
    }
    if (r.plan) extra.plan = { id: uid("plan"), status: "draft", ...r.plan };
    if (r.command) extra.command = commandAction(r.command, prompt || "Drafted by P", st.workspace?.roots[0] ?? "~");
    patch(extra);
    notify({ kind: "ai", tone: "info", title: "P responded", body: TASK_LABEL[task], confirmed: false, target: { view: "p" } });
    log("P AI", `${provider.label}: ${TASK_LABEL[task]}`);
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") patch({ content: (aiStore.get().messages.find((m) => m.id === botId)?.content ?? "") + "\n\n*Stopped.*" });
    else {
      patch({ content: e instanceof Error ? e.message : "P could not reply.", error: true });
      notify({ kind: "provider", tone: "error", title: "Provider unavailable", body: e instanceof Error ? e.message : "P could not reply.", confirmed: false });
    }
  } finally {
    aiStore.set({ streaming: false, task: null });
  }
}

function newFilePath(file: string, task: AITaskKind) {
  if (task === "tests") return file.replace(/\.(tsx?|jsx?)$/, ".p.test.$1");
  return file.replace(/[^/]+$/, "p-proposal.ts");
}
const summaryOf = (a: string, b: string) => {
  const s = summarize(diffLines(a, b));
  return `+${s.added} −${s.removed}`;
};

/** Accepting applies to the editor buffer (unsaved, undoable). New files go through create_file approval. */
export async function resolveEdit(messageId: string, accept: boolean) {
  const msg = aiStore.get().messages.find((m) => m.id === messageId);
  const edit = msg?.edit;
  if (!edit || edit.status !== "pending") return;
  const setStatus = (status: "accepted" | "rejected") =>
    aiStore.set((s) => ({ messages: s.messages.map((m) => (m.id === messageId && m.edit ? { ...m, edit: { ...m.edit, status } } : m)) }));
  if (!accept) {
    setStatus("rejected");
    log("P AI", `Rejected proposed edit to ${relPath(edit.path)}. No change made.`);
    return;
  }
  const exists = getStudioState().files[edit.path] !== undefined;
  if (!exists) {
    const ok = await approveAndRun(
      makeAction({ actionClass: "create_file", title: `Create ${baseName(edit.path)}`, target: relPath(edit.path), reason: "P proposed a new file.", files: [relPath(edit.path)], effect: "Adds the file to the workspace. In demo mode it exists only in this session." }),
    );
    if (!ok) return setStatus("rejected");
    const parent = edit.path.slice(0, edit.path.lastIndexOf("/"));
    createEntry(parent, baseName(edit.path), "file");
  }
  setFileContent(edit.path, edit.after);
  setStatus("accepted");
  log("P AI", `Applied P's edit to ${relPath(edit.path)} in the editor (unsaved).`);
}

export function updatePlan(messageId: string, plan: AITask) {
  aiStore.set((s) => ({ messages: s.messages.map((m) => (m.id === messageId ? { ...m, plan } : m)) }));
}

/** Plans run step by step in the prototype as a simulation; edits still need review. */
export async function runPlan(messageId: string) {
  const plan = aiStore.get().messages.find((m) => m.id === messageId)?.plan;
  if (!plan) return;
  const ok = await requestApproval(
    makeAction({ actionClass: "edit_file", title: "Start P's task plan", target: plan.goal, reason: "Runs the plan steps in order. Each code change is still shown as a diff.", files: plan.files, effect: `Permissions requested: ${plan.permissions.join(", ") || "none"}. Simulated in demo mode.` }),
  );
  if (!ok) return updatePlan(messageId, { ...plan, status: "rejected" });
  let cur: AITask = { ...plan, status: "running" };
  updatePlan(messageId, cur);
  for (let i = 0; i < cur.steps.length; i++) {
    cur = { ...cur, steps: cur.steps.map((s, k) => (k === i ? { ...s, status: "doing" } : s)) };
    updatePlan(messageId, cur);
    await new Promise((r) => setTimeout(r, 700));
    cur = { ...cur, steps: cur.steps.map((s, k) => (k === i ? { ...s, status: "done" } : s)) };
    updatePlan(messageId, cur);
  }
  cur = { ...cur, status: "done", report: "Simulated run complete. No files were changed by the plan itself — ask P for each edit and review its diff." };
  updatePlan(messageId, cur);
  notify({ kind: "ai", tone: "success", title: "AI task completed (simulated)", body: plan.goal, confirmed: false, target: { view: "p" } });
}
