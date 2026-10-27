/**
 * SAMPLE DATA ONLY.
 * Everything in this file is invented for the prototype. It is only reachable
 * through the demo providers and is always surfaced in the UI as "Sample".
 */
import type {
  AppEntry, Connection, FsEntry, NativeWindow, NotificationItem, Place, ProcessInfo, SecurityEvent,
} from "../types";

const iso = (minsAgo: number) => new Date(Date.now() - minsAgo * 60_000).toISOString();

export const DEMO_HOME = "/home/panda";

export const PLACES: Place[] = [
  { id: "home", label: "Home", path: "/home/panda", glyph: "home", section: "places" },
  { id: "desktop", label: "Desktop", path: "/home/panda/Desktop", glyph: "desktop", section: "places" },
  { id: "documents", label: "Documents", path: "/home/panda/Documents", glyph: "documents", section: "places" },
  { id: "downloads", label: "Downloads", path: "/home/panda/Downloads", glyph: "downloads", section: "places" },
  { id: "projects", label: "Projects", path: "/home/panda/Projects", glyph: "projects", section: "places" },
  { id: "pictures", label: "Pictures", path: "/home/panda/Pictures", glyph: "pictures", section: "places" },
  { id: "tools", label: "Tools", path: "/home/panda/Tools", glyph: "tools", section: "places" },
  { id: "reports", label: "Reports", path: "/home/panda/Reports", glyph: "reports", section: "places" },
  { id: "trash", label: "Trash", path: "/home/panda/.local/share/Trash", glyph: "trash", section: "places" },
  { id: "fs", label: "File System", path: "/", glyph: "filesystem", section: "devices" },
  { id: "disk", label: "Pandatechs Disk", path: "/media/pandatechs", glyph: "drive", section: "devices" },
  { id: "net", label: "Network", path: "network:///", glyph: "network", section: "network" },
];

const folder = (
  path: string,
  glyph: FsEntry["glyph"],
  items: number,
  minsAgo = 600,
  extra: Partial<FsEntry> = {},
): FsEntry => ({
  name: path.split("/").filter(Boolean).pop() || "/",
  path,
  kind: "folder",
  glyph,
  items,
  modified: iso(minsAgo),
  permissions: "drwxr-xr-x",
  owner: "panda",
  group: "panda",
  ...extra,
});

const file = (path: string, size: number, minsAgo = 90, extra: Partial<FsEntry> = {}): FsEntry => ({
  name: path.split("/").pop()!,
  path,
  kind: "file",
  ext: path.includes(".") ? path.split(".").pop() : "",
  sizeBytes: size,
  modified: iso(minsAgo),
  permissions: "-rw-r--r--",
  owner: "panda",
  group: "panda",
  ...extra,
});

export const FS: Record<string, FsEntry[]> = {
  "/home/panda": [
    folder("/home/panda/Desktop", "desktop", 6),
    folder("/home/panda/Documents", "documents", 14),
    folder("/home/panda/Downloads", "downloads", 9, 45),
    folder("/home/panda/Pictures", "pictures", 31),
    folder("/home/panda/Music", "music", 0),
    folder("/home/panda/Videos", "videos", 3),
    folder("/home/panda/Projects", "projects", 5, 120),
    folder("/home/panda/Tools", "tools", 11),
    folder("/home/panda/Reports", "reports", 7, 300),
    folder("/home/panda/Workspace", "workspace", 4, 60),
    folder("/home/panda/Templates", "templates", 2),
    folder("/home/panda/Public", "public", 0),
    file("/home/panda/notes.md", 2_140, 15),
    file("/home/panda/todo.txt", 640, 240),
  ],
  "/home/panda/Projects": [
    folder("/home/panda/Projects/panda-lab", "code", 18, 70),
    folder("/home/panda/Projects/site-audit", "webapp", 24, 180),
    folder("/home/panda/Projects/network-map", "network", 9, 400),
    folder("/home/panda/Projects/automation", "scripts", 12, 1200),
    folder("/home/panda/Projects/research", "osint", 6, 3000),
    file("/home/panda/Projects/README.md", 1_320, 2000),
  ],
  "/home/panda/Tools": [
    folder("/home/panda/Tools/recon", "recon", 8),
    folder("/home/panda/Tools/scripts", "scripts", 14),
    folder("/home/panda/Tools/wordlists", "wordlists", 5),
    folder("/home/panda/Tools/payloads", "payloads", 3),
    folder("/home/panda/Tools/configs", "configs", 7),
    file("/home/panda/Tools/setup.sh", 3_900, 5000, { permissions: "-rwxr-xr-x" }),
  ],
  "/home/panda/Documents": [
    folder("/home/panda/Documents/Clients", "documents", 4),
    folder("/home/panda/Documents/Templates", "templates", 6),
    file("/home/panda/Documents/engagement-plan.md", 4_800, 200),
    file("/home/panda/Documents/checklist.pdf", 182_000, 1100),
    file("/home/panda/Documents/meeting-notes.txt", 2_900, 320),
    file("/home/panda/Documents/budget.csv", 8_400, 4200),
  ],
  "/home/panda/Downloads": [
    file("/home/panda/Downloads/panda-wallpaper-pack.zip", 48_400_000, 20),
    file("/home/panda/Downloads/network-diagram.png", 640_000, 44),
    file("/home/panda/Downloads/report-template.docx", 96_000, 150),
    file("/home/panda/Downloads/sample-capture.pcap", 12_800_000, 380),
  ],
  "/home/panda/Reports": [
    file("/home/panda/Reports/Q3-assessment.pdf", 1_240_000, 400),
    file("/home/panda/Reports/findings-summary.md", 6_100, 420),
    file("/home/panda/Reports/executive-brief.pdf", 540_000, 900),
  ],
  "/home/panda/Workspace": [
    folder("/home/panda/Workspace/active", "workspace", 3),
    folder("/home/panda/Workspace/scratch", "generic", 9),
    file("/home/panda/Workspace/session.log", 18_000, 3),
  ],
  "/": [
    folder("/bin", "generic", 0), folder("/etc", "configs", 0), folder("/home", "home", 1),
    folder("/opt", "generic", 4), folder("/usr", "generic", 0), folder("/var", "logs", 0),
  ],
};

export const RECENT: FsEntry[] = [
  file("/home/panda/notes.md", 2_140, 15),
  file("/home/panda/Workspace/session.log", 18_000, 3),
  file("/home/panda/Documents/engagement-plan.md", 4_800, 200),
  file("/home/panda/Reports/findings-summary.md", 6_100, 420),
  file("/home/panda/Downloads/network-diagram.png", 640_000, 44),
  file("/home/panda/Tools/setup.sh", 3_900, 5000),
];

export const FILE_CONTENT: Record<string, string> = {
  "/home/panda/notes.md":
    "# Daily notes\n\n- Review the weekly status report\n- Tidy the Tools folder\n- Try the new network view\n\n> Sample file shown by the demo file provider.\n",
  "/home/panda/todo.txt": "1. Update documentation\n2. Back up project folder\n3. Plan next sprint\n",
  "/home/panda/Tools/setup.sh":
    '#!/usr/bin/env bash\n# Sample setup script (not executed by the prototype)\nset -euo pipefail\n\necho "Preparing workspace..."\nmkdir -p "$HOME/Workspace/active"\necho "Done."\n',
  "/home/panda/Projects/README.md":
    "# Projects\n\nEach folder is a separate workspace. Open one in the editor from the Files app.\n",
  "/home/panda/Documents/engagement-plan.md":
    "# Engagement plan (sample)\n\n## Scope\nDescribe what is in and out of scope.\n\n## Timeline\n| Week | Focus |\n| --- | --- |\n| 1 | Planning |\n| 2 | Assessment |\n| 3 | Reporting |\n",
  "/home/panda/Reports/findings-summary.md":
    "# Findings summary (sample)\n\n1. Outdated TLS configuration on a staging host - **medium**\n2. Verbose error pages - **low**\n3. Missing security headers - **low**\n",
  "/home/panda/Workspace/session.log": "[10:02] workspace opened\n[10:05] indexed 214 files\n[10:11] sync idle\n",
};

/* ---------------- processes ---------------- */
export const PROCESSES: ProcessInfo[] = [
  { pid: 1243, name: "pandatechs-shell", user: "panda", cpuPercent: 4.2, memPercent: 3.1 },
  { pid: 1581, name: "firefox-esr", user: "panda", cpuPercent: 8.9, memPercent: 11.4 },
  { pid: 2047, name: "code-oss", user: "panda", cpuPercent: 3.4, memPercent: 7.2 },
  { pid: 912, name: "Xorg", user: "root", cpuPercent: 2.1, memPercent: 1.8 },
  { pid: 1980, name: "xfce4-terminal", user: "panda", cpuPercent: 0.7, memPercent: 0.9 },
  { pid: 702, name: "NetworkManager", user: "root", cpuPercent: 0.3, memPercent: 0.4 },
  { pid: 811, name: "pandatechs-bridge", user: "panda", cpuPercent: 0.2, memPercent: 0.5 },
  { pid: 1033, name: "ollama", user: "panda", cpuPercent: 0.1, memPercent: 2.0 },
  { pid: 655, name: "systemd-journald", user: "root", cpuPercent: 0.1, memPercent: 0.3 },
  { pid: 1402, name: "thunar", user: "panda", cpuPercent: 0.4, memPercent: 1.2 },
];

export const CONNECTIONS: Connection[] = [
  { proto: "tcp", local: "192.168.1.101:54210", remote: "142.250.72.14:443", state: "ESTABLISHED", pid: 1581, process: "firefox-esr" },
  { proto: "tcp", local: "192.168.1.101:45866", remote: "140.82.114.4:443", state: "ESTABLISHED", pid: 2047, process: "code-oss" },
  { proto: "tcp", local: "192.168.1.101:39022", remote: "104.18.32.7:443", state: "ESTABLISHED", pid: 1581, process: "firefox-esr" },
  { proto: "tcp", local: "127.0.0.1:11434", remote: "0.0.0.0:*", state: "LISTEN", pid: 1033, process: "ollama" },
  { proto: "tcp", local: "127.0.0.1:7421", remote: "0.0.0.0:*", state: "LISTEN", pid: 811, process: "pandatechs-bridge" },
  { proto: "udp", local: "192.168.1.101:68", remote: "192.168.1.1:67", state: "UNCONN", pid: 702, process: "NetworkManager" },
  { proto: "tcp", local: "192.168.1.101:51044", remote: "151.101.1.69:443", state: "TIME_WAIT", pid: 1581, process: "firefox-esr" },
  { proto: "tcp", local: "192.168.1.101:36110", remote: "34.120.52.66:443", state: "CLOSE_WAIT", pid: 1581, process: "firefox-esr" },
];

export const SECURITY_EVENTS: SecurityEvent[] = [
  { id: "e1", level: "info", title: "Firewall policy loaded", at: iso(12), source: "firewall" },
  { id: "e2", level: "warning", title: "3 failed sign-in attempts (sample)", at: iso(44), source: "auth" },
  { id: "e3", level: "info", title: "Security updates checked", at: iso(90), source: "updates" },
  { id: "e4", level: "critical", title: "Unrecognised device on LAN (sample)", at: iso(190), source: "network" },
  { id: "e5", level: "info", title: "Disk health OK", at: iso(380), source: "storage" },
];

export const NOTIFICATIONS: NotificationItem[] = [
  { id: "n1", kind: "ai", title: "P suggests a cleanup", body: "Downloads has 9 items older than 7 days.", at: iso(5) },
  { id: "n2", kind: "network", title: "Network connected", body: "Wired connection established (sample).", at: iso(30) },
  { id: "n3", kind: "done", title: "Workspace synced", body: "Projects folder is up to date.", at: iso(75), read: true },
  { id: "n4", kind: "warning", title: "Updates available", body: "12 packages can be updated (sample).", at: iso(120) },
];

export const WINDOWS: NativeWindow[] = [
  { id: "w1", title: "Terminal", app: "terminal", icon: "terminal", workspace: 1, focused: true },
  { id: "w2", title: "Files - Home", app: "files", icon: "folder", workspace: 1, focused: false },
  { id: "w3", title: "Pandatechs Browser", app: "browser", icon: "globe", workspace: 1, focused: false },
  { id: "w4", title: "notes.md - Editor", app: "editor", icon: "code", workspace: 2, focused: false },
  { id: "w5", title: "System Monitor", app: "monitor", icon: "activity", workspace: 3, focused: false },
];

/* ---------------- applications ---------------- */
const internal = (appId: any): AppEntry["launch"] => ({ kind: "internal", appId });
const native = (desktopFile: string): AppEntry["launch"] => ({ kind: "native", desktopFile });

export const APPS: AppEntry[] = [
  { id: "files", name: "Files", category: "system", description: "Browse and manage files", icon: "folder", installed: true, launch: internal("files"), favorite: true },
  { id: "terminal", name: "Terminal", category: "system", description: "Command line", icon: "terminal", installed: true, launch: internal("terminal"), favorite: true },
  { id: "editor", name: "Editor", category: "development", description: "Code and text editor", icon: "code", installed: true, launch: internal("editor"), favorite: true },
  { id: "notes", name: "Notes", category: "accessories", description: "Markdown notes", icon: "notebook", installed: true, launch: internal("notes") },
  { id: "monitor", name: "System Monitor", category: "system", description: "CPU, memory, disk, processes", icon: "activity", installed: true, launch: internal("monitor"), favorite: true },
  { id: "network", name: "Network Center", category: "information-gathering", description: "Interfaces, traffic, connections", icon: "network", installed: true, launch: internal("network"), favorite: true },
  { id: "location", name: "Location Center", category: "system", description: "Consent-based live location sharing", icon: "map-pin", installed: true, launch: internal("location"), favorite: true },
  { id: "security", name: "Security Center", category: "vulnerability-analysis", description: "Firewall, updates, events", icon: "shield", installed: true, launch: internal("security"), favorite: true },
  { id: "assistant", name: "P - Personal AI", category: "ai", description: "Your on-device assistant", icon: "bot", installed: true, launch: internal("assistant"), favorite: true },
  { id: "settings", name: "Settings", category: "system", description: "Appearance, assistant, privacy", icon: "settings", installed: true, launch: internal("settings") },
  { id: "workspaces", name: "Workspaces", category: "system", description: "Projects and sessions", icon: "layout", installed: true, launch: internal("workspaces") },
  { id: "browser", name: "Browser", category: "accessories", description: "Web browser", icon: "globe", installed: "unknown", launch: native("firefox-esr.desktop") },
  { id: "nmap", name: "Nmap", category: "information-gathering", description: "Network scanner", icon: "radar", installed: "unknown", launch: native("nmap.desktop") },
  { id: "wireshark", name: "Wireshark", category: "information-gathering", description: "Packet analyser", icon: "waves", installed: "unknown", launch: native("wireshark.desktop") },
  { id: "whois", name: "Whois lookup", category: "information-gathering", description: "Domain registration data", icon: "search", installed: "unknown", launch: native("whois.desktop") },
  { id: "maltego", name: "Maltego", category: "information-gathering", description: "Link analysis", icon: "share", installed: "unknown", launch: native("maltego.desktop") },
  { id: "nikto", name: "Nikto", category: "vulnerability-analysis", description: "Web server scanner", icon: "bug", installed: "unknown", launch: native("nikto.desktop") },
  { id: "lynis", name: "Lynis", category: "vulnerability-analysis", description: "System audit", icon: "clipboard", installed: "unknown", launch: native("lynis.desktop") },
  { id: "burp", name: "Burp Suite", category: "web-application", description: "Web proxy", icon: "globe", installed: "unknown", launch: native("burpsuite.desktop") },
  { id: "zap", name: "ZAP", category: "web-application", description: "Web app scanner", icon: "zap", installed: "unknown", launch: native("zaproxy.desktop") },
  { id: "sqlmap", name: "sqlmap", category: "web-application", description: "SQL injection testing", icon: "database", installed: "unknown", launch: native("sqlmap.desktop") },
  { id: "metasploit", name: "Metasploit", category: "exploitation", description: "Framework console", icon: "target", installed: "unknown", launch: native("msfconsole.desktop") },
  { id: "searchsploit", name: "Searchsploit", category: "exploitation", description: "Offline exploit index", icon: "search", installed: "unknown", launch: native("searchsploit.desktop") },
  { id: "netcat", name: "Netcat", category: "post-exploitation", description: "Network utility", icon: "cable", installed: "unknown", launch: native("netcat.desktop") },
  { id: "john", name: "John", category: "password-auditing", description: "Password auditing", icon: "key", installed: "unknown", launch: native("john.desktop") },
  { id: "hashcat", name: "Hashcat", category: "password-auditing", description: "Hash recovery", icon: "hash", installed: "unknown", launch: native("hashcat.desktop") },
  { id: "aircrack", name: "Aircrack-ng", category: "wireless", description: "Wireless auditing", icon: "wifi", installed: "unknown", launch: native("aircrack-ng.desktop") },
  { id: "kismet", name: "Kismet", category: "wireless", description: "Wireless detector", icon: "radio", installed: "unknown", launch: native("kismet.desktop") },
  { id: "autopsy", name: "Autopsy", category: "forensics", description: "Disk forensics", icon: "hard-drive", installed: "unknown", launch: native("autopsy.desktop") },
  { id: "volatility", name: "Volatility", category: "forensics", description: "Memory forensics", icon: "memory", installed: "unknown", launch: native("volatility.desktop") },
  { id: "dradis", name: "Dradis", category: "reporting", description: "Report collaboration", icon: "file-text", installed: "unknown", launch: native("dradis.desktop") },
  { id: "ghidra", name: "Ghidra", category: "reverse-engineering", description: "Reverse engineering suite", icon: "cpu", installed: "unknown", launch: native("ghidra.desktop") },
  { id: "setoolkit", name: "SET", category: "social-engineering", description: "Awareness simulation toolkit", icon: "users", installed: "unknown", launch: native("setoolkit.desktop") },
];

/* ---------------- projects / workspaces ---------------- */
export interface DemoProject {
  id: string;
  name: string;
  description: string;
  status: "active" | "paused" | "done";
  progress: number;
  tasks: { id: string; text: string; done: boolean }[];
  updated: string;
}
export const PROJECTS: DemoProject[] = [
  {
    id: "p1", name: "Panda Lab", description: "Internal tooling and experiments", status: "active", progress: 64, updated: iso(70),
    tasks: [
      { id: "t1", text: "Draft architecture notes", done: true },
      { id: "t2", text: "Prototype dashboard widgets", done: true },
      { id: "t3", text: "Review accessibility", done: false },
      { id: "t4", text: "Write release notes", done: false },
    ],
  },
  {
    id: "p2", name: "Site Audit", description: "Quarterly web review for a sample client", status: "active", progress: 38, updated: iso(180),
    tasks: [
      { id: "t5", text: "Collect scope document", done: true },
      { id: "t6", text: "Review headers and TLS", done: false },
      { id: "t7", text: "Summarise findings", done: false },
    ],
  },
  {
    id: "p3", name: "Network Map", description: "Home-lab topology diagram", status: "paused", progress: 80, updated: iso(2000),
    tasks: [
      { id: "t8", text: "Export device list", done: true },
      { id: "t9", text: "Label VLANs", done: true },
      { id: "t10", text: "Publish diagram", done: false },
    ],
  },
];

export const SAMPLE_CODE = `// workspace/dashboard.ts
import { getMetrics } from "./provider";

interface Widget {
  id: string;
  title: string;
  refreshMs: number;
}

const widgets: Widget[] = [
  { id: "cpu", title: "CPU", refreshMs: 1000 },
  { id: "mem", title: "Memory", refreshMs: 2000 },
];

export async function refresh(widget: Widget) {
  const metrics = await getMetrics();
  console.log(\`\${widget.title}: \${metrics.cpuPercent}%\`); // sample
  return metrics;
}
`;
