import type {
  ActionProposal, ActionResult, AssistantProvider, AssistantReply, ChatMessage, Integration,
  NetworkState, Sourced, SystemMetrics,
} from "../types";
import { uid } from "../format";
import {
  APPS, CONNECTIONS, FS, NOTIFICATIONS, PLACES, PROCESSES, RECENT, SECURITY_EVENTS, WINDOWS,
} from "./data";

/* ---------- helpers ---------- */
const sample = <T>(data: T): Promise<Sourced<T>> =>
  Promise.resolve({ source: "sample", data, updatedAt: Date.now() });

const wait = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((res, rej) => {
    const t = setTimeout(res, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(t);
      rej(new DOMException("Aborted", "AbortError"));
    });
  });

/* ---------- simulated live series (still SAMPLE) ---------- */
const HISTORY = 48;
const walk = (prev: number, min: number, max: number, step: number) =>
  Math.min(max, Math.max(min, prev + (Math.random() - 0.5) * step));

const series = (start: number, min: number, max: number, step: number) => {
  const out: number[] = [];
  let v = start;
  for (let i = 0; i < HISTORY; i++) {
    v = walk(v, min, max, step);
    out.push(v);
  }
  return out;
};

const sim = {
  cpu: series(28, 6, 82, 22),
  mem: series(46, 38, 62, 4),
  io: series(30, 2, 90, 40),
  down: series(2.4e6, 2e5, 9e6, 3e6),
  up: series(6e5, 5e4, 2.2e6, 8e5),
  t0: Date.now() - 3 * 3600_000 - 12 * 60_000,
};
const push = (arr: number[], v: number) => {
  arr.push(v);
  if (arr.length > HISTORY) arr.shift();
};
let lastTick = 0;
function tick() {
  const now = Date.now();
  if (now - lastTick < 700) return;
  lastTick = now;
  push(sim.cpu, walk(sim.cpu.at(-1)!, 5, 85, 22));
  push(sim.mem, walk(sim.mem.at(-1)!, 38, 64, 3));
  push(sim.io, walk(sim.io.at(-1)!, 2, 95, 40));
  push(sim.down, walk(sim.down.at(-1)!, 2e5, 9e6, 3e6));
  push(sim.up, walk(sim.up.at(-1)!, 5e4, 2.2e6, 8e5));
}

const GB = 1024 ** 3;

export function demoMetricsSnapshot(): SystemMetrics {
  tick();
  const memTotal = 16 * GB;
  return {
    cpuPercent: sim.cpu.at(-1)!,
    cpuModel: "Sample CPU @ 3.4 GHz",
    cores: 8,
    memUsedBytes: (sim.mem.at(-1)! / 100) * memTotal,
    memTotalBytes: memTotal,
    rootUsedBytes: 142 * GB,
    rootTotalBytes: 256 * GB,
    cpuHistory: [...sim.cpu],
    memHistory: [...sim.mem],
    diskIoHistory: [...sim.io],
    uptimeSec: (Date.now() - sim.t0) / 1000,
    loadAvg: [0.42, 0.51, 0.47],
    hostname: "pandatechs",
    desktop: "Pandatechs Desktop (XFCE)",
    kernel: "sample",
  };
}

function demoNetworkSnapshot(): NetworkState {
  tick();
  return {
    connected: true,
    primary: "eth0",
    downBps: sim.down.at(-1)!,
    upBps: sim.up.at(-1)!,
    downHistory: [...sim.down],
    upHistory: [...sim.up],
    bluetooth: "off",
    interfaces: [
      { name: "eth0", kind: "ethernet", address: "192.168.1.101", state: "up" },
      { name: "wlan0", kind: "wifi", address: null, state: "down", ssid: "Panda-Lab", signal: 78 },
      { name: "lo", kind: "loopback", address: "127.0.0.1", state: "up" },
    ],
  };
}

/* ---------- assistant (rule based, no model) ---------- */
const APP_ALIASES: Record<string, string> = {
  terminal: "terminal", files: "files", "file manager": "files", editor: "editor", notes: "notes",
  monitor: "monitor", "system monitor": "monitor", network: "network", security: "security",
  settings: "settings", browser: "browser", workspaces: "workspaces", projects: "workspaces", "location center": "location", location: "location", "share location": "location",
};

function intent(text: string): AssistantReply {
  const t = text.toLowerCase().trim();
  const proposal = (p: Omit<ActionProposal, "id">): ActionProposal => ({ id: uid("act"), ...p });

  const open = t.match(/^(open|launch|start|show me)\s+(?:the\s+)?(.+)$/);
  if (open) {
    const name = (open[2] ?? "").replace(/(app|application)$/, "").trim();
    const key = Object.keys(APP_ALIASES).find((k) => name.includes(k));
    if (key) {
      return {
        content: `I can open **${key}** for you. This needs your approval first.`,
        proposal: proposal({
          operation: "open_app", title: `Open ${key}`, target: APP_ALIASES[key] ?? key,
          detail: `Launch the ${key} application in this session.`,
        }),
      };
    }
  }
  if (/(cpu|memory|ram|disk|storage|performance|how.*system|health)/.test(t)) {
    const m = demoMetricsSnapshot();
    return {
      content:
        `Here is the current picture (**sample data**):\n\n` +
        `- **CPU:** ${m.cpuPercent.toFixed(0)}% across ${m.cores} cores\n` +
        `- **Memory:** ${(m.memUsedBytes / GB).toFixed(1)} of ${(m.memTotalBytes / GB).toFixed(0)} GB\n` +
        `- **Root disk:** ${(m.rootUsedBytes / GB).toFixed(0)} of ${(m.rootTotalBytes / GB).toFixed(0)} GB\n\n` +
        `Everything looks comfortable. I can open the System Monitor if you want the live graphs.`,
    };
  }
  if (/(network|ip address|interface|wifi|wi-fi|internet|bandwidth)/.test(t)) {
    return {
      content:
        `Network summary (**sample data**):\n\n- \`eth0\` is up at **192.168.1.101**\n- \`wlan0\` is down\n- Loopback is up\n\n` +
        `Reading this does not change anything. Ask me to open the Network Center for the full view.`,
    };
  }
  if (/^(find|search|where is|locate)/.test(t)) {
    const q = t.replace(/^(find|search for|search|where is|locate)\s*/, "").trim() || "report";
    const hits = RECENT.filter((f) => f.name.toLowerCase().includes(q.split(" ")[0] ?? q)).slice(0, 4);
    return {
      content: hits.length
        ? `Found ${hits.length} sample match${hits.length > 1 ? "es" : ""} for "${q}":\n\n${hits.map((h) => `- \`${h.path}\``).join("\n")}`
        : `I did not find anything matching "${q}" in the permitted folders (sample index).`,
    };
  }
  const mk = t.match(/create (?:a )?(?:new )?folder(?: called| named)?\s+(.+)/);
  if (mk) {
    const name = (mk[1] ?? "").replace(/["']/g, "").trim();
    return {
      content: `Ready to create **${name}** in your home folder. Please review and approve.`,
      proposal: proposal({
        operation: "create_folder", title: `Create folder "${name}"`, target: `/home/panda/${name}`,
        detail: `mkdir /home/panda/${name}`,
      }),
    };
  }
  const del = t.match(/(?:delete|remove|trash)\s+(.+)/);
  if (del && !/package|software/.test(t)) {
    const target = (del[1] ?? "").trim();
    return {
      content: `Deleting is destructive, so I will not do it without explicit approval.`,
      proposal: proposal({
        operation: "delete_file", title: `Delete "${target}"`, target,
        detail: `Move "${target}" to the Trash. This cannot be undone from here.`,
      }),
    };
  }
  const inst = t.match(/install\s+(.+)/);
  if (inst) {
    const pkg = (inst[1] ?? "").trim();
    return {
      content: `Installing software needs elevated rights. Here is exactly what I would run:`,
      proposal: proposal({
        operation: "install_package", title: `Install ${pkg}`, target: pkg,
        detail: `sudo apt install ${pkg}`,
      }),
    };
  }
  if (/firewall/.test(t)) {
    if (/(enable|disable|open|close|allow|block|turn)/.test(t)) {
      return {
        content: "Changing the firewall affects every connection on this machine. Please confirm.",
        proposal: proposal({
          operation: "change_firewall", title: "Change firewall state", target: "firewall",
          detail: "Toggle the host firewall (elevated).",
        }),
      };
    }
    return { content: "The host firewall is **active** with 14 rules (sample data). I did not change anything." };
  }
  if (/(scan|nmap|pentest|exploit|crack)/.test(t)) {
    return {
      content:
        "I can help plan authorised security testing. I will only run a tool against a target **you own or have written permission to test**. Which target and scope should I use?",
      proposal: proposal({
        operation: "run_security_tool", title: "Run a security tool", target: "(target required)",
        detail: "No command is prepared yet. Confirm the target and authorisation first.",
      }),
    };
  }
  if (/(summari[sz]e|summary of)/.test(t)) {
    return {
      content: "To summarise a file I have to read it and pass the contents to the AI model. Please approve.",
      proposal: proposal({
        operation: "read_file_for_summary", title: "Read file for summary", target: "/home/panda/notes.md",
        detail: "Read /home/panda/notes.md and summarise it with the selected model.",
      }),
    };
  }
  const exp = t.match(/(?:explain|what does|what is)\s+(?:the\s+)?(?:command\s+)?`?([\w\-./ ]+)`?/);
  if (exp && /explain|what does/.test(t)) {
    return {
      content: `**${(exp[1] ?? "").trim()}**\n\nIn the demo I only have a short built-in glossary. Connect a local model in **Settings → Assistant** and I can explain any command in detail, with safer alternatives where they exist.`,
    };
  }
  if (/^(hi|hello|hey|yo)\b/.test(t)) {
    return { content: "Hello! I'm **P**, your personal assistant on Pandatechs Desktop. What would you like to do?" };
  }
  return {
    content:
      "I'm running in **demo mode** with built-in answers only. Things you can try:\n\n" +
      "- *Open the terminal*\n- *How is my system doing?*\n- *Show network interfaces*\n- *Create folder reports-2025*\n- *Find report*\n\n" +
      "Connect a local model in **Settings → Assistant** for open-ended help.",
  };
}

const demoAssistant: AssistantProvider = {
  id: "demo",
  label: "P Demo (built-in)",
  sendsDataOffDevice: false,
  async status() {
    return { available: true, label: "Demo mode", detail: "Rule-based sample replies. No model is running." };
  },
  async send(history: ChatMessage[], { signal, onToken }) {
    const last = [...history].reverse().find((m) => m.role === "user");
    await wait(550, signal);
    const reply = intent(last?.content ?? "");
    const words = reply.content.split(/(\s+)/);
    for (const w of words) {
      onToken(w);
      await wait(14, signal);
    }
    return reply;
  },
};

/* ---------- bridge (never touches a real system) ---------- */
const demoBridge = {
  async execute(p: ActionProposal): Promise<ActionResult> {
    await wait(700);
    return {
      ok: true,
      confirmedByNative: false,
      message: `Demo mode: "${p.title}" was approved but nothing was changed on a real system.`,
    };
  },
};

export const demoIntegration: Omit<Integration, "assistants"> & { assistants: Record<string, AssistantProvider> } = {
  mode: "demo",
  system: {
    getMetrics: () => sample(demoMetricsSnapshot()),
    getProcesses: () =>
      sample(
        PROCESSES.map((p) => ({
          ...p,
          cpuPercent: Math.max(0, p.cpuPercent + (Math.random() - 0.5) * 1.6),
        })),
      ),
  },
  network: {
    getState: () => sample(demoNetworkSnapshot()),
    getConnections: () => sample(CONNECTIONS),
  },
  files: {
    places: () => sample(PLACES),
    list: (path) => sample(FS[path] ?? []),
    recent: () => sample(RECENT),
  },
  launcher: {
    listApps: () => sample(APPS),
    launchNative: async (f) => ({
      ok: true,
      confirmedByNative: false,
      message: `Demo mode: "${f}" was not launched because there is no native bridge.`,
    }),
  },
  windows: { listWindows: () => sample(WINDOWS) },
  security: {
    firewall: () => sample({ active: true, backend: "nftables (sample)", totalRules: 14, allow: 9, deny: 5 }),
    events: () => sample(SECURITY_EVENTS),
    updates: () => sample({ available: 12, security: 3, lastChecked: new Date(Date.now() - 90 * 60_000).toISOString() }),
  },
  notifications: { list: () => sample(NOTIFICATIONS) },
  assistants: { demo: demoAssistant },
  speech: {
    available: false,
    listen: async () => {
      throw new Error("Voice input is not available in demo mode.");
    },
    speak: async () => {
      throw new Error("Speech output is not available in demo mode.");
    },
  },
  bridge: demoBridge,
};
