import { useMemo, useState } from "react";
import { Check, CircleDot, Plus, Search } from "lucide-react";
import { AppGlyph } from "@/components/pt/ui/AppGlyph";
import { EmptyState, Meter, Panel, SourceBadge, Toggle } from "@/components/pt/ui/bits";
import { CATEGORY_LABEL } from "@/components/pt/shell/Overlays";
import { WALLPAPERS } from "@/components/pt/shell/Wallpaper";
import { Button } from "@/components/ui/button";
import { useOpenApp } from "@/lib/pt/apps";
import { ASSISTANT_PROVIDERS, DEMO_PROVIDER, usePolled } from "@/lib/pt/integration";
import { getIntegration } from "@/lib/pt/integration";
import { PROJECTS } from "@/lib/pt/demo/data";
import { desktopStore, setDesktop, toast, useDesktop, type AccentId } from "@/lib/pt/store";
import { uid } from "@/lib/pt/format";
import type { AppCategory } from "@/lib/pt/types";
import { cn } from "@/lib/utils";

/* ------------------------------ Applications ------------------------------ */
export function ApplicationsApp() {
  const open = useOpenApp();
  const { result } = usePolled((i) => i.launcher.listApps());
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<AppCategory | "all">("all");
  const apps = result?.data ?? [];
  const cats = useMemo(() => [...new Set(apps.map((a) => a.category))], [apps]);
  const list = apps.filter((a) => (cat === "all" || a.category === cat) && (a.name + a.description).toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-3 border-b border-line p-3">
        <div className="input-surface flex w-80 items-center gap-2 px-2.5 py-1.5"><Search className="size-4 text-text-3" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search applications" aria-label="Search applications" className="w-full bg-transparent text-sm outline-none" /></div>
        <div className="flex flex-wrap gap-1.5">
          {(["all", ...cats] as const).map((c) => (
            <button key={c} type="button" onClick={() => setCat(c)} className={cn("rounded-full border px-3 py-1 text-xs", cat === c ? "border-cyan/60 bg-electric/20 text-text" : "border-line text-text-2 hover:border-line-strong")}>{c === "all" ? "All" : CATEGORY_LABEL[c]}</button>
          ))}
        </div>
        <SourceBadge source={result?.source} className="ml-auto" />
      </div>
      <div className="scroll-thin min-h-0 flex-1 overflow-y-auto p-4">
        {list.length === 0 ? <EmptyState title="No applications found" /> : (
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] gap-3">
            {list.map((a) => (
              <li key={a.id}>
                <button type="button" className="panel flex w-full items-center gap-3 p-3 text-left transition-colors hover:!border-cyan/50"
                  onClick={async () => {
                    if (a.launch.kind === "internal") return open(a.launch.appId);
                    const r = await getIntegration(desktopStore.get().mode).launcher.launchNative(a.launch.desktopFile);
                    toast(r.message, "info");
                  }}>
                  <AppGlyph icon={a.icon} size="lg" />
                  <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-text">{a.name}</span><span className="block truncate text-xs text-text-3">{a.description}</span>
                    <span className="mt-1 block text-[10px] text-text-3">{a.installed === "unknown" ? "Install status unknown" : "Included"}</span></span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/* -------------------------------- Workspaces ------------------------------- */
export function WorkspacesApp() {
  const [projects, setProjects] = useState(PROJECTS);
  const [active, setActive] = useState(PROJECTS[0]?.id ?? "");
  const [text, setText] = useState("");
  const cur = projects.find((p) => p.id === active) ?? projects[0]!;
  const progress = (p: typeof cur) => Math.round((p.tasks.filter((t) => t.done).length / Math.max(1, p.tasks.length)) * 100);
  const toggle = (id: string) => setProjects((ps) => ps.map((p) => (p.id === active ? { ...p, tasks: p.tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)) } : p)));
  const add = () => { if (!text.trim()) return; setProjects((ps) => ps.map((p) => (p.id === active ? { ...p, tasks: [...p.tasks, { id: uid("t"), text, done: false }] } : p))); setText(""); };
  return (
    <div className="grid h-full min-h-0 grid-cols-[20rem_1fr] gap-3 p-3">
      <Panel title="Projects" source="sample" bodyClassName="p-2 space-y-1.5">
        {projects.map((p) => (
          <button key={p.id} type="button" onClick={() => setActive(p.id)} className={cn("w-full rounded-lg border p-3 text-left", active === p.id ? "selected-ring bg-electric/10" : "border-line hover:border-line-strong")}>
            <div className="flex items-center justify-between"><span className="font-display text-sm font-semibold">{p.name}</span><span className="text-[10px] uppercase text-text-3">{p.status}</span></div>
            <p className="mb-2 text-xs text-text-3">{p.description}</p>
            <Meter value={progress(p)} tone="cyan" />
          </button>
        ))}
      </Panel>
      <Panel title={cur.name} source="sample" bodyClassName="p-5 overflow-auto scroll-thin">
        <p className="mb-4 text-sm text-text-2">{cur.description}</p>
        <h4 className="hud-label mb-2">Tasks · {progress(cur)}% done</h4>
        <ul className="space-y-1.5">
          {cur.tasks.map((t) => (
            <li key={t.id}>
              <button type="button" onClick={() => toggle(t.id)} className="flex w-full items-center gap-3 rounded-lg border border-line bg-elevated/30 px-3 py-2 text-left hover:border-line-strong">
                <span className={cn("grid size-4 place-items-center rounded border", t.done ? "border-cyan bg-electric" : "border-line-strong")}>{t.done && <Check className="size-3" />}</span>
                <span className={cn("text-sm", t.done && "text-text-3 line-through")}>{t.text}</span>
              </button>
            </li>
          ))}
        </ul>
        <div className="input-surface mt-3 flex items-center gap-2 px-2.5 py-1.5">
          <Plus className="size-4 text-text-3" />
          <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} placeholder="Add a task" aria-label="Add a task" className="w-full bg-transparent text-sm outline-none" />
        </div>
      </Panel>
    </div>
  );
}

/* --------------------------------- Settings -------------------------------- */
const ACCENTS: { id: AccentId; label: string; css: string }[] = [
  { id: "electric", label: "Electric Blue", css: "oklch(0.598 0.21 256.8)" },
  { id: "cyan", label: "Cyan", css: "oklch(0.683 0.168 244)" },
  { id: "ice", label: "Ice", css: "oklch(0.88 0.07 225)" },
  { id: "violet", label: "Violet", css: "oklch(0.661 0.189 285.5)" },
  { id: "emerald", label: "Emerald", css: "oklch(0.777 0.16 166.6)" },
];

const Row = ({ label, hint, children }: { label: string; hint?: string | undefined; children: React.ReactNode }) => (
  <div className="flex items-center justify-between gap-6 border-b border-line/50 py-3 last:border-0">
    <div><p className="text-sm text-text">{label}</p>{hint && <p className="mt-0.5 max-w-md text-xs text-text-3">{hint}</p>}</div>
    {children}
  </div>
);

export function SettingsApp() {
  const s = useDesktop((x) => x);
  const [tab, setTab] = useState<"appearance" | "assistant" | "privacy" | "system" | "about">("appearance");
  const [models, setModels] = useState<{ available: boolean; label: string; detail: string; models?: string[] } | null>(null);
  const [checking, setChecking] = useState(false);
  const provider = ASSISTANT_PROVIDERS[s.assistantProvider] ?? DEMO_PROVIDER;
  const check = async () => { setChecking(true); setModels(await provider.status()); setChecking(false); };
  const tabs = [["appearance", "Appearance"], ["assistant", "P Assistant"], ["privacy", "Privacy & approvals"], ["system", "System"], ["about", "About"]] as const;

  return (
    <div className="grid h-full min-h-0 grid-cols-[14rem_1fr]">
      <nav className="border-r border-line bg-deep/40 p-2" aria-label="Settings sections">
        {tabs.map(([id, l]) => <button key={id} type="button" onClick={() => setTab(id)} className={cn("mb-0.5 w-full rounded-md px-3 py-2 text-left text-sm", tab === id ? "bg-electric/20 text-text" : "text-text-2 hover:bg-surface/40")}>{l}</button>)}
      </nav>
      <div className="scroll-thin overflow-y-auto p-6">
        <div className="mx-auto max-w-2xl">
          {tab === "appearance" && (
            <>
              <h2 className="mb-2 font-display text-lg font-semibold">Appearance</h2>
              <Row label="Accent colour">
                <div className="flex gap-2">{ACCENTS.map((a) => <button key={a.id} type="button" aria-label={a.label} aria-pressed={s.accent === a.id} title={a.label} onClick={() => setDesktop({ accent: a.id })} className={cn("size-7 rounded-full border-2", s.accent === a.id ? "border-text" : "border-transparent")} style={{ background: a.css }} />)}</div>
              </Row>
              <Row label="Wallpaper">
                <div className="flex gap-3">{(Object.keys(WALLPAPERS) as (keyof typeof WALLPAPERS)[]).map((k) => (
                  <button key={k} type="button" aria-pressed={s.wallpaper === k} onClick={() => setDesktop({ wallpaper: k })} className={cn("w-32 overflow-hidden rounded-lg border-2 text-left", s.wallpaper === k ? "border-cyan" : "border-line")}>
                    <img src={WALLPAPERS[k].src} alt="" className="h-16 w-full object-cover" /><span className="block px-2 py-1 text-[11px] text-text-2">{WALLPAPERS[k].label}</span>
                  </button>))}</div>
              </Row>
              <Row label="Reduce motion" hint="Stops animations, including P's moving avatar."><Toggle label="Reduce motion" checked={s.reduceMotion} onChange={(reduceMotion) => setDesktop({ reduceMotion })} /></Row>
            </>
          )}
          {tab === "assistant" && (
            <>
              <h2 className="mb-2 font-display text-lg font-semibold">P Assistant</h2>
              <Row label="Engine" hint="Demo uses built-in sample answers. Local model talks to a model service on this computer.">
                <select value={s.assistantProvider} onChange={(e) => { setDesktop({ assistantProvider: e.target.value }); setModels(null); }} aria-label="Assistant engine" className="input-surface px-3 py-1.5 text-sm">
                  {Object.values(ASSISTANT_PROVIDERS).map((p) => <option key={p.id} value={p.id} className="bg-panel">{p.label}</option>)}
                </select>
              </Row>
              <Row label="Model status" hint={models?.detail ?? "Check whether a model is available."}>
                <Button size="sm" variant="hud" onClick={check} disabled={checking}>{checking ? "Checking…" : models ? models.label : "Check"}</Button>
              </Row>
              {models?.models && models.models.length > 0 && (
                <Row label="Model"><select value={s.assistantModel} onChange={(e) => setDesktop({ assistantModel: e.target.value })} aria-label="Model" className="input-surface px-3 py-1.5 text-sm"><option value="" className="bg-panel">Choose…</option>{models.models.map((m) => <option key={m} className="bg-panel">{m}</option>)}</select></Row>
              )}
              <Row label="P speaks replies" hint="Uses your browser's voice. P's lips move while she speaks."><Toggle label="Voice replies" checked={s.voiceEnabled} onChange={(voiceEnabled) => setDesktop({ voiceEnabled })} /></Row>
            </>
          )}
          {tab === "privacy" && (
            <>
              <h2 className="mb-2 font-display text-lg font-semibold">Privacy & approvals</h2>
              <Row label="Chat history" hint="Conversations stay in memory only and disappear when you close this tab."><CircleDot className="size-4 text-success" /></Row>
              <Row label="Data leaves this machine" hint="Only if you choose a remote engine. Demo and local engines never send messages away."><span className="text-sm text-success">{provider.sendsDataOffDevice ? "Yes" : "No"}</span></Row>
              <Row label="Always asked first" hint="Opening apps, deleting, installing, firewall, security tools, elevated commands, sending data out, and boot/login changes."><Check className="size-4 text-cyan" /></Row>
            </>
          )}
          {tab === "system" && (
            <>
              <h2 className="mb-2 font-display text-lg font-semibold">System</h2>
              <Row label="Data source" hint="Demo shows clearly labelled sample data. Native reads from the Pandatechs bridge on this computer.">
                <div className="flex gap-1.5">{(["demo", "native"] as const).map((m) => <Button key={m} size="sm" variant={s.mode === m ? "hud-active" : "hud"} onClick={() => { setDesktop({ mode: m }); toast(m === "native" ? "Native mode: bridge not connected yet, panels show 'Not connected'." : "Demo mode: sample data.", "info"); }}>{m === "demo" ? "Demo" : "Native"}</Button>)}</div>
              </Row>
              <Row label="Reset preferences"><Button size="sm" variant="danger" onClick={() => { localStorage.removeItem("pandatechs.desktop.v2"); localStorage.removeItem("pandatechs.notes.v1"); location.reload(); }}>Reset</Button></Row>
            </>
          )}
          {tab === "about" && (
            <>
              <h2 className="mb-2 font-display text-lg font-semibold">About</h2>
              <div className="panel p-5 text-sm text-text-2"><p className="font-display text-base text-text">Pandatechs Desktop</p><p>by Pandatechs Enterprises</p><p className="mt-3 text-xs text-text-3">Prototype build · Built for professionals. Designed for excellence.</p></div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
