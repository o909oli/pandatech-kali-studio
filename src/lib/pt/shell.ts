/**
 * DEMO SHELL — a tiny in-memory command interpreter for the prototype.
 * It never executes anything on a real machine. In native mode the Terminal
 * app swaps this for a PTY stream from the bridge (see docs/COPILOT_INTEGRATION.md §5).
 */
import { FILE_CONTENT, FS, DEMO_HOME, PROCESSES } from "./demo/data";
import { demoMetricsSnapshot } from "./demo";
import { formatBytes, formatUptime } from "./format";

export interface ShellState {
  cwd: string;
  history: string[];
  /** virtual additions made by mkdir/touch in this session only */
  added: Record<string, { name: string; kind: "folder" | "file" }[]>;
  removed: Set<string>;
}

export const newShell = (): ShellState => ({ cwd: DEMO_HOME, history: [], added: {}, removed: new Set() });

export type OutputLine = { text: string; tone?: "out" | "err" | "dim" | "ok" | "cmd" };

const join = (cwd: string, p: string) => {
  const parts = (p.startsWith("/") ? p : `${cwd}/${p}`).split("/").filter(Boolean);
  const out: string[] = [];
  for (const part of parts) {
    if (part === ".") continue;
    if (part === "..") out.pop();
    else out.push(part);
  }
  return "/" + out.join("/");
};

const entriesOf = (st: ShellState, dir: string) => {
  const base = (FS[dir] ?? []).filter((e) => !st.removed.has(e.path)).map((e) => ({ name: e.name, kind: e.kind }));
  return [...base, ...(st.added[dir] ?? [])];
};
const dirExists = (st: ShellState, dir: string) =>
  dir === "/" || FS[dir] !== undefined || (st.added[join(dir, "..")] ?? []).some((e) => e.kind === "folder" && join(join(dir, ".."), e.name) === dir) ||
  Object.values(FS).some((l) => l.some((e) => e.kind === "folder" && e.path === dir));

export const prompt = (st: ShellState) => {
  const short = st.cwd === DEMO_HOME ? "~" : st.cwd.startsWith(DEMO_HOME + "/") ? "~" + st.cwd.slice(DEMO_HOME.length) : st.cwd;
  return { user: "panda@pandatechs", path: short };
};

const HELP = [
  "Pandatechs demo shell — built-in commands (nothing here touches a real system):",
  "  help             show this list",
  "  ls [-l] [dir]    list sample files",
  "  cd, pwd          move around the sample file tree",
  "  cat <file>       print a sample file",
  "  mkdir, touch, rm  change the in-memory tree only",
  "  whoami, hostname, uname, date, uptime",
  "  free, df, ps     sample system numbers",
  "  ip a             sample network interfaces",
  "  pt-info          Pandatechs system summary",
  "  explain <cmd>    short explanation of a command",
  "  p <question>     open the P assistant with your question",
  "  clear, history",
];

const EXPLAIN: Record<string, string> = {
  ls: "Lists files and folders. `-l` shows permissions, owner, size and date; `-a` shows hidden files.",
  cd: "Changes the current folder. `cd ..` goes up one level, `cd` alone returns home.",
  cat: "Prints the contents of a file to the screen.",
  rm: "Deletes files. On a real system this is permanent; prefer moving to the Trash first.",
  chmod: "Changes who can read, write or run a file, for example `chmod +x script.sh`.",
  sudo: "Runs one command with administrator rights. Pandatechs always asks you to approve elevated actions.",
  grep: "Searches text for a pattern, for example `grep error session.log`.",
  ping: "Sends small test packets to check that a host is reachable.",
  nmap: "A network scanner. Only run it against systems you own or have written permission to test.",
};

export function run(st: ShellState, line: string, openP: (q: string) => void): { lines: OutputLine[]; clear?: boolean } {
  const raw = line.trim();
  if (!raw) return { lines: [] };
  st.history.push(raw);
  const [cmd, ...args] = raw.split(/\s+/);
  const out = (t: string, tone: OutputLine["tone"] = "out"): OutputLine => ({ text: t, tone });
  const err = (t: string) => out(t, "err");

  switch (cmd) {
    case "help":
      return { lines: HELP.map((t, i) => out(t, i === 0 ? "ok" : "out")) };
    case "clear":
      return { lines: [], clear: true };
    case "pwd":
      return { lines: [out(st.cwd)] };
    case "whoami":
      return { lines: [out("panda")] };
    case "hostname":
      return { lines: [out("pandatechs")] };
    case "date":
      return { lines: [out(new Date().toString())] };
    case "uname":
      return { lines: [out("Pandatechs-sample 0.0 x86_64 (demo output)")] };
    case "uptime": {
      const m = demoMetricsSnapshot();
      return { lines: [out(`up ${formatUptime(m.uptimeSec)}, 1 user, load average: ${m.loadAvg.join(", ")}`)] };
    }
    case "free": {
      const m = demoMetricsSnapshot();
      return { lines: [out("              total        used        free"), out(`Mem:     ${formatBytes(m.memTotalBytes).padStart(10)}  ${formatBytes(m.memUsedBytes).padStart(10)}  ${formatBytes(m.memTotalBytes - m.memUsedBytes).padStart(10)}`), out("(sample data)", "dim")] };
    }
    case "df": {
      const m = demoMetricsSnapshot();
      return { lines: [out("Filesystem     Size    Used   Use%  Mounted on"), out(`/dev/sample    ${formatBytes(m.rootTotalBytes, 0).padEnd(7)} ${formatBytes(m.rootUsedBytes, 0).padEnd(7)} ${Math.round((m.rootUsedBytes / m.rootTotalBytes) * 100)}%   /`), out("(sample data)", "dim")] };
    }
    case "ps":
      return { lines: [out("  PID USER      %CPU %MEM COMMAND"), ...PROCESSES.slice(0, 7).map((p) => out(`${String(p.pid).padStart(5)} ${p.user.padEnd(9)} ${p.cpuPercent.toFixed(1).padStart(4)} ${p.memPercent.toFixed(1).padStart(4)} ${p.name}`)), out("(sample data)", "dim")] };
    case "ip":
    case "ifconfig":
      return { lines: [out("1: lo     UP    127.0.0.1/8"), out("2: eth0   UP    192.168.1.101/24"), out("3: wlan0  DOWN  —"), out("(sample data)", "dim")] };
    case "pt-info":
    case "neofetch": {
      const m = demoMetricsSnapshot();
      return {
        lines: [
          out("   PANDATECHS ENTERPRISES", "ok"),
          out("   ─────────────────────────"),
          out("   User      panda@pandatechs"),
          out("   Desktop   Pandatechs Desktop (XFCE)"),
          out(`   Uptime    ${formatUptime(m.uptimeSec)}`),
          out(`   CPU       ${m.cpuModel}`),
          out(`   Memory    ${formatBytes(m.memUsedBytes)} / ${formatBytes(m.memTotalBytes, 0)}`),
          out("   Mode      DEMO — sample values", "dim"),
        ],
      };
    }
    case "history":
      return { lines: st.history.map((h, i) => out(`${String(i + 1).padStart(4)}  ${h}`)) };
    case "echo":
      return { lines: [out(args.join(" "))] };
    case "ls": {
      const long = args.some((a) => a.startsWith("-") && a.includes("l"));
      const target = args.find((a) => !a.startsWith("-"));
      const dir = target ? join(st.cwd, target) : st.cwd;
      if (!dirExists(st, dir)) return { lines: [err(`ls: cannot access '${target}': No such file or directory`)] };
      const list = entriesOf(st, dir);
      if (!list.length) return { lines: [] };
      if (long) {
        return {
          lines: list.map((e) => out(`${e.kind === "folder" ? "drwxr-xr-x" : "-rw-r--r--"}  panda panda  ${e.name}${e.kind === "folder" ? "/" : ""}`)),
        };
      }
      return { lines: [out(list.map((e) => (e.kind === "folder" ? e.name + "/" : e.name)).join("   "))] };
    }
    case "cd": {
      const dir = args[0] ? join(st.cwd, args[0]) : DEMO_HOME;
      if (!dirExists(st, dir)) return { lines: [err(`cd: ${args[0]}: No such file or directory`)] };
      st.cwd = dir;
      return { lines: [] };
    }
    case "cat": {
      if (!args[0]) return { lines: [err("cat: missing file operand")] };
      const p = join(st.cwd, args[0]);
      const content = FILE_CONTENT[p];
      return { lines: content ? content.split("\n").map((t) => out(t)) : [err(`cat: ${args[0]}: no sample content`)] };
    }
    case "mkdir":
    case "touch": {
      if (!args[0]) return { lines: [err(`${cmd}: missing operand`)] };
      (st.added[st.cwd] ??= []).push({ name: args[0], kind: cmd === "mkdir" ? "folder" : "file" });
      return { lines: [out("(created in the in-memory sample tree only)", "dim")] };
    }
    case "rm": {
      if (!args[0]) return { lines: [err("rm: missing operand")] };
      const p = join(st.cwd, args[0]);
      st.removed.add(p);
      st.added[st.cwd] = (st.added[st.cwd] ?? []).filter((e) => e.name !== args[0]);
      return { lines: [out("(removed from the in-memory sample tree only)", "dim")] };
    }
    case "explain": {
      const k = args[0];
      return { lines: [out(k && EXPLAIN[k] ? EXPLAIN[k] : k ? `No built-in note for '${k}'. Ask P for a full explanation.` : "usage: explain <command>")] };
    }
    case "p": {
      openP(args.join(" "));
      return { lines: [out("Asking P…", "dim")] };
    }
    case "sudo":
    case "apt":
    case "nmap":
    case "msfconsole":
    case "hydra":
      return {
        lines: [
          err(`${cmd}: not run. The demo shell never executes system or security tools.`),
          out("In the real build, privileged and security actions go through an approval card.", "dim"),
        ],
      };
    default:
      return { lines: [err(`${cmd}: command not found (demo shell). Type 'help'.`)] };
  }
}
