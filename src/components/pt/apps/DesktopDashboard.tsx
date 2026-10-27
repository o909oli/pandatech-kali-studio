import { useState } from "react";
import { ChevronRight, ChevronsLeft, ChevronsRight, Send, Star } from "lucide-react";
import { AppGlyph } from "@/components/pt/ui/AppGlyph";
import { FolderIcon } from "@/components/pt/ui/FolderIcon";
import { PAvatar, Wordmark } from "@/components/pt/ui/Brand";
import { CATEGORY_LABEL } from "@/components/pt/shell/Overlays";
import { TerminalSession } from "@/components/pt/apps/TerminalView";
import {
  ConnectionsWidget, MonitorWidget, NetworkWidget, OpenWindowsWidget, RecentFilesWidget,
} from "@/components/pt/widgets/Widgets";
import { Panel, SourceBadge } from "@/components/pt/ui/bits";
import { useOpenApp } from "@/lib/pt/apps";
import { usePolled } from "@/lib/pt/integration";
import { sendMessage } from "@/lib/pt/assistant";
import { setDesktop, toast, useDesktop } from "@/lib/pt/store";
import type { AppCategory } from "@/lib/pt/types";
import { cn } from "@/lib/utils";
import { Terminal as TermIcon } from "lucide-react";

const SIDEBAR_CATS: AppCategory[] = [
  "favorites", "information-gathering", "vulnerability-analysis", "web-application", "exploitation",
  "post-exploitation", "password-auditing", "wireless", "forensics", "reverse-engineering", "reporting", "system",
];

function CategorySidebar() {
  const open = useOpenApp();
  const collapsed = useDesktop((s) => s.sidebarCollapsed);
  const { result } = usePolled((i) => i.launcher.listApps());
  const [cat, setCat] = useState<AppCategory | null>("favorites");
  const apps = result?.data ?? [];
  const list = cat ? apps.filter((a) => (cat === "favorites" ? a.favorite : a.category === cat)) : [];

  return (
    <aside className={cn("panel flex shrink-0 flex-col overflow-hidden transition-[width] duration-200", collapsed ? "w-14" : "w-56")} aria-label="Application categories">
      <div className="flex h-9 items-center justify-between border-b border-line px-3">
        {!collapsed && <span className="hud-label !text-text-2">Applications</span>}
        <button type="button" aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} className="text-text-3 hover:text-text" onClick={() => setDesktop({ sidebarCollapsed: !collapsed })}>
          {collapsed ? <ChevronsRight className="size-4" /> : <ChevronsLeft className="size-4" />}
        </button>
      </div>
      <ul className="scroll-thin min-h-0 flex-1 overflow-y-auto p-1.5">
        {SIDEBAR_CATS.map((c) => (
          <li key={c}>
            <button
              type="button"
              onClick={() => setCat(cat === c ? null : c)}
              aria-expanded={cat === c}
              title={CATEGORY_LABEL[c]}
              className={cn("flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12.5px] transition-colors", cat === c ? "bg-electric/20 text-text" : "text-text-2 hover:bg-surface/50 hover:text-text")}
            >
              {c === "favorites" ? <Star className="size-4 shrink-0 text-warning" /> : <span className="grid size-4 shrink-0 place-items-center font-display text-[10px] font-bold text-cyan">{CATEGORY_LABEL[c][0]}</span>}
              {!collapsed && (
                <>
                  <span className="flex-1 truncate">{CATEGORY_LABEL[c]}</span>
                  <ChevronRight className={cn("size-3.5 text-text-3 transition-transform", cat === c && "rotate-90")} />
                </>
              )}
            </button>
            {cat === c && !collapsed && (
              <ul className="mb-1 ml-3 border-l border-line pl-1.5">
                {list.length === 0 && <li className="px-2 py-1 text-[11px] text-text-3">No apps listed</li>}
                {list.map((a) => (
                  <li key={a.id}>
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 rounded px-2 py-1 text-left text-[12px] text-text-2 hover:bg-surface/50 hover:text-text"
                      onClick={() => (a.launch.kind === "internal" ? open(a.launch.appId) : toast(`${a.name} needs the native bridge to launch.`, "info"))}
                    >
                      <span className="truncate">{a.name}</span>
                      {a.installed === "unknown" && <span className="ml-auto size-1.5 rounded-full bg-text-3/50" title="Not verified" />}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
      <div className="flex items-center gap-2 border-t border-line p-2">
        <SourceBadge source={result?.source} />
      </div>
    </aside>
  );
}

const SHORTCUTS = [
  { id: "files", label: "Home", folder: "home" as const },
  { id: "files", label: "Files", folder: "generic" as const },
  { id: "terminal", label: "Terminal", icon: "terminal" },
  { id: "browser", label: "Browser", icon: "globe" },
  { id: "editor", label: "Editor", icon: "code" },
  { id: "workspaces", label: "Workspace", folder: "workspace" as const },
];

function AskP() {
  const [q, setQ] = useState("");
  const state = useDesktop((s) => s.assistantState);
  const go = () => {
    if (!q.trim()) return;
    setDesktop({ assistantOpen: true });
    void sendMessage(q);
    setQ("");
  };
  return (
    <div className="panel flex items-center gap-3 px-3 py-2">
      <PAvatar size={40} state={state} />
      <div className="min-w-0">
        <p className="font-display text-[13px] font-semibold text-text">Good to see you, panda</p>
        <p className="text-[11px] text-text-3">Ask P anything about your system</p>
      </div>
      <div className="input-surface ml-2 flex flex-1 items-center gap-2 px-2.5 py-1.5">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && go()}
          placeholder="e.g. How is my system doing?"
          aria-label="Ask P"
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-text-3"
        />
        <button type="button" aria-label="Send to P" onClick={go} className="text-cyan hover:text-ice">
          <Send className="size-4" />
        </button>
      </div>
    </div>
  );
}

export function DesktopDashboard() {
  const open = useOpenApp();
  return (
    <div className="absolute inset-0 flex gap-3 px-3 pb-[7.25rem] pt-3">
      <CategorySidebar />

      {/* centre: shortcuts over the wallpaper, P bar at the bottom */}
      <div className="flex min-w-0 flex-1 flex-col">
        <ul className="flex flex-wrap items-start gap-1">
          {SHORTCUTS.map((s) => (
            <li key={s.label}>
              <button type="button" onClick={() => open(s.id)} className="group flex w-[5.5rem] flex-col items-center gap-1.5 rounded-lg p-2 transition-colors hover:bg-deep/50 focus-visible:bg-deep/50">
                {s.folder ? <FolderIcon glyph={s.folder} size={52} /> : <AppGlyph icon={s.icon!} size="xl" />}
                <span className="rounded bg-deep/60 px-1.5 text-[12px] font-medium text-text [text-shadow:0_1px_6px_black]">{s.label}</span>
              </button>
            </li>
          ))}
        </ul>
        <div className="mt-auto space-y-2.5">
          <Wordmark className="h-9 opacity-90" />
          <AskP />
        </div>
      </div>

      {/* right: widget grid */}
      <div className="grid w-[44rem] shrink-0 grid-cols-2 grid-rows-[1fr_1.15fr_1fr_1fr] gap-3">
        <Panel title="Terminal" icon={<TermIcon />} source="sample" className="col-span-2" bodyClassName="flex">
          <TerminalSession compact fontSize={12} className="flex-1" />
        </Panel>
        <MonitorWidget />
        <NetworkWidget />
        <RecentFilesWidget />
        <OpenWindowsWidget />
        <ConnectionsWidget className="col-span-2" />
      </div>
    </div>
  );
}
