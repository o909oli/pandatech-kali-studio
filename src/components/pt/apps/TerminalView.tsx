import { useEffect, useMemo, useRef, useState } from "react";
import { run, newShell, prompt, type OutputLine, type ShellState } from "@/lib/pt/shell";
import { EmptyState } from "@/components/pt/ui/bits";
import { sendMessage } from "@/lib/pt/assistant";
import { setDesktop, useDesktop } from "@/lib/pt/store";
import { cn } from "@/lib/utils";

const BANNER: OutputLine[] = [
  { text: "Pandatechs demo shell — sample output only. Type 'help'.", tone: "dim" },
];

interface Entry {
  prompt?: { user: string; path: string };
  cmd?: string;
  lines: OutputLine[];
}

const toneClass: Record<NonNullable<OutputLine["tone"]>, string> = {
  out: "text-text",
  err: "text-danger",
  dim: "text-text-3",
  ok: "text-success",
  cmd: "text-text",
};

export function TerminalSession({
  compact,
  fontSize = 13,
  className,
  autoFocus,
}: {
  compact?: boolean | undefined;
  fontSize?: number | undefined;
  className?: string | undefined;
  autoFocus?: boolean | undefined;
}) {
  const mode = useDesktop((s) => s.mode);
  const shell = useRef<ShellState>(newShell());
  const [entries, setEntries] = useState<Entry[]>([{ lines: BANNER }]);
  const [value, setValue] = useState("");
  const [histIdx, setHistIdx] = useState<number | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const p = useMemo(() => prompt(shell.current), [entries]);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
  }, [entries]);
  useEffect(() => {
    if (autoFocus) input.current?.focus();
  }, [autoFocus]);

  if (mode === "native") {
    return (
      <EmptyState
        kind="unavailable"
        title="Terminal needs the native bridge"
        body="Connect a PTY stream from the Pandatechs bridge (xterm.js) here. See docs/COPILOT_INTEGRATION.md §5."
      />
    );
  }

  const submit = () => {
    const before = prompt(shell.current);
    const res = run(shell.current, value, (q) => {
      setDesktop({ assistantOpen: true });
      if (q) void sendMessage(q);
    });
    setEntries((e) => (res.clear ? [] : [...e, { prompt: before, cmd: value, lines: res.lines }]));
    setValue("");
    setHistIdx(null);
  };

  return (
    <div
      className={cn("flex min-h-0 flex-col bg-deep/80 font-mono", className)}
      style={{ fontSize }}
      onClick={() => input.current?.focus()}
    >
      <div ref={scroller} className="scroll-thin min-h-0 flex-1 overflow-y-auto px-3 py-2 leading-relaxed" role="log" aria-label="Terminal output">
        {entries.map((e, i) => (
          <div key={i}>
            {e.prompt && (
              <div className="whitespace-pre-wrap break-all">
                <span className="text-success">{e.prompt.user}</span>
                <span className="text-text-3">:</span>
                <span className="text-electric">{e.prompt.path}</span>
                <span className="text-text-3">$ </span>
                <span className="text-text">{e.cmd}</span>
              </div>
            )}
            {e.lines.map((l, j) => (
              <div key={j} className={cn("whitespace-pre-wrap break-all", toneClass[l.tone ?? "out"])}>
                {l.text}
              </div>
            ))}
          </div>
        ))}
        <label className="flex items-center whitespace-pre">
          <span className="text-success">{p.user}</span>
          <span className="text-text-3">:</span>
          <span className="text-electric">{p.path}</span>
          <span className="text-text-3">$&nbsp;</span>
          <input
            ref={input}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              const h = shell.current.history;
              if (e.key === "Enter") submit();
              if (e.key === "ArrowUp" && h.length) {
                e.preventDefault();
                const n = histIdx === null ? h.length - 1 : Math.max(0, histIdx - 1);
                setHistIdx(n);
                setValue(h[n] ?? "");
              }
              if (e.key === "ArrowDown" && histIdx !== null) {
                e.preventDefault();
                const n = histIdx + 1;
                if (n >= h.length) { setHistIdx(null); setValue(""); } else { setHistIdx(n); setValue(h[n] ?? ""); }
              }
              if (e.key === "l" && e.ctrlKey) { e.preventDefault(); setEntries([]); }
            }}
            spellCheck={false}
            autoCapitalize="off"
            autoComplete="off"
            aria-label="Terminal input"
            className="min-w-0 flex-1 bg-transparent text-text caret-cyan outline-none"
          />
        </label>
      </div>
      {!compact && null}
    </div>
  );
}
