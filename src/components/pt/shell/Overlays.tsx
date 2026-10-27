import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Bell, BellOff, Bot, Check, CheckCheck, Maximize2, MoonStar, Search, Volume2, Sun, Wifi, Bluetooth, X, Command,
  Folder, Settings, ArrowRight,
} from "lucide-react";
import { AppGlyph } from "@/components/pt/ui/AppGlyph";
import { PAvatar, PMark } from "@/components/pt/ui/Brand";
import { Composer, StateBadge, Transcript } from "@/components/pt/assistant/Chat";
import { SourceBadge, Toggle, Kbd } from "@/components/pt/ui/bits";
import { Button } from "@/components/ui/button";
import { INTERNAL_APPS, useOpenApp } from "@/lib/pt/apps";
import { usePolled } from "@/lib/pt/integration";
import { timeAgo } from "@/lib/pt/format";
import { closeOverlays, desktopStore, setDesktop, toast, useDesktop } from "@/lib/pt/store";
import { sendMessage } from "@/lib/pt/assistant";
import type { AppCategory, AppEntry } from "@/lib/pt/types";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
export const CATEGORY_LABEL: Record<AppCategory, string> = {
  favorites: "Favorites",
  "information-gathering": "Information Gathering",
  "vulnerability-analysis": "Vulnerability Analysis",
  "web-application": "Web Application Analysis",
  exploitation: "Exploitation Tools",
  "post-exploitation": "Post Exploitation",
  "password-auditing": "Password Auditing",
  wireless: "Wireless Testing",
  forensics: "Forensics",
  reporting: "Reporting",
  "reverse-engineering": "Reverse Engineering",
  "social-engineering": "Social Engineering",
  system: "System",
  accessories: "Accessories",
  development: "Development",
  ai: "AI",
};

const Backdrop = ({ onClose, children, className }: { onClose: () => void; children: ReactNode; className?: string | undefined }) => (
  <div className={cn("absolute inset-0 z-50", className)} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
    {children}
  </div>
);

/* ------------------------------ Launcher ----------------------------- */
function Launcher() {
  const open = useOpenApp();
  const { result } = usePolled((i) => i.launcher.listApps());
  const [q, setQ] = useState("");
  const apps = result?.data ?? [];
  const filtered = useMemo(
    () => apps.filter((a) => (a.name + a.description + a.category).toLowerCase().includes(q.toLowerCase())),
    [apps, q],
  );
  const groups = useMemo(() => {
    const m = new Map<AppCategory, AppEntry[]>();
    filtered.forEach((a) => m.set(a.category, [...(m.get(a.category) ?? []), a]));
    return [...m.entries()];
  }, [filtered]);

  const launch = (a: AppEntry) => {
    if (a.launch.kind === "internal") return open(a.launch.appId);
    closeOverlays();
    void (async () => {
      const { getIntegration } = await import("@/lib/pt/integration");
      const r = await getIntegration(desktopStore.get().mode).launcher.launchNative(a.launch.kind === "native" ? a.launch.desktopFile : "");
      toast(r.message, r.ok ? "info" : "warning");
    })();
  };

  return (
    <Backdrop onClose={() => closeOverlays()} className="top-9">
      <div className="panel animate-rise absolute left-2 top-1 flex h-[34rem] w-[44rem] flex-col overflow-hidden shadow-2xl">
        <div className="flex items-center gap-2 border-b border-line p-3">
          <div className="input-surface flex flex-1 items-center gap-2 px-2.5 py-1.5">
            <Search className="size-4 text-text-3" />
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search applications" aria-label="Search applications" className="flex-1 bg-transparent text-sm outline-none placeholder:text-text-3" />
          </div>
          <SourceBadge source={result?.source} />
          <Button size="sm" variant="hud" onClick={() => open("applications")}>
            <Maximize2 /> Full view
          </Button>
        </div>
        <div className="scroll-thin min-h-0 flex-1 overflow-y-auto p-3">
          {groups.length === 0 && <p className="p-6 text-center text-sm text-text-3">No applications match "{q}".</p>}
          {groups.map(([cat, list]) => (
            <section key={cat} className="mb-4">
              <h4 className="hud-label mb-2">{CATEGORY_LABEL[cat]}</h4>
              <div className="grid grid-cols-3 gap-1.5">
                {list.map((a) => (
                  <button key={a.id} type="button" onClick={() => launch(a)} className="flex items-center gap-2.5 rounded-lg border border-transparent p-2 text-left transition-colors hover:border-line-strong hover:bg-surface/60">
                    <AppGlyph icon={a.icon} size="md" />
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] font-medium text-text">{a.name}</span>
                      <span className="block truncate text-[11px] text-text-3">
                        {a.installed === "unknown" ? "Needs native bridge" : a.description}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </Backdrop>
  );
}

/* --------------------------- Notifications --------------------------- */
function NotificationCenter() {
  const { result } = usePolled((i) => i.notifications.list());
  const items = useDesktop((s) => s.notifications);
  const dnd = useDesktop((s) => s.dnd);
  useEffect(() => {
    if (result?.data && desktopStore.get().notifications.length === 0) setDesktop({ notifications: result.data });
  }, [result]);

  return (
    <Backdrop onClose={() => closeOverlays()} className="top-9">
      <div className="panel animate-rise absolute right-2 top-1 flex max-h-[30rem] w-96 flex-col overflow-hidden shadow-2xl">
        <header className="flex items-center gap-2 border-b border-line px-3 py-2.5">
          <Bell className="size-4 text-cyan" />
          <h3 className="font-display text-sm font-semibold">Notifications</h3>
          <SourceBadge source={result?.source} />
          <div className="ml-auto flex gap-1">
            <Button size="icon-sm" variant="quiet" aria-label={dnd ? "Turn off do not disturb" : "Do not disturb"} onClick={() => setDesktop({ dnd: !dnd })}>
              {dnd ? <BellOff className="text-warning" /> : <MoonStar />}
            </Button>
            <Button size="icon-sm" variant="quiet" aria-label="Mark all read" onClick={() => setDesktop({ notifications: items.map((n) => ({ ...n, read: true })) })}>
              <CheckCheck />
            </Button>
            <Button size="icon-sm" variant="quiet" aria-label="Clear all" onClick={() => setDesktop({ notifications: [] })}>
              <X />
            </Button>
          </div>
        </header>
        <ul className="scroll-thin min-h-0 flex-1 overflow-y-auto">
          {items.length === 0 && <li className="p-8 text-center text-sm text-text-3">You're all caught up.</li>}
          {items.map((n) => (
            <li key={n.id} className={cn("flex gap-3 border-b border-line/60 px-3 py-2.5", !n.read && "bg-electric/5")}>
              <span className={cn("mt-1 size-2 shrink-0 rounded-full", n.read ? "bg-text-3/40" : n.kind === "warning" ? "bg-warning" : n.kind === "error" ? "bg-danger" : "bg-cyan")} />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium text-text">{n.title}</p>
                <p className="text-xs text-text-2">{n.body}</p>
                <p className="mt-0.5 text-[10px] text-text-3">{timeAgo(n.at)}</p>
              </div>
              <button type="button" aria-label="Dismiss" className="text-text-3 hover:text-text" onClick={() => setDesktop({ notifications: items.filter((x) => x.id !== n.id) })}>
                <X className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </Backdrop>
  );
}

/* --------------------------- Quick settings -------------------------- */
function QuickSettings() {
  const s = useDesktop((x) => x);
  const Tile = ({ icon, label, on, onClick }: { icon: ReactNode; label: string; on: boolean; onClick: () => void }) => (
    <button type="button" onClick={onClick} aria-pressed={on} className={cn("flex flex-col items-start gap-2 rounded-lg border p-2.5 text-left transition-colors [&_svg]:size-4", on ? "border-cyan/50 bg-electric/20 text-text" : "border-line bg-elevated/50 text-text-2 hover:border-line-strong")}>
      {icon}
      <span className="text-xs font-medium">{label}</span>
      <span className="-mt-1.5 text-[10px] text-text-3">{on ? "On" : "Off"}</span>
    </button>
  );
  const Slide = ({ icon, value, onChange, label }: { icon: ReactNode; value: number; onChange: (n: number) => void; label: string }) => (
    <label className="flex items-center gap-3 text-text-2 [&_svg]:size-4">
      {icon}
      <input type="range" min={0} max={100} value={value} aria-label={label} onChange={(e) => onChange(+e.target.value)} className="h-1 flex-1 cursor-pointer accent-[var(--pt-cyan)]" />
      <span className="w-8 text-right font-display text-xs tabular-nums">{value}</span>
    </label>
  );
  return (
    <Backdrop onClose={() => closeOverlays()} className="top-9">
      <div className="panel animate-rise absolute right-2 top-1 w-80 space-y-3.5 p-3.5 shadow-2xl">
        <div className="grid grid-cols-3 gap-2">
          <Tile icon={<Wifi />} label="Wi-Fi" on={s.wifi} onClick={() => setDesktop({ wifi: !s.wifi })} />
          <Tile icon={<Bluetooth />} label="Bluetooth" on={s.bluetooth} onClick={() => setDesktop({ bluetooth: !s.bluetooth })} />
          <Tile icon={<MoonStar />} label="Do not disturb" on={s.dnd} onClick={() => setDesktop({ dnd: !s.dnd })} />
        </div>
        <Slide icon={<Volume2 />} label="Volume" value={s.volume} onChange={(volume) => setDesktop({ volume })} />
        <Slide icon={<Sun />} label="Brightness" value={s.brightness} onChange={(brightness) => setDesktop({ brightness })} />
        <div className="flex items-center justify-between border-t border-line pt-3 text-xs text-text-2">
          <span>Reduce motion</span>
          <Toggle label="Reduce motion" checked={s.reduceMotion} onChange={(reduceMotion) => setDesktop({ reduceMotion })} />
        </div>
        <p className="text-[10px] leading-relaxed text-text-3">
          These controls are a preview. Volume, brightness and radios change on the real system only after the native bridge is connected.
        </p>
      </div>
    </Backdrop>
  );
}

/* --------------------------- Command palette ------------------------- */
function CommandPalette() {
  const open = useOpenApp();
  const [q, setQ] = useState("");
  const [idx, setIdx] = useState(0);
  const { result: apps } = usePolled((i) => i.launcher.listApps());
  const { result: recent } = usePolled((i) => i.files.recent());

  const items = useMemo(() => {
    const out: { id: string; label: string; hint: string; icon: ReactNode; run: () => void }[] = [];
    Object.values(INTERNAL_APPS)
      .filter((a) => a.id !== "browser")
      .forEach((a) => out.push({ id: `app-${a.id}`, label: a.title, hint: "Open app", icon: <AppGlyph icon={a.icon} size="sm" />, run: () => open(a.id) }));
    out.push({ id: "set-accent", label: "Settings: change accent colour", hint: "Settings", icon: <Settings className="size-4 text-cyan" />, run: () => open("settings") });
    (recent?.data ?? []).forEach((f) =>
      out.push({ id: `f-${f.path}`, label: f.name, hint: f.path, icon: <Folder className="size-4 text-cyan" />, run: () => open("files") }),
    );
    (apps?.data ?? [])
      .filter((a) => a.launch.kind === "native")
      .forEach((a) => out.push({ id: `n-${a.id}`, label: a.name, hint: "Native application", icon: <AppGlyph icon={a.icon} size="sm" />, run: () => toast(`${a.name} needs the native bridge.`, "info") }));
    return out;
  }, [apps, recent, open]);

  const needle = q.trim().toLowerCase();
  const filtered = needle ? items.filter((i) => (i.label + i.hint).toLowerCase().includes(needle)) : items.slice(0, 9);
  useEffect(() => setIdx(0), [q]);

  const askP = () => {
    closeOverlays();
    setDesktop({ assistantOpen: true });
    void sendMessage(q);
    setQ("");
  };
  const run = (i: number) => {
    const item = filtered[i];
    if (item) {
      closeOverlays();
      item.run();
    } else if (q.trim()) askP();
  };

  return (
    <Backdrop onClose={() => closeOverlays()} className="bg-deep/50 backdrop-blur-[2px]">
      <div className="panel animate-rise absolute left-1/2 top-24 w-[40rem] -translate-x-1/2 overflow-hidden shadow-2xl" role="dialog" aria-label="Command palette">
        <div className="flex items-center gap-3 border-b border-line px-4 py-3">
          <Command className="size-4 text-cyan" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") { e.preventDefault(); setIdx((i) => Math.min(filtered.length - 1, i + 1)); }
              if (e.key === "ArrowUp") { e.preventDefault(); setIdx((i) => Math.max(0, i - 1)); }
              if (e.key === "Enter") run(idx);
              if (e.key === "Escape") closeOverlays();
            }}
            placeholder="Type a command, app, file… or a question for P"
            aria-label="Command palette search"
            className="flex-1 bg-transparent text-[15px] outline-none placeholder:text-text-3"
          />
          <Kbd>Esc</Kbd>
        </div>
        <ul className="scroll-thin max-h-80 overflow-y-auto p-1.5" role="listbox">
          {filtered.map((it, i) => (
            <li key={it.id} role="option" aria-selected={i === idx}>
              <button type="button" onMouseEnter={() => setIdx(i)} onClick={() => run(i)} className={cn("flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left", i === idx ? "bg-electric/20" : "hover:bg-surface/40")}>
                {it.icon}
                <span className="text-sm text-text">{it.label}</span>
                <span className="ml-auto truncate text-xs text-text-3">{it.hint}</span>
              </button>
            </li>
          ))}
          {q.trim() && (
            <li>
              <button type="button" onClick={askP} className="mt-1 flex w-full items-center gap-3 rounded-lg border border-line px-3 py-2 text-left hover:border-cyan/50">
                <PMark size={22} />
                <span className="text-sm text-text">Ask P: “{q}”</span>
                <ArrowRight className="ml-auto size-4 text-cyan" />
              </button>
            </li>
          )}
        </ul>
      </div>
    </Backdrop>
  );
}

/* ----------------------- Floating assistant panel -------------------- */
function AssistantFloat() {
  const open = useOpenApp();
  return (
    <aside
      aria-label="P assistant"
      className="panel animate-rise absolute bottom-28 right-4 top-12 z-40 flex w-[27rem] flex-col overflow-hidden shadow-2xl"
    >
      <header className="flex items-center gap-3 border-b border-line px-3 py-2.5">
        <PAvatar size={38} state={useDesktop((s) => s.assistantState)} />
        <div className="min-w-0">
          <h2 className="font-display text-sm font-semibold leading-tight">P — Personal AI</h2>
          <StateBadge />
        </div>
        <div className="ml-auto flex gap-1">
          <Button size="icon-sm" variant="quiet" aria-label="Open full assistant" onClick={() => { setDesktop({ assistantOpen: false }); open("assistant"); }}>
            <Maximize2 />
          </Button>
          <Button size="icon-sm" variant="quiet" aria-label="Close assistant" onClick={() => setDesktop({ assistantOpen: false })}>
            <X />
          </Button>
        </div>
      </header>
      <Transcript className="min-h-0 flex-1" />
      <Composer autoFocus />
    </aside>
  );
}

/* ------------------------------ Toast ------------------------------- */
function ToastHost() {
  const t = useDesktop((s) => s.toast);
  if (!t) return null;
  return (
    <div role="status" key={t.id} className="animate-rise pointer-events-none absolute bottom-28 left-1/2 z-[60] -translate-x-1/2">
      <div
        className={cn(
          "panel flex max-w-xl items-center gap-2.5 px-4 py-2.5 text-sm shadow-2xl",
          t.tone === "success" && "!border-success/50",
          t.tone === "warning" && "!border-warning/50",
          t.tone === "error" && "!border-danger/50",
        )}
      >
        {t.tone === "success" ? <Check className="size-4 text-success" /> : <Bot className="size-4 text-cyan" />}
        <span className="text-text">{t.text}</span>
      </div>
    </div>
  );
}

export function Overlays() {
  const launcher = useDesktop((x) => x.launcherOpen);
  const notif = useDesktop((x) => x.notifOpen);
  const quick = useDesktop((x) => x.quickOpen);
  const palette = useDesktop((x) => x.paletteOpen);
  const assistant = useDesktop((x) => x.assistantOpen);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        closeOverlays(desktopStore.get().paletteOpen ? undefined : "paletteOpen");
      }
      if (e.key === "Escape") closeOverlays();
      if (e.altKey && e.key.toLowerCase() === "p") {
        e.preventDefault();
        setDesktop({ assistantOpen: !desktopStore.get().assistantOpen });
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  return (
    <>
      {assistant && <AssistantFloat />}
      {launcher && <Launcher />}
      {notif && <NotificationCenter />}
      {quick && <QuickSettings />}
      {palette && <CommandPalette />}
      <ToastHost />
    </>
  );
}
