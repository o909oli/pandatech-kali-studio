import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { uid } from "@/lib/pt/format";
import { cn } from "@/lib/utils";

interface Note { id: string; title: string; body: string; updated: number }
const KEY = "pandatechs.notes.v1";
const SEED: Note[] = [
  { id: "n1", title: "Welcome to Notes", updated: Date.now(), body: "# Welcome\n\nNotes support **Markdown**.\n\n- Write on the left\n- Preview on the right\n\n> Notes are stored in this browser for the prototype." },
  { id: "n2", title: "Ideas", updated: Date.now() - 3600_000, body: "## Ideas\n\n1. Panda wallpaper pack\n2. Weekly review template\n" },
];

export function NotesApp() {
  const [notes, setNotes] = useState<Note[]>(SEED);
  const [active, setActive] = useState("n1");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) { const n = JSON.parse(raw) as Note[]; if (n[0]) { setNotes(n); setActive(n[0].id); } }
    } catch { /* ignore */ }
    setLoaded(true);
  }, []);
  useEffect(() => { if (loaded) localStorage.setItem(KEY, JSON.stringify(notes)); }, [notes, loaded]);

  const cur = notes.find((n) => n.id === active) ?? notes[0] ?? SEED[0]!;
  const update = (patch: Partial<Note>) => setNotes((ns) => ns.map((n) => (n.id === cur.id ? { ...n, ...patch, updated: Date.now() } : n)));
  const add = () => { const n = { id: uid("note"), title: "Untitled", body: "# Untitled\n", updated: Date.now() }; setNotes([n, ...notes]); setActive(n.id); };
  const del = () => { const rest = notes.filter((n) => n.id !== cur.id); setNotes(rest.length ? rest : SEED.slice(0, 1)); setActive((rest[0] ?? SEED[0]!).id); };

  if (!cur) return null;
  return (
    <div className="flex h-full min-h-0">
      <aside className="flex w-60 shrink-0 flex-col border-r border-line bg-deep/40">
        <div className="flex items-center justify-between p-3"><h4 className="hud-label">Notes</h4><Button size="icon-sm" variant="hud" aria-label="New note" onClick={add}><Plus /></Button></div>
        <ul className="scroll-thin flex-1 overflow-y-auto px-1.5">
          {notes.map((n) => (
            <li key={n.id}>
              <button type="button" onClick={() => setActive(n.id)} className={cn("w-full rounded-md px-2.5 py-2 text-left", cur.id === n.id ? "bg-electric/20" : "hover:bg-surface/40")}>
                <span className="block truncate text-[13px] font-medium text-text">{n.title || "Untitled"}</span>
                <span className="block truncate text-[11px] text-text-3">{n.body.replace(/[#>*\-]/g, "").trim().slice(0, 48)}</span>
              </button>
            </li>
          ))}
        </ul>
      </aside>
      <div className="grid min-w-0 flex-1 grid-cols-2">
        <div className="flex min-h-0 flex-col border-r border-line">
          <div className="flex items-center gap-2 border-b border-line p-2">
            <input value={cur.title} onChange={(e) => update({ title: e.target.value })} aria-label="Note title" className="flex-1 bg-transparent px-2 font-display text-sm font-semibold outline-none" />
            <Button size="icon-sm" variant="quiet" aria-label="Delete note" onClick={del}><Trash2 /></Button>
          </div>
          <textarea value={cur.body} onChange={(e) => update({ body: e.target.value })} aria-label="Note body" spellCheck className="scroll-thin min-h-0 flex-1 resize-none bg-transparent p-4 font-mono text-[13px] leading-6 outline-none" />
        </div>
        <div className="scroll-thin overflow-y-auto p-5"><div className="pt-prose"><ReactMarkdown remarkPlugins={[remarkGfm]}>{cur.body}</ReactMarkdown></div></div>
      </div>
    </div>
  );
}
