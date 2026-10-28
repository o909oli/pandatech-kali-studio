/**
 * SAMPLE DATA ONLY — Pandatechs Studio.
 * A small invented project used by the Studio prototype. Reachable only
 * through `demoStudio`; every value is surfaced in the UI as "Sample".
 */
import type { ActionResult, Sourced } from "../types";
import type {
  DebugStep, Diagnostic, DevTool, Extension, FileEntry, GitStatus, LaunchConfig, LanguageId,
  ProjectTemplate, ProposedAction, RecentWorkspace, StudioIntegration, TerminalLine, TerminalOutput, TerminalProfile, TestCase, Workspace,
} from "../studio/types";

export const STUDIO_ROOT = "/home/panda/Projects/pandatechs-portal";
const R = (p: string) => `${STUDIO_ROOT}/${p}`;
const iso = (minsAgo: number) => new Date(Date.now() - minsAgo * 60_000).toISOString();

const sample = <T,>(data: T): Sourced<T> => ({ source: "sample", data, updatedAt: Date.now() });

export const SAMPLE_FILES: Record<string, string> = {
  [R("src/App.tsx")]: `import { useEffect, useState } from "react";
import { StatusCard } from "./components/StatusCard";
import { averageLoad, type Sample } from "./lib/metrics";

export default function App() {
  const [samples, setSamples] = useState<Sample[]>([]);

  useEffect(() => {
    const id = setInterval(async () => {
      const res = await fetch("/api/metrics");
      const next: Sample = await res.json();
      setSamples((s) => [...s.slice(-59), next]);
    }, 2000);
    return () => clearInterval(id);
  }, []);

  return (
    <main className="portal">
      <h1>Pandatechs Portal</h1>
      <StatusCard title="Average load" value={averageLoad(samples)} unit="%" />
      <StatusCard title="Samples" value={samples.length} />
    </main>
  );
}
`,
  [R("src/components/StatusCard.tsx")]: `interface Props {
  title: string;
  value: number;
  unit?: string;
}

/** Small metric tile used on the portal dashboard. */
export function StatusCard({ title, value, unit = "" }: Props) {
  const tone = value > 80 ? "danger" : value > 60 ? "warning" : "ok";
  return (
    <section className={\`status-card status-card--\${tone}\`}>
      <h2>{title}</h2>
      <p>
        {value.toFixed(1)}
        {unit}
      </p>
    </section>
  );
}
`,
  [R("src/lib/metrics.ts")]: `export interface Sample {
  at: number;
  cpu: number;
  memory: number;
}

/** Average CPU load over the collected samples. */
export function averageLoad(samples: Sample[]): number {
  let total = 0;
  for (let i = 0; i <= samples.length; i++) {
    total += samples[i].cpu;
  }
  return total / samples.length;
}

export function peak(samples: Sample[], key: keyof Sample) {
  return samples.reduce((max, s) => (s[key] > max ? s[key] : max), 0);
}

export function formatPercent(value: number) {
  return value.toFixed(1) + "%";
}
`,
  [R("src/lib/metrics.test.ts")]: `import { describe, expect, it } from "vitest";
import { averageLoad, formatPercent, peak } from "./metrics";

const samples = [
  { at: 1, cpu: 20, memory: 40 },
  { at: 2, cpu: 40, memory: 50 },
];

describe("metrics", () => {
  it("averages cpu load", () => {
    expect(averageLoad(samples)).toBe(30);
  });

  it("returns 0 for no samples", () => {
    expect(averageLoad([])).toBe(0);
  });

  it("finds the peak", () => {
    expect(peak(samples, "memory")).toBe(50);
  });

  it("formats percentages", () => {
    expect(formatPercent(12.345)).toBe("12.3%");
  });
});
`,
  [R("src/styles.css")]: `:root {
  --portal-bg: #07111f;
  --portal-text: #eaf4ff;
  --portal-accent: #087fff;
}

.portal {
  display: grid;
  gap: 1rem;
  padding: 2rem;
  background: var(--portal-bg);
  color: var(--portal-text);
}

.status-card {
  border: 1px solid var(--portal-accent);
  border-radius: 8px;
  padding: 1rem;
}
`,
  [R("api/server.ts")]: `import { createServer } from "node:http";

const PORT = Number(process.env.PORT ?? 5173);

createServer((req, res) => {
  if (req.url === "/api/metrics") {
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ at: Date.now(), cpu: Math.random() * 100, memory: 42 }));
    return;
  }
  res.statusCode = 404;
  res.end("Not found");
}).listen(PORT, () => console.log(\`portal api on :\${PORT}\`));
`,
  [R("scripts/report.py")]: `"""Builds a weekly CSV report from exported metrics."""
import csv
from pathlib import Path


def load(path: Path) -> list[dict]:
    with path.open() as fh:
        return list(csv.DictReader(fh))


def summarize(rows: list[dict]) -> dict:
    cpu = [float(r["cpu"]) for r in rows]
    return {"count": len(cpu), "avg": sum(cpu) / len(cpu), "max": max(cpu)}


if __name__ == "__main__":
    rows = load(Path("exports/metrics.csv"))
    print(summarize(rows))
`,
  [R("legacy/invoice.php")]: `<?php

namespace Pandatechs\\Legacy;

final class Invoice
{
    public function __construct(private array $lines = []) {}

    public function add(string $item, float $price, int $qty = 1): self
    {
        $this->lines[] = compact('item', 'price', 'qty');
        return $this;
    }

    public function total(): float
    {
        return array_sum(array_map(fn ($l) => $l['price'] * $l['qty'], $this->lines));
    }
}
`,
  [R("package.json")]: `{
  "name": "pandatechs-portal",
  "private": true,
  "version": "0.4.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "api": "node api/server.ts",
    "test": "vitest run"
  },
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "typescript": "^5.6.0",
    "vite": "^7.0.0",
    "vitest": "^3.0.0"
  }
}
`,
  [R("tsconfig.json")]: `{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "jsx": "react-jsx",
    "strict": true,
    "noUncheckedIndexedAccess": true
  },
  "include": ["src", "api"]
}
`,
  [R("README.md")]: `# Pandatechs Portal

Sample project bundled with the Pandatechs Studio prototype.

## Scripts

- \`npm run dev\` — start the web portal
- \`npm run api\` — start the metrics API
- \`npm test\` — run unit tests

> Everything in this workspace is sample data.
`,
  [R("docs/setup.md")]: `# Setup

1. Install Node.js 20 or newer.
2. Run \`npm install\`.
3. Copy \`.env.example\` to \`.env\` and fill in your values.
`,
  [R(".env")]: `# Local secrets — never shared with P automatically
API_TOKEN=sample-not-a-real-token
`,
  [R("logs/build.log")]: `[12:01:04] vite v7.0.0 building for production...
[12:01:05] transforming (42) src/App.tsx
[12:01:06] warning: src/lib/metrics.ts(10,23) index may be out of range
[12:01:07] built in 2.41s
`,
};

/** HEAD versions used by Source Control diffs (sample). */
const ORIGINALS: Record<string, string> = {
  [R("src/lib/metrics.ts")]: `export interface Sample {
  at: number;
  cpu: number;
  memory: number;
}

export function averageLoad(samples: Sample[]): number {
  let total = 0;
  for (const s of samples) total += s.cpu;
  return total / samples.length;
}

export function peak(samples: Sample[], key: keyof Sample) {
  return samples.reduce((max, s) => (s[key] > max ? s[key] : max), 0);
}
`,
  [R("README.md")]: `# Pandatechs Portal

Sample project bundled with the Pandatechs Studio prototype.

## Scripts

- \`npm run dev\` — start the web portal
- \`npm test\` — run unit tests
`,
  [R("legacy/old-auth.php")]: `<?php
// Deprecated session helper, replaced by the API gateway.
function legacy_login(string $user, string $pass): bool
{
    return false;
}
`,
  [R("SETUP.md")]: `# Setup

1. Install Node.js 20 or newer.
2. Run \`npm install\`.
`,
};

export function languageOf(path: string): LanguageId {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  const name = path.split("/").pop() ?? "";
  if (name.startsWith(".env")) return "shell";
  return (
    ({ ts: "typescript", tsx: "tsx", js: "javascript", jsx: "tsx", json: "json", py: "python", php: "php", css: "css", md: "markdown", sh: "shell", yml: "yaml", yaml: "yaml" } as Record<string, LanguageId>)[ext] ??
    "plaintext"
  );
}

function buildTree(): FileEntry[] {
  const out = new Map<string, FileEntry>();
  out.set(STUDIO_ROOT, { path: STUDIO_ROOT, name: "pandatechs-portal", kind: "folder" });
  for (const p of Object.keys(SAMPLE_FILES)) {
    const parts = p.slice(STUDIO_ROOT.length + 1).split("/");
    let acc = STUDIO_ROOT;
    parts.forEach((part, i) => {
      acc += "/" + part;
      if (out.has(acc)) return;
      const isFile = i === parts.length - 1;
      out.set(acc, {
        path: acc,
        name: part,
        kind: isFile ? "file" : "folder",
        language: isFile ? languageOf(acc) : undefined,
        secret: isFile && part.startsWith(".env") ? true : undefined,
        readOnly: acc.endsWith(".log") ? true : undefined,
      });
    });
  }
  return [...out.values()];
}

export const SAMPLE_DIAGNOSTICS: Diagnostic[] = [
  { id: "d1", path: R("src/lib/metrics.ts"), line: 10, col: 23, length: 16, severity: "error", message: "Loop reads samples[samples.length], which is undefined (off-by-one).", source: "sample-lint" },
  { id: "d2", path: R("src/lib/metrics.ts"), line: 13, col: 10, length: 26, severity: "warning", message: "Division by zero when samples is empty; returns NaN.", source: "sample-lint" },
  { id: "d3", path: R("src/App.tsx"), line: 11, col: 7, length: 34, severity: "info", message: "Response status is not checked before parsing JSON.", source: "sample-lint" },
  { id: "d4", path: R("scripts/report.py"), line: 13, col: 28, length: 17, severity: "warning", message: "ZeroDivisionError when rows is empty.", source: "sample-lint" },
];

export const SAMPLE_GIT: GitStatus = {
  branch: "feature/live-metrics",
  ahead: 2,
  behind: 0,
  branches: ["main", "feature/live-metrics", "fix/report-encoding"],
  changes: [
    { path: R("src/lib/metrics.ts"), kind: "modified", staged: false },
    { path: R("src/components/StatusCard.tsx"), kind: "added", staged: false },
    { path: R("legacy/old-auth.php"), kind: "deleted", staged: false },
    { path: R("docs/setup.md"), kind: "renamed", staged: false, oldPath: R("SETUP.md") },
    { path: R("README.md"), kind: "modified", staged: true },
  ],
  history: [
    { hash: "9f3c1a2", message: "Add live metrics polling", author: "panda", at: iso(55) },
    { hash: "41be7d0", message: "Portal layout and styles", author: "panda", at: iso(60 * 5) },
    { hash: "c27a9e4", message: "Weekly report script", author: "panda", at: iso(60 * 26) },
    { hash: "0d1f5b8", message: "Initial commit", author: "panda", at: iso(60 * 72) },
  ],
};

export const SAMPLE_EXTENSIONS: Extension[] = [
  { id: "pandatechs.midnight-theme", name: "Pandatechs Midnight Blue", publisher: "Pandatechs Enterprises", version: "1.0.0", description: "The default Pandatechs Studio colour theme.", category: "Themes", installed: true, enabled: true, compatibility: "unknown" },
  { id: "pandatechs.p-assistant", name: "P AI Coding Assistant", publisher: "Pandatechs Enterprises", version: "0.3.0", description: "Brings P into the editor, terminal and source control.", category: "AI", installed: true, enabled: true, compatibility: "unknown" },
  { id: "sample.eslint", name: "ESLint (sample entry)", publisher: "Sample publisher", version: "3.0.10", description: "Lint JavaScript and TypeScript files.", category: "Linters", installed: true, enabled: false, updateAvailable: "3.0.12", compatibility: "unknown" },
  { id: "sample.prettier", name: "Prettier (sample entry)", publisher: "Sample publisher", version: "11.0.0", description: "Opinionated code formatter.", category: "Formatters", installed: true, enabled: true, compatibility: "unknown" },
  { id: "sample.python", name: "Python (sample entry)", publisher: "Sample publisher", version: "—", description: "Language support for Python files.", category: "Languages", installed: false, enabled: false, recommended: true, compatibility: "unknown" },
  { id: "sample.php-intelephense", name: "PHP Intelephense (sample entry)", publisher: "Sample publisher", version: "—", description: "PHP code intelligence.", category: "Languages", installed: false, enabled: false, recommended: true, compatibility: "unknown" },
  { id: "sample.gitlens", name: "Git history (sample entry)", publisher: "Sample publisher", version: "—", description: "Inline blame and file history.", category: "Source control", installed: false, enabled: false, compatibility: "unknown" },
];

export const SAMPLE_TOOLS: DevTool[] = [
  { id: "git", name: "Git", command: "git --version", status: "unknown" },
  { id: "node", name: "Node.js", command: "node --version", status: "unknown" },
  { id: "npm", name: "npm", command: "npm --version", status: "unknown" },
  { id: "python", name: "Python", command: "python3 --version", status: "unknown" },
  { id: "pip", name: "pip", command: "pip3 --version", status: "unknown" },
  { id: "venv", name: "Virtual environments", command: "python3 -m venv --help", status: "unknown" },
  { id: "php", name: "PHP", command: "php --version", status: "unknown" },
  { id: "composer", name: "Composer", command: "composer --version", status: "unknown" },
  { id: "docker", name: "Docker / Podman", command: "docker --version || podman --version", status: "unknown" },
  { id: "lsp", name: "Language servers", command: "typescript-language-server --version", status: "unknown" },
  { id: "dbg", name: "Debuggers", command: "node --inspect / debugpy / xdebug", status: "unknown" },
];

export const SAMPLE_TESTS: TestCase[] = [
  { id: "t1", suite: "metrics", name: "averages cpu load", path: R("src/lib/metrics.test.ts"), line: 10, status: "idle" },
  { id: "t2", suite: "metrics", name: "returns 0 for no samples", path: R("src/lib/metrics.test.ts"), line: 14, status: "idle" },
  { id: "t3", suite: "metrics", name: "finds the peak", path: R("src/lib/metrics.test.ts"), line: 18, status: "idle" },
  { id: "t4", suite: "metrics", name: "formats percentages", path: R("src/lib/metrics.test.ts"), line: 22, status: "idle" },
  { id: "t5", suite: "report.py", name: "summarize handles empty rows", path: R("scripts/report.py"), line: 11, status: "idle" },
];

/** Simulated outcome of a test run (sample). */
export const SAMPLE_TEST_RESULTS: Record<string, Pick<TestCase, "status" | "durationMs" | "message">> = {
  t1: { status: "failed", durationMs: 4, message: "TypeError: Cannot read properties of undefined (reading 'cpu')\n    at averageLoad (src/lib/metrics.ts:10:25)" },
  t2: { status: "failed", durationMs: 1, message: "Expected 0, received NaN" },
  t3: { status: "passed", durationMs: 1 },
  t4: { status: "passed", durationMs: 0 },
  t5: { status: "skipped", message: "Python runner not configured" },
};

export const SAMPLE_LAUNCH: LaunchConfig[] = [
  { id: "api", name: "Launch API (Node)", type: "node", program: "api/server.ts" },
  { id: "tests", name: "Debug unit tests", type: "node", program: "vitest run src/lib/metrics.test.ts" },
  { id: "report", name: "Run report.py", type: "python", program: "scripts/report.py" },
];

const METRICS = R("src/lib/metrics.ts");
const TEST = R("src/lib/metrics.test.ts");
export const SAMPLE_DEBUG: Record<string, DebugStep[]> = {
  tests: [
    { path: TEST, line: 10, frames: [{ name: "<anonymous>", path: TEST, line: 10 }], variables: [{ name: "samples", value: "Array(2)", type: "Sample[]", scope: "Closure" }], output: "▶ metrics › averages cpu load" },
    { path: METRICS, line: 8, frames: [{ name: "averageLoad", path: METRICS, line: 8 }, { name: "<anonymous>", path: TEST, line: 10 }], variables: [{ name: "samples", value: "Array(2)", type: "Sample[]", scope: "Local" }, { name: "total", value: "undefined", type: "number", scope: "Local" }] },
    { path: METRICS, line: 10, frames: [{ name: "averageLoad", path: METRICS, line: 10 }, { name: "<anonymous>", path: TEST, line: 10 }], variables: [{ name: "samples", value: "Array(2)", type: "Sample[]", scope: "Local" }, { name: "total", value: "60", type: "number", scope: "Local" }, { name: "i", value: "2", type: "number", scope: "Local" }], output: "Paused: i === samples.length (2)" },
    { path: METRICS, line: 10, frames: [{ name: "averageLoad", path: METRICS, line: 10 }, { name: "<anonymous>", path: TEST, line: 10 }], variables: [{ name: "samples[i]", value: "undefined", type: "undefined", scope: "Local" }, { name: "i", value: "2", type: "number", scope: "Local" }], output: "TypeError: Cannot read properties of undefined (reading 'cpu')" },
  ],
  api: [
    { path: R("api/server.ts"), line: 3, frames: [{ name: "<module>", path: R("api/server.ts"), line: 3 }], variables: [{ name: "PORT", value: "5173", type: "number", scope: "Global" }], output: "portal api on :5173" },
    { path: R("api/server.ts"), line: 6, frames: [{ name: "handler", path: R("api/server.ts"), line: 6 }], variables: [{ name: "req.url", value: '"/api/metrics"', type: "string", scope: "Local" }] },
  ],
  report: [
    { path: R("scripts/report.py"), line: 17, frames: [{ name: "<module>", path: R("scripts/report.py"), line: 17 }], variables: [{ name: "rows", value: "[]", type: "list", scope: "Global" }] },
    { path: R("scripts/report.py"), line: 13, frames: [{ name: "summarize", path: R("scripts/report.py"), line: 13 }, { name: "<module>", path: R("scripts/report.py"), line: 18 }], variables: [{ name: "cpu", value: "[]", type: "list", scope: "Local" }], output: "ZeroDivisionError: division by zero" },
  ],
};

export const SAMPLE_PROFILES: TerminalProfile[] = [
  { id: "bash", label: "bash", shell: "/bin/bash" },
  { id: "zsh", label: "zsh", shell: "/usr/bin/zsh" },
  { id: "sh", label: "sh", shell: "/bin/sh" },
];

export const SAMPLE_RECENT: RecentWorkspace[] = [
  { id: "portal", name: "pandatechs-portal", path: STUDIO_ROOT, projectType: "React + TypeScript", openedAt: iso(12) },
  { id: "billing", name: "billing-api", path: "/home/panda/Projects/billing-api", projectType: "Laravel + PHP", openedAt: iso(60 * 20) },
  { id: "recon", name: "report-tools", path: "/home/panda/Tools/report-tools", projectType: "Python", openedAt: iso(60 * 50) },
];

export const SAMPLE_TEMPLATES: ProjectTemplate[] = [
  { id: "react-ts", name: "React + TypeScript", description: "Vite app with strict TypeScript.", icon: "react", requires: ["Node.js", "npm"] },
  { id: "laravel", name: "Laravel + PHP", description: "Web application with Composer.", icon: "php", requires: ["PHP", "Composer"] },
  { id: "python", name: "Python", description: "Package with a virtual environment.", icon: "python", requires: ["Python", "venv"] },
  { id: "node", name: "Node.js", description: "Service with npm scripts.", icon: "node", requires: ["Node.js"] },
  { id: "static", name: "Static website", description: "HTML, CSS and assets.", icon: "globe", requires: [] },
  { id: "api", name: "API project", description: "REST API with tests.", icon: "api", requires: ["Node.js"] },
  { id: "cli", name: "CLI tool", description: "Command line utility.", icon: "terminal", requires: ["Node.js or Python"] },
  { id: "docs", name: "Documentation", description: "Markdown docs site.", icon: "docs", requires: [] },
  { id: "empty", name: "Empty workspace", description: "Start from nothing.", icon: "empty", requires: [] },
];

const WORKSPACE: Workspace = {
  id: "portal",
  name: "pandatechs-portal",
  roots: [STUDIO_ROOT],
  projectType: "React + TypeScript",
  notes: "Sample workspace for the Studio prototype.",
};

const honest = (message: string): ActionResult => ({ ok: true, confirmedByNative: false, message });

export const demoStudio: StudioIntegration = {
  mode: "demo",
  status: () => ({ workspace: "sample", git: "sample", terminal: "sample", debug: "sample", extensions: "sample", tests: "sample" }),
  workspace: {
    current: async () => sample(WORKSPACE),
    recent: async () => sample(SAMPLE_RECENT),
    templates: async () => sample(SAMPLE_TEMPLATES),
    tree: async () => sample(buildTree()),
    read: async (path) => (SAMPLE_FILES[path] !== undefined ? sample(SAMPLE_FILES[path]!) : { source: "error", data: null, updatedAt: Date.now(), error: "Not in the sample workspace" }),
    write: async () => honest("Saved in this browser session only (sample workspace). Writing to disk needs the native integration."),
  },
  diagnostics: async () => sample(SAMPLE_DIAGNOSTICS),
  git: {
    status: async () => sample(SAMPLE_GIT),
    original: async (path) => sample(ORIGINALS[path] ?? SAMPLE_FILES[path] ?? ""),
  },
  terminal: { profiles: async () => sample(SAMPLE_PROFILES), run: async (line, cwd) => sample(simulateTerminal(line, cwd)) },
  debug: {
    configs: async () => sample(SAMPLE_LAUNCH),
    script: async (id) => sample(SAMPLE_DEBUG[id] ?? []),
  },
  extensions: {
    list: async () => sample(SAMPLE_EXTENSIONS),
    tools: async () => sample(SAMPLE_TOOLS),
  },
  tests: {
    list: async () => sample(SAMPLE_TESTS),
    run: async (ids) => sample(SAMPLE_TESTS.filter((t) => ids.includes(t.id)).map((t) => ({ ...t, ...SAMPLE_TEST_RESULTS[t.id] }))),
  },
  execute: async (action: ProposedAction) =>
    honest(`Demo mode: "${action.title}" was approved but not performed. The native integration runs it for real.`),
};

/* ---------------- simulated workspace terminal (sample output only) ---------------- */
const TEST_OUTPUT: TerminalLine[] = [
  { text: " RUN  v1.6.0 /home/panda/Projects/pandatechs-portal (sample)", tone: "dim" },
  { text: " ❯ src/lib/metrics.test.ts (4 tests | 2 failed)", tone: "out" },
  { text: "   × averages cpu load", tone: "err" },
  { text: "     → TypeError: Cannot read properties of undefined (reading 'cpu')", tone: "err" },
  { text: "       at averageLoad (src/lib/metrics.ts:10:25)", tone: "err" },
  { text: "   × returns 0 for no samples", tone: "err" },
  { text: "     → Expected 0, received NaN", tone: "err" },
  { text: "   ✓ finds the peak", tone: "ok" },
  { text: "   ✓ formats percentages", tone: "ok" },
  { text: " Test Files  1 failed (1)", tone: "err" },
  { text: "      Tests  2 failed | 2 passed (4)", tone: "out" },
];

export function simulateTerminal(line: string, cwd: string): TerminalOutput {
  const cmd = line.trim();
  const rel = (p: string) => (p.startsWith(STUDIO_ROOT) ? p.slice(STUDIO_ROOT.length + 1) : p);
  const dirOf = (dir: string) => {
    const names = new Set<string>();
    for (const f of Object.keys(SAMPLE_FILES)) if (f.startsWith(dir + "/")) names.add(f.slice(dir.length + 1).split("/")[0]!);
    return [...names].sort();
  };
  if (!cmd) return { lines: [] };
  const [head, ...rest] = cmd.split(/\s+/);
  switch (head) {
    case "help":
      return { lines: [{ text: "Sample workspace shell: ls, cd, pwd, cat, git status, git log, git branch, npm test, npm run dev, node -v, python3 --version, clear, echo", tone: "dim" }] };
    case "clear":
      return { lines: [], clear: true };
    case "pwd":
      return { lines: [{ text: cwd }] };
    case "echo":
      return { lines: [{ text: rest.join(" ") }] };
    case "ls": {
      const target = rest[0] ? `${cwd}/${rest[0]}`.replace(/\/\.$/, "") : cwd;
      const list = dirOf(target);
      return list.length ? { lines: [{ text: list.join("  "), tone: "out" }] } : { lines: [{ text: `ls: cannot access '${rest[0] ?? "."}': No such file or directory`, tone: "err" }] };
    }
    case "cd": {
      const to = !rest[0] || rest[0] === "~" ? STUDIO_ROOT : rest[0] === ".." ? cwd.slice(0, cwd.lastIndexOf("/")) || "/" : `${cwd}/${rest[0]}`;
      return dirOf(to).length || to === STUDIO_ROOT ? { lines: [], cwd: to } : { lines: [{ text: `cd: ${rest[0]}: No such file or directory`, tone: "err" }] };
    }
    case "cat": {
      const f = SAMPLE_FILES[`${cwd}/${rest[0] ?? ""}`];
      if (rest[0]?.startsWith(".env")) return { lines: [{ text: "cat: hidden in the sample shell (credential file)", tone: "dim" }] };
      return f !== undefined ? { lines: f.split("\n").map((text) => ({ text })) } : { lines: [{ text: `cat: ${rest[0] ?? ""}: No such file or directory`, tone: "err" }] };
    }
    case "git": {
      if (rest[0] === "status")
        return {
          lines: [
            { text: `On branch ${SAMPLE_GIT.branch}` },
            { text: "Your branch is ahead of 'origin/" + SAMPLE_GIT.branch + "' by 2 commits." },
            { text: "Changes not staged for commit:", tone: "out" },
            ...SAMPLE_GIT.changes.filter((c) => !c.staged).map((c) => ({ text: `\t${c.kind}:   ${rel(c.path)}`, tone: "err" as const })),
            { text: "Changes to be committed:", tone: "out" },
            ...SAMPLE_GIT.changes.filter((c) => c.staged).map((c) => ({ text: `\t${c.kind}:   ${rel(c.path)}`, tone: "ok" as const })),
          ],
        };
      if (rest[0] === "log") return { lines: SAMPLE_GIT.history.map((h) => ({ text: `${h.hash} ${h.message}` })) };
      if (rest[0] === "branch") return { lines: SAMPLE_GIT.branches.map((b) => ({ text: `${b === SAMPLE_GIT.branch ? "* " : "  "}${b}`, tone: b === SAMPLE_GIT.branch ? ("ok" as const) : undefined })) };
      return { lines: [{ text: `git ${rest.join(" ")}: not simulated in the sample shell`, tone: "dim" }] };
    }
    case "npm":
    case "npx":
      if (/test|vitest/.test(cmd)) return { lines: TEST_OUTPUT };
      if (/run dev/.test(cmd)) return { lines: [{ text: "  VITE v5 ready (sample)", tone: "ok" }, { text: "  ➜  Local:   http://localhost:5173/", tone: "out" }] };
      if (/run build/.test(cmd)) return { lines: [{ text: "src/lib/metrics.ts(10,25): error TS2532: Object is possibly 'undefined'.", tone: "err" }, { text: "Build failed (sample output)", tone: "err" }] };
      return { lines: [{ text: `${cmd}: not simulated in the sample shell`, tone: "dim" }] };
    case "node":
      return { lines: [{ text: "Not detected — the sample shell does not know which runtimes are installed.", tone: "dim" }] };
    case "python3":
    case "python":
      if (rest.includes("scripts/report.py")) return { lines: [{ text: "Traceback (most recent call last):", tone: "err" }, { text: '  File "scripts/report.py", line 13, in summarize', tone: "err" }, { text: "ZeroDivisionError: division by zero", tone: "err" }] };
      return { lines: [{ text: "Not detected — the sample shell does not know which runtimes are installed.", tone: "dim" }] };
    case "sudo":
      return { lines: [{ text: "sudo is not available in the sample shell. Elevated commands always need your approval in the native build.", tone: "err" }] };
    default:
      return { lines: [{ text: `${head}: command not found (sample shell)`, tone: "err" }] };
  }
}
