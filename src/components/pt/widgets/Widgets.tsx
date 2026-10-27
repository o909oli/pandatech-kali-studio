import { useEffect, useState } from "react";
import { Activity, AppWindow, ArrowDown, ArrowUp, Clock, Cpu, FileText, Folder, Network, Radar, Shield, Terminal, Wrench } from "lucide-react";
import { EmptyState, Meter, Panel, Ring, Sparkline } from "@/components/pt/ui/bits";
import { FileIcon, FolderIcon } from "@/components/pt/ui/FolderIcon";
import { usePolled } from "@/lib/pt/integration";
import { formatBytes, formatRate, timeAgo, formatUptime } from "@/lib/pt/format";
import { useOpenApp } from "@/lib/pt/apps";
import { AppGlyph } from "@/components/pt/ui/AppGlyph";
import { cn } from "@/lib/utils";

const Unavailable = ({ error }: { error?: string | undefined }) => <EmptyState kind="unavailable" title="Not connected" body={error} />;

export function SystemOverview({ className }: { className?: string | undefined }) {
  const { result } = usePolled((i) => i.system.getMetrics(), 1500);
  const m = result?.data;
  return (
    <Panel title="System Overview" icon={<Cpu />} source={result?.source} className={className} bodyClassName="p-3">
      {!m ? (
        <Unavailable error={result?.error} />
      ) : (
        <div className="grid grid-cols-4 gap-2 text-center">
          {[
            { l: "CPU", v: m.cpuPercent, s: `${m.cores} cores`, t: "cyan" as const },
            { l: "RAM", v: (m.memUsedBytes / m.memTotalBytes) * 100, s: `${formatBytes(m.memUsedBytes, 1)}`, t: "violet" as const },
            { l: "Disk", v: (m.rootUsedBytes / m.rootTotalBytes) * 100, s: `${formatBytes(m.rootUsedBytes, 0)}`, t: "ice" as const },
            { l: "Load", v: Math.min(100, m.loadAvg[0] * 100), s: m.loadAvg[0].toFixed(2), t: "success" as const },
          ].map((r) => (
            <div key={r.l} className="flex flex-col items-center gap-1">
              <span className="hud-label">{r.l}</span>
              <Ring value={r.v} size={58} tone={r.t} />
              <span className="text-[10px] text-text-3">{r.s}</span>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

export function MonitorWidget({ className }: { className?: string | undefined }) {
  const { result } = usePolled((i) => i.system.getMetrics(), 1500);
  const m = result?.data;
  const open = useOpenApp();
  return (
    <Panel
      title="System Monitor"
      icon={<Activity />}
      source={result?.source}
      className={className}
      bodyClassName="p-3"
      actions={<button type="button" className="text-[10px] text-cyan hover:underline" onClick={() => open("monitor")}>Open</button>}
    >
      {!m ? (
        <Unavailable error={result?.error} />
      ) : (
        <div className="flex h-full flex-col justify-between gap-2">
          <div>
            <div className="mb-0.5 flex justify-between text-[11px]"><span className="text-text-2">CPU</span><b className="font-display text-text">{m.cpuPercent.toFixed(0)}%</b></div>
            <Sparkline data={m.cpuHistory} max={100} height={30} />
          </div>
          <div>
            <div className="mb-1 flex justify-between text-[11px]"><span className="text-text-2">Memory</span><span className="text-text-3">{formatBytes(m.memUsedBytes)} / {formatBytes(m.memTotalBytes, 0)}</span></div>
            <Meter value={(m.memUsedBytes / m.memTotalBytes) * 100} tone="electric" />
          </div>
          <div>
            <div className="mb-1 flex justify-between text-[11px]"><span className="text-text-2">Disk /</span><span className="text-text-3">{formatBytes(m.rootUsedBytes, 0)} / {formatBytes(m.rootTotalBytes, 0)}</span></div>
            <Meter value={(m.rootUsedBytes / m.rootTotalBytes) * 100} tone="violet" />
          </div>
        </div>
      )}
    </Panel>
  );
}

export function NetworkWidget({ className }: { className?: string | undefined }) {
  const { result } = usePolled((i) => i.network.getState(), 1500);
  const n = result?.data;
  const open = useOpenApp();
  return (
    <Panel
      title="Network Status"
      icon={<Network />}
      source={result?.source}
      className={className}
      bodyClassName="p-3"
      actions={<button type="button" className="text-[10px] text-cyan hover:underline" onClick={() => open("network")}>Open</button>}
    >
      {!n ? (
        <Unavailable error={result?.error} />
      ) : (
        <div className="flex h-full flex-col gap-2">
          <div className="flex items-center gap-2 text-xs">
            <span className={cn("size-2 rounded-full", n.connected ? "bg-success animate-breathe" : "bg-danger")} />
            <span className="text-text">{n.connected ? "Connected" : "Offline"}</span>
            <span className="ml-auto font-mono text-text-3">{n.interfaces.find((i) => i.name === n.primary)?.address}</span>
          </div>
          <Sparkline data={n.downHistory} tone="cyan" height={34} />
          <div className="flex justify-between text-[11px]">
            <span className="flex items-center gap-1 text-cyan"><ArrowDown className="size-3" />{formatRate(n.downBps)}</span>
            <span className="flex items-center gap-1 text-violet"><ArrowUp className="size-3" />{formatRate(n.upBps)}</span>
          </div>
        </div>
      )}
    </Panel>
  );
}

export function RecentFilesWidget({ className }: { className?: string | undefined }) {
  const { result } = usePolled((i) => i.files.recent());
  const open = useOpenApp();
  return (
    <Panel title="Recent Files" icon={<Clock />} source={result?.source} className={className} bodyClassName="overflow-y-auto scroll-thin">
      {!result?.data ? (
        <Unavailable error={result?.error} />
      ) : (
        <ul className="divide-y divide-line/50">
          {result.data.map((f) => (
            <li key={f.path}>
              <button type="button" onClick={() => open("files")} className="flex w-full items-center gap-2.5 px-3 py-1.5 text-left hover:bg-surface/40">
                <FileText className="size-4 shrink-0 text-cyan" />
                <span className="min-w-0 flex-1 truncate text-xs text-text">{f.name}</span>
                <span className="shrink-0 text-[10px] text-text-3">{timeAgo(f.modified)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

export function OpenWindowsWidget({ className }: { className?: string | undefined }) {
  const { result } = usePolled((i) => i.windows.listWindows());
  const open = useOpenApp();
  return (
    <Panel title="Open Windows" icon={<AppWindow />} source={result?.source} className={className} bodyClassName="overflow-y-auto scroll-thin">
      {!result?.data ? (
        <Unavailable error={result?.error} />
      ) : (
        <ul className="divide-y divide-line/50">
          {result.data.map((w) => (
            <li key={w.id}>
              <button type="button" onClick={() => open(w.app)} className="flex w-full items-center gap-2.5 px-3 py-1.5 text-left hover:bg-surface/40">
                <AppGlyph icon={w.icon} size="sm" />
                <span className="min-w-0 flex-1 truncate text-xs text-text">{w.title}</span>
                <span className="font-display text-[10px] text-text-3">WS {w.workspace}</span>
                {w.focused && <span className="size-1.5 rounded-full bg-cyan" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

export function ConnectionsWidget({ className }: { className?: string | undefined }) {
  const { result } = usePolled((i) => i.network.getConnections());
  return (
    <Panel title="Active Connections" icon={<Radar />} source={result?.source} className={className} bodyClassName="overflow-auto scroll-thin">
      {!result?.data ? (
        <Unavailable error={result?.error} />
      ) : (
        <table className="w-full text-left text-[11px]">
          <thead className="sticky top-0 bg-panel text-text-3">
            <tr>{["Proto", "Local", "Remote", "State", "Process"].map((h) => <th key={h} className="px-3 py-1 font-display text-[9px] uppercase tracking-wider">{h}</th>)}</tr>
          </thead>
          <tbody className="font-mono">
            {result.data.map((c, i) => (
              <tr key={i} className="border-t border-line/40 text-text-2">
                <td className="px-3 py-1 uppercase">{c.proto}</td>
                <td className="px-3 py-1">{c.local}</td>
                <td className="px-3 py-1">{c.remote}</td>
                <td className={cn("px-3 py-1", c.state === "ESTABLISHED" ? "text-success" : c.state === "LISTEN" ? "text-cyan" : "text-text-3")}>{c.state}</td>
                <td className="px-3 py-1 font-sans text-text">{c.process}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Panel>
  );
}

export function QuickToolsWidget({ className }: { className?: string | undefined }) {
  const open = useOpenApp();
  const tools = [
    { id: "terminal", label: "Terminal", icon: Terminal },
    { id: "files", label: "Files", icon: Folder },
    { id: "security", label: "Security", icon: Shield },
    { id: "applications", label: "All apps", icon: Wrench },
  ];
  return (
    <Panel title="Quick Tools" icon={<Wrench />} className={className} bodyClassName="grid grid-cols-4 gap-2 p-3">
      {tools.map((t) => (
        <button key={t.id} type="button" onClick={() => open(t.id)} className="flex flex-col items-center justify-center gap-1.5 rounded-lg border border-line bg-elevated/40 py-2 text-[11px] text-text-2 transition-colors hover:border-cyan/60 hover:text-text">
          <t.icon className="size-5 text-cyan" strokeWidth={1.6} />
          {t.label}
        </button>
      ))}
    </Panel>
  );
}

const LOG_POOL: [string, string][] = [
  ["INFO", "System scan completed (sample)"],
  ["INFO", "All services are running"],
  ["WARN", "Disk usage at 55% on /"],
  ["INFO", "Backup completed"],
  ["INFO", "P assistant ready"],
  ["INFO", "Network link stable"],
  ["INFO", "Workspace synced"],
];

export function LogsWidget({ className }: { className?: string | undefined }) {
  const [rows, setRows] = useState<{ t: string; l: string; m: string }[]>([]);
  useEffect(() => {
    const stamp = () => new Date().toLocaleTimeString([], { hour12: false });
    setRows(LOG_POOL.slice(0, 4).map(([l, m]) => ({ t: stamp(), l, m })));
    let i = 4;
    const id = setInterval(() => {
      const [l, m] = LOG_POOL[i++ % LOG_POOL.length] ?? ["INFO", "idle"];
      setRows((r) => [...r.slice(-5), { t: stamp(), l, m }]);
    }, 4000);
    return () => clearInterval(id);
  }, []);
  return (
    <Panel title="Real-time Logs" icon={<FileText />} source="sample" className={className} bodyClassName="overflow-hidden p-3 font-mono text-[10.5px] leading-5">
      {rows.map((r, i) => (
        <div key={i} className="truncate text-text-2">
          <span className="text-text-3">{r.t}</span>{" "}
          <span className={r.l === "WARN" ? "text-warning" : "text-cyan"}>[{r.l}]</span> {r.m}
        </div>
      ))}
    </Panel>
  );
}

export { FolderIcon, FileIcon };
