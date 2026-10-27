import { useState } from "react";
import { AlertTriangle, ArrowDown, ArrowUp, Bluetooth, Cable, CheckCircle2, Info, RefreshCw, ShieldCheck, ShieldOff, Wifi } from "lucide-react";
import { EmptyState, Meter, Panel, Ring, Sparkline } from "@/components/pt/ui/bits";
import { ConnectionsWidget } from "@/components/pt/widgets/Widgets";
import { Button } from "@/components/ui/button";
import { usePolled } from "@/lib/pt/integration";
import { formatBytes, formatRate, formatUptime, timeAgo } from "@/lib/pt/format";
import { sendMessage } from "@/lib/pt/assistant";
import { setDesktop, toast } from "@/lib/pt/store";
import { cn } from "@/lib/utils";

const Unavailable = ({ error }: { error?: string | undefined }) => <EmptyState kind="unavailable" title="Not connected" body={error} />;

/* --------------------------------- Monitor --------------------------------- */
export function MonitorApp() {
  const m = usePolled((i) => i.system.getMetrics(), 1200);
  const p = usePolled((i) => i.system.getProcesses(), 2500);
  const d = m.result?.data;
  const [sort, setSort] = useState<"cpuPercent" | "memPercent">("cpuPercent");
  if (!d) return <Unavailable error={m.result?.error} />;
  const procs = [...(p.result?.data ?? [])].sort((a, b) => b[sort] - a[sort]);
  return (
    <div className="grid h-full min-h-0 grid-cols-[1fr_26rem] gap-3 p-3">
      <div className="grid min-h-0 grid-rows-[auto_1fr_1fr] gap-3">
        <div className="grid grid-cols-4 gap-3">
          {[
            { l: "CPU", v: d.cpuPercent, s: `${d.cores} cores`, t: "cyan" as const },
            { l: "Memory", v: (d.memUsedBytes / d.memTotalBytes) * 100, s: `${formatBytes(d.memUsedBytes)} used`, t: "violet" as const },
            { l: "Disk /", v: (d.rootUsedBytes / d.rootTotalBytes) * 100, s: `${formatBytes(d.rootUsedBytes, 0)} used`, t: "ice" as const },
            { l: "Uptime", v: 100, s: formatUptime(d.uptimeSec), t: "success" as const },
          ].map((r) => (
            <div key={r.l} className="panel flex items-center gap-3 p-3">
              <Ring value={r.v} size={62} tone={r.t} label={r.l === "Uptime" ? "OK" : undefined} />
              <div><p className="hud-label">{r.l}</p><p className="text-xs text-text-2">{r.s}</p></div>
            </div>
          ))}
        </div>
        <Panel title="CPU usage" source={m.result?.source} bodyClassName="p-3"><Sparkline data={d.cpuHistory} max={100} height={150} className="!h-full" /></Panel>
        <div className="grid grid-cols-2 gap-3">
          <Panel title="Memory" source={m.result?.source} bodyClassName="p-3"><Sparkline data={d.memHistory} max={100} tone="violet" height={120} className="!h-full" /></Panel>
          <Panel title="Disk I/O" source={m.result?.source} bodyClassName="p-3"><Sparkline data={d.diskIoHistory} max={100} tone="warning" height={120} className="!h-full" /></Panel>
        </div>
      </div>
      <Panel title="Processes" source={p.result?.source} bodyClassName="scroll-thin overflow-auto" actions={<><button type="button" className={cn("text-[10px]", sort === "cpuPercent" ? "text-cyan" : "text-text-3")} onClick={() => setSort("cpuPercent")}>CPU</button><button type="button" className={cn("ml-2 text-[10px]", sort === "memPercent" ? "text-cyan" : "text-text-3")} onClick={() => setSort("memPercent")}>MEM</button></>}>
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-panel text-left text-text-3"><tr>{["PID", "Name", "CPU", "MEM"].map((h) => <th key={h} className="px-3 py-1.5 font-display text-[9px] uppercase tracking-wider">{h}</th>)}</tr></thead>
          <tbody>
            {procs.map((x) => (
              <tr key={x.pid} className="border-t border-line/40 hover:bg-surface/30">
                <td className="px-3 py-1.5 font-mono text-text-3">{x.pid}</td>
                <td className="px-3 text-text">{x.name}</td>
                <td className="px-3 text-text-2"><div className="flex items-center gap-2">{x.cpuPercent.toFixed(1)}<Meter value={x.cpuPercent * 5} className="w-10" tone="cyan" /></div></td>
                <td className="px-3 text-text-2">{x.memPercent.toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="p-3 text-[10px] text-text-3">Ending processes needs approval and the native bridge; it is not offered in the prototype.</p>
      </Panel>
    </div>
  );
}

/* --------------------------------- Network --------------------------------- */
export function NetworkApp() {
  const n = usePolled((i) => i.network.getState(), 1500);
  const s = n.result?.data;
  if (!s) return <Unavailable error={n.result?.error} />;
  return (
    <div className="grid h-full min-h-0 grid-cols-[22rem_1fr] gap-3 p-3">
      <div className="flex min-h-0 flex-col gap-3">
        <Panel title="Interfaces" source={n.result?.source} bodyClassName="divide-y divide-line/50 overflow-auto scroll-thin">
          {s.interfaces.map((i) => (
            <div key={i.name} className="flex items-center gap-3 px-3 py-2.5">
              {i.kind === "wifi" ? <Wifi className="size-4 text-cyan" /> : <Cable className="size-4 text-cyan" />}
              <div className="min-w-0 flex-1"><p className="font-mono text-xs text-text">{i.name}</p><p className="text-[11px] text-text-3">{i.address ?? (i.ssid ? `${i.ssid} · ${i.signal}%` : "No address")}</p></div>
              <span className={cn("rounded-full px-2 py-px font-display text-[9px] uppercase tracking-wider", i.state === "up" ? "bg-success/15 text-success" : "bg-surface text-text-3")}>{i.state}</span>
            </div>
          ))}
        </Panel>
        <Panel title="Bluetooth" bodyClassName="flex items-center gap-3 p-3">
          <Bluetooth className="size-5 text-cyan" />
          <span className="text-sm text-text-2 capitalize">{s.bluetooth}</span>
          <Button size="xs" variant="hud" className="ml-auto" onClick={() => toast("Toggling radios needs the native bridge.", "info")}>Toggle</Button>
        </Panel>
        <Button variant="hud" onClick={() => { setDesktop({ assistantOpen: true }); void sendMessage("Show network interfaces"); }}>Ask P about my network</Button>
      </div>
      <div className="grid min-h-0 grid-rows-[auto_1fr] gap-3">
        <div className="grid grid-cols-2 gap-3">
          <Panel title="Download" source={n.result?.source} bodyClassName="p-3"><p className="mb-1 flex items-center gap-1 font-display text-2xl text-cyan"><ArrowDown className="size-5" />{formatRate(s.downBps)}</p><Sparkline data={s.downHistory} height={70} /></Panel>
          <Panel title="Upload" source={n.result?.source} bodyClassName="p-3"><p className="mb-1 flex items-center gap-1 font-display text-2xl text-violet"><ArrowUp className="size-5" />{formatRate(s.upBps)}</p><Sparkline data={s.upHistory} tone="violet" height={70} /></Panel>
        </div>
        <ConnectionsWidget />
      </div>
    </div>
  );
}

/* --------------------------------- Security -------------------------------- */
export function SecurityApp() {
  const fw = usePolled((i) => i.security.firewall());
  const ev = usePolled((i) => i.security.events());
  const up = usePolled((i) => i.security.updates());
  const f = fw.result?.data;
  const ask = (t: string) => { setDesktop({ assistantOpen: true }); void sendMessage(t); };
  return (
    <div className="grid h-full min-h-0 grid-cols-[22rem_1fr] gap-3 p-3">
      <div className="flex flex-col gap-3">
        <Panel title="Firewall" source={fw.result?.source} bodyClassName="p-4">
          {!f ? <Unavailable error={fw.result?.error} /> : (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                {f.active ? <ShieldCheck className="size-9 text-success" /> : <ShieldOff className="size-9 text-danger" />}
                <div><p className="font-display text-lg font-semibold">{f.active ? "Active" : "Inactive"}</p><p className="text-xs text-text-3">{f.backend}</p></div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                {[["Rules", f.totalRules], ["Allow", f.allow], ["Deny", f.deny]].map(([k, v]) => <div key={k} className="rounded-lg border border-line bg-deep/50 py-2"><p className="font-display text-lg text-text">{v}</p><p className="text-text-3">{k}</p></div>)}
              </div>
              <Button size="sm" variant="hud" className="w-full" onClick={() => ask("Disable the firewall")}>Change firewall… (needs approval)</Button>
            </div>
          )}
        </Panel>
        <Panel title="Updates" source={up.result?.source} bodyClassName="p-4">
          {!up.result?.data ? <Unavailable error={up.result?.error} /> : (
            <div className="space-y-3 text-sm">
              <p><b className="font-display text-xl text-warning">{up.result.data.available}</b> updates available, <b className="text-danger">{up.result.data.security}</b> security.</p>
              <p className="text-xs text-text-3">Checked {timeAgo(up.result.data.lastChecked)}</p>
              <Button size="sm" variant="hud" className="w-full" onClick={() => ask("Install security updates")}><RefreshCw /> Install… (needs approval)</Button>
            </div>
          )}
        </Panel>
        <div className="panel p-3 text-xs leading-relaxed text-text-3"><Info className="mb-1 size-4 text-cyan" />Security tools are listed in Applications. P only runs them against targets you own or have written permission to test, and always after your approval.</div>
      </div>
      <Panel title="Security events" source={ev.result?.source} bodyClassName="scroll-thin overflow-auto">
        {!ev.result?.data ? <Unavailable error={ev.result?.error} /> : (
          <ul className="divide-y divide-line/50">
            {ev.result.data.map((e) => (
              <li key={e.id} className="flex items-center gap-3 px-4 py-3">
                {e.level === "critical" ? <AlertTriangle className="size-4 text-danger" /> : e.level === "warning" ? <AlertTriangle className="size-4 text-warning" /> : <CheckCircle2 className="size-4 text-cyan" />}
                <div className="flex-1"><p className="text-sm text-text">{e.title}</p><p className="text-[11px] text-text-3">{e.source} · {timeAgo(e.at)}</p></div>
                <Button size="xs" variant="quiet" onClick={() => ask(`Explain this event: ${e.title}`)}>Ask P</Button>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
