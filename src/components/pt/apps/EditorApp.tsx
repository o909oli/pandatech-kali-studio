import { useEffect, useMemo, useRef, useState } from "react";
import { Bot, FileCode2, FileText, GitBranch, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { highlight } from "@/lib/pt/highlight";
import { FILE_CONTENT, SAMPLE_CODE } from "@/lib/pt/demo/data";
import { setDesktop, toast } from "@/lib/pt/store";
import { sendMessage } from "@/lib/pt/assistant";
import { TerminalSession } from "@/components/pt/apps/TerminalView";
import { cn } from "@/lib/utils";

const FILES: Record<string, string> = {
  "/home/panda/Workspace/dashboard.ts": SAMPLE_CODE,
  ...FILE_CONTENT,
};
const TREE = Object.keys(FILES);
const FIRST = TREE[0] ?? "/home/panda/Workspace/dashboard.ts";

export function EditorApp({ initial }: { initial?: string | undefined }) {
  const [tabs, setTabs] = useState<string[]>([initial && FILES[initial] !== undefined ? initial : FIRST]);
  const [active, setActive] = useState<string>(tabs[0] ?? FIRST);
  const [buffers, setBuffers] = useState<Record<string, string>>(FILES);
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const [find, setFind] = useState("");
  const [panel, setPanel] = useState<"terminal" | "problems" | null>(null);
  const pre = useRef<HTMLPreElement>(null);
  const text = buffers[active] ?? "";
  const html = useMemo(() => highlight(text) + "\n", [text]);
  const matches = find ? text.split(find).length - 1 : 0;

  useEffect(() => {
    if (initial && FILES[initial] !== undefined) {
      setTabs((t) => (t.includes(initial) ? t : [...t, initial]));
      setActive(initial);
    }
  }, [initial]);

  const name = (p: string) => p.split("/").pop() ?? p;
  const close = (p: string) => {
    const rest = tabs.filter((t) => t !== p);
    setTabs(rest.length ? rest : [FIRST]);
    if (active === p) setActive(rest[0] ?? FIRST);
  };

  return (
    <div className="flex h-full min-h-0">
      <aside className="flex w-56 shrink-0 flex-col border-r border-line bg-deep/40">
        <h4 className="hud-label px-3 py-2.5">Explorer</h4>
        <ul className="scroll-thin flex-1 overflow-y-auto px-1.5">
          {TREE.map((p) => (
            <li key={p}>
              <button type="button" onClick={() => { setActive(p); setTabs((t) => (t.includes(p) ? t : [...t, p])); }} className={cn("flex w-full items-center gap-2 rounded px-2 py-1 text-left text-[12.5px]", active === p ? "bg-electric/20 text-text" : "text-text-2 hover:bg-surface/50")}>
                {p.endsWith(".ts") ? <FileCode2 className="size-3.5 text-cyan" /> : <FileText className="size-3.5 text-text-3" />}
                <span className="truncate">{name(p)}</span>
              </button>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-2 border-t border-line px-3 py-2 text-[11px] text-text-3"><GitBranch className="size-3.5" /> main · sample</div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center border-b border-line bg-deep/50">
          <div className="flex min-w-0 flex-1 overflow-x-auto">
            {tabs.map((t) => (
              <div key={t} className={cn("group flex items-center gap-2 border-r border-line px-3 py-2 text-xs", active === t ? "bg-base text-text shadow-[inset_0_-2px_0_var(--pt-cyan)]" : "text-text-3 hover:text-text-2")}>
                <button type="button" onClick={() => setActive(t)}>{name(t)}{dirty.has(t) && <span className="ml-1 text-warning">●</span>}</button>
                <button type="button" aria-label={`Close ${name(t)}`} onClick={() => close(t)} className="opacity-0 group-hover:opacity-100"><X className="size-3" /></button>
              </div>
            ))}
          </div>
          <div className="input-surface mx-2 flex w-48 items-center gap-1.5 px-2 py-1">
            <Search className="size-3.5 text-text-3" />
            <input value={find} onChange={(e) => setFind(e.target.value)} placeholder="Find" aria-label="Find in file" className="w-full bg-transparent text-xs outline-none" />
            {find && <span className="text-[10px] text-text-3">{matches}</span>}
          </div>
          <Button size="xs" variant="brand" className="mr-2" onClick={() => { setDirty((d) => { const n = new Set(d); n.delete(active); return n; }); toast("Saved in this browser session. Writing to disk needs the native bridge.", "info"); }}>Save</Button>
          <Button size="xs" variant="hud" className="mr-2" onClick={() => { setDesktop({ assistantOpen: true }); void sendMessage(`Explain ${name(active)}`); }}><Bot /> Ask P</Button>
        </div>

        <div className="relative min-h-0 flex-1 overflow-hidden bg-base/60 font-mono text-[13px] leading-6">
          <div className="scroll-thin absolute inset-0 flex overflow-auto">
            <div className="select-none px-3 py-3 text-right text-text-3" aria-hidden>
              {text.split("\n").map((_, i) => <div key={i}>{i + 1}</div>)}
            </div>
            <div className="relative min-w-0 flex-1 py-3 pr-4">
              <pre ref={pre} aria-hidden className="pointer-events-none m-0 whitespace-pre text-text-2" dangerouslySetInnerHTML={{ __html: html }} />
              <textarea
                value={text}
                spellCheck={false}
                aria-label={`Edit ${name(active)}`}
                onChange={(e) => { setBuffers((b) => ({ ...b, [active]: e.target.value })); setDirty((d) => new Set(d).add(active)); }}
                className="absolute inset-0 h-full w-full resize-none whitespace-pre bg-transparent py-3 pr-4 font-[inherit] text-transparent caret-cyan outline-none selection:bg-electric/40"
                style={{ lineHeight: "inherit", overflow: "hidden" }}
              />
            </div>
          </div>
        </div>

        {panel && (
          <div className="h-44 border-t border-line">
            {panel === "terminal" ? <TerminalSession compact fontSize={12} className="h-full" /> : <p className="p-4 text-xs text-text-3">No problems detected in sample files.</p>}
          </div>
        )}
        <footer className="flex h-7 items-center gap-3 border-t border-line bg-deep/60 px-3 text-[11px] text-text-3">
          <button type="button" onClick={() => setPanel(panel === "terminal" ? null : "terminal")} className="hover:text-text">Terminal</button>
          <button type="button" onClick={() => setPanel(panel === "problems" ? null : "problems")} className="hover:text-text">Problems 0</button>
          <span className="ml-auto">{text.split("\n").length} lines · UTF-8 · {name(active).split(".").pop()?.toUpperCase()}</span>
        </footer>
      </div>
    </div>
  );
}
