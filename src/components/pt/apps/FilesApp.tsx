import { useMemo, useState } from "react";
import { ArrowLeft, ArrowUp, Info, LayoutGrid, List, Search } from "lucide-react";
import { FileIcon, FolderIcon } from "@/components/pt/ui/FolderIcon";
import { EmptyState } from "@/components/pt/ui/bits";
import { Button } from "@/components/ui/button";
import { usePolled } from "@/lib/pt/integration";
import { formatBytes, timeAgo } from "@/lib/pt/format";
import { DEMO_HOME } from "@/lib/pt/demo/data";
import { setDesktop, toast } from "@/lib/pt/store";
import { sendMessage } from "@/lib/pt/assistant";
import type { FsEntry } from "@/lib/pt/types";
import { cn } from "@/lib/utils";
import { useOpenApp } from "@/lib/pt/apps";

export function FilesApp({ onSource }: { onSource?: (s: string) => void }) {
  const [path, setPath] = useState(DEMO_HOME);
  const [hist, setHist] = useState<string[]>([]);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [sel, setSel] = useState<FsEntry | null>(null);
  const [q, setQ] = useState("");
  const [details, setDetails] = useState(true);
  const open = useOpenApp();
  const places = usePolled((i) => i.files.places());
  const listing = usePolled((i) => i.files.list(path), 0, [path]);

  const go = (p: string) => {
    setHist((h) => [...h, path]);
    setPath(p);
    setSel(null);
    setQ("");
  };
  const entries = useMemo(
    () => (listing.result?.data ?? []).filter((e) => e.name.toLowerCase().includes(q.toLowerCase())),
    [listing.result, q],
  );
  const crumbs = path === "/" ? [""] : path.split("/");
  const activate = (e: FsEntry) => {
    if (e.kind === "folder") return go(e.path);
    if (["md", "txt", "sh", "ts", "log"].includes(e.ext ?? "")) return open("editor", { search: { file: e.path } });
    toast(`${e.name}: no preview in the prototype`, "info");
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-2 border-b border-line bg-deep/40 px-3 py-2">
        <Button size="icon-sm" variant="hud" aria-label="Back" disabled={!hist.length} onClick={() => { const h = [...hist]; const p = h.pop()!; setHist(h); setPath(p); setSel(null); }}><ArrowLeft /></Button>
        <Button size="icon-sm" variant="hud" aria-label="Up one folder" disabled={path === "/"} onClick={() => go(path.split("/").slice(0, -1).join("/") || "/")}><ArrowUp /></Button>
        <nav aria-label="Path" className="input-surface flex min-w-0 flex-1 items-center gap-1 px-2.5 py-1 text-xs">
          {crumbs.map((c, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <span className="text-text-3">/</span>}
              <button type="button" className="rounded px-1 text-text-2 hover:bg-surface hover:text-text" onClick={() => go(crumbs.slice(0, i + 1).join("/") || "/")}>{c || "File System"}</button>
            </span>
          ))}
        </nav>
        <div className="input-surface flex w-56 items-center gap-2 px-2 py-1">
          <Search className="size-3.5 text-text-3" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter" aria-label="Filter files" className="w-full bg-transparent text-xs outline-none placeholder:text-text-3" />
        </div>
        <Button size="icon-sm" variant={view === "grid" ? "hud-active" : "hud"} aria-label="Icon view" onClick={() => setView("grid")}><LayoutGrid /></Button>
        <Button size="icon-sm" variant={view === "list" ? "hud-active" : "hud"} aria-label="List view" onClick={() => setView("list")}><List /></Button>
        <Button size="icon-sm" variant={details ? "hud-active" : "hud"} aria-label="Toggle details pane" onClick={() => setDetails((d) => !d)}><Info /></Button>
      </div>

      <div className="flex min-h-0 flex-1">
        <nav aria-label="Places" className="scroll-thin w-52 shrink-0 overflow-y-auto border-r border-line bg-deep/30 p-2">
          {(["places", "devices", "network"] as const).map((sec) => (
            <div key={sec} className="mb-3">
              <h4 className="hud-label mb-1 px-2 capitalize">{sec}</h4>
              {(places.result?.data ?? []).filter((p) => p.section === sec).map((p) => (
                <button key={p.id} type="button" onClick={() => p.path.startsWith("network:") ? toast("Network browsing needs the native bridge.", "info") : go(p.path)}
                  className={cn("flex w-full items-center gap-2.5 rounded-md px-2 py-1 text-left text-[13px]", path === p.path ? "bg-electric/20 text-text" : "text-text-2 hover:bg-surface/50")}>
                  <FolderIcon glyph={p.glyph} size={22} />
                  {p.label}
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="scroll-thin min-w-0 flex-1 overflow-auto p-3" onClick={() => setSel(null)}>
          {listing.result?.source === "unavailable" ? (
            <EmptyState kind="unavailable" title="Files need the native bridge" body={listing.result.error} />
          ) : entries.length === 0 ? (
            <EmptyState title="This folder is empty" body={q ? `Nothing matches "${q}".` : "Sample folder with no items."} />
          ) : view === "grid" ? (
            <ul className="grid grid-cols-[repeat(auto-fill,minmax(7.5rem,1fr))] gap-2">
              {entries.map((e) => (
                <li key={e.path}>
                  <button type="button" onClick={(ev) => { ev.stopPropagation(); setSel(e); }} onDoubleClick={() => activate(e)} onKeyDown={(ev) => ev.key === "Enter" && activate(e)}
                    className={cn("flex w-full flex-col items-center gap-1.5 rounded-lg border border-transparent p-2.5 text-center", sel?.path === e.path ? "selected-ring bg-electric/15" : "hover:bg-surface/40")}>
                    {e.kind === "folder" ? <FolderIcon glyph={e.glyph} size={60} /> : <FileIcon ext={e.ext} size={60} />}
                    <span className="line-clamp-2 break-all text-xs text-text">{e.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="text-text-3"><tr>{["Name", "Size", "Modified", "Permissions"].map((h) => <th key={h} className="px-2 py-1 font-display text-[10px] uppercase tracking-wider">{h}</th>)}</tr></thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.path} onClick={(ev) => { ev.stopPropagation(); setSel(e); }} onDoubleClick={() => activate(e)} className={cn("cursor-default border-t border-line/40", sel?.path === e.path ? "bg-electric/20" : "hover:bg-surface/30")}>
                    <td className="flex items-center gap-2 px-2 py-1">{e.kind === "folder" ? <FolderIcon glyph={e.glyph} size={20} /> : <FileIcon ext="" size={20} />}<span className="text-text">{e.name}</span></td>
                    <td className="px-2 text-text-2">{e.kind === "folder" ? `${e.items} items` : formatBytes(e.sizeBytes ?? 0)}</td>
                    <td className="px-2 text-text-2">{timeAgo(e.modified)}</td>
                    <td className="px-2 font-mono text-text-3">{e.permissions}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {details && (
          <aside aria-label="Details" className="w-60 shrink-0 border-l border-line bg-deep/30 p-4">
            {sel ? (
              <div className="flex h-full flex-col">
                <div className="mb-3 flex justify-center">{sel.kind === "folder" ? <FolderIcon glyph={sel.glyph} size={84} /> : <FileIcon ext={sel.ext} size={84} />}</div>
                <h3 className="break-all text-center font-display text-sm font-semibold">{sel.name}</h3>
                <dl className="mt-4 space-y-1.5 text-xs">
                  {([
                    ["Type", sel.kind === "folder" ? "Folder" : `${(sel.ext || "file").toUpperCase()} file`],
                    ["Size", sel.kind === "folder" ? `${sel.items} items` : formatBytes(sel.sizeBytes ?? 0)],
                    ["Modified", timeAgo(sel.modified)],
                    ["Owner", `${sel.owner}:${sel.group}`],
                    ["Permissions", sel.permissions],
                  ] as const).map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-2"><dt className="text-text-3">{k}</dt><dd className="truncate font-mono text-text-2">{v}</dd></div>
                  ))}
                </dl>
                <div className="mt-auto space-y-1.5">
                  <Button size="sm" variant="hud" className="w-full" onClick={() => activate(sel)}>Open</Button>
                  <Button size="sm" variant="hud" className="w-full" onClick={() => { setDesktop({ assistantOpen: true }); void sendMessage(`Summarise ${sel.path}`); }}>Ask P about this</Button>
                  <Button size="sm" variant="danger" className="w-full" onClick={() => { setDesktop({ assistantOpen: true }); void sendMessage(`Delete ${sel.name}`); }}>Delete…</Button>
                </div>
              </div>
            ) : (
              <EmptyState title="Select an item" body="Details and actions appear here." />
            )}
          </aside>
        )}
      </div>
      <footer className="flex h-7 items-center gap-4 border-t border-line bg-deep/50 px-3 text-[11px] text-text-3">
        <span>{entries.length} items</span>
        {sel && <span className="truncate text-text-2">{sel.path}</span>}
        <span className="ml-auto">Deleting always asks for your approval</span>
      </footer>
    </div>
  );
}
