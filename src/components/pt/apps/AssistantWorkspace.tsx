import { Bot, Code2, Copy, Eraser, HardDrive, RefreshCw, ScrollText } from "lucide-react";
import { PHologram } from "@/components/pt/assistant/PHologram";
import { Volume2, VolumeX } from "lucide-react";
import { setDesktop } from "@/lib/pt/store";
import { stopSpeaking } from "@/lib/pt/voice";
import { Panel } from "@/components/pt/ui/bits";
import { Composer, StateBadge, Transcript } from "@/components/pt/assistant/Chat";
import { TerminalSession } from "@/components/pt/apps/TerminalView";
import { LogsWidget, SystemOverview } from "@/components/pt/widgets/Widgets";
import { sendMessage } from "@/lib/pt/assistant";
import { SAMPLE_CODE } from "@/lib/pt/demo/data";
import { toast, useDesktop } from "@/lib/pt/store";
import { useAssistantProvider } from "@/lib/pt/integration";
import { ASSISTANT_STATE_LABEL } from "@/components/pt/ui/Brand";
import { highlight } from "@/lib/pt/highlight";

const SHORTCUTS = [
  { icon: RefreshCw, label: "Check updates", ask: "How is my system doing?" },
  { icon: Eraser, label: "Tidy downloads", ask: "Find report" },
  { icon: HardDrive, label: "Disk summary", ask: "How much disk space is left?" },
  { icon: ScrollText, label: "Network", ask: "Show network interfaces" },
];

/** Full P workspace — hologram at the centre, floating glass panels around it. */
export function AssistantWorkspace() {
  const state = useDesktop((s) => s.assistantState);
  const provider = useAssistantProvider();
  const voice = useDesktop((s) => s.voiceEnabled);
  const busy = state === "thinking" || state === "working" || state === "responding";
  return (
    <div className="relative h-full overflow-hidden bg-deep">
      <div className="grid-backdrop absolute inset-0 opacity-60" aria-hidden />
      <div className="absolute inset-0 bg-[radial-gradient(60%_70%_at_50%_55%,var(--pt-glow),transparent_70%)] opacity-50" aria-hidden />

      {/* hologram */}
      <div className="pointer-events-none absolute inset-x-0 bottom-14 top-2 flex justify-center">
        <PHologram className={busy ? "drop-shadow-[0_0_50px_var(--pt-glow)]" : "drop-shadow-[0_0_30px_var(--pt-glow)]"} />
      </div>
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-center">
        <p className="hud-label !text-cyan">{ASSISTANT_STATE_LABEL[state]}</p>
        <p className="mt-1 text-[11px] text-text-3">{provider.label}</p>
        <button
          type="button"
          onClick={() => { if (voice) stopSpeaking(); setDesktop({ voiceEnabled: !voice }); }}
          aria-pressed={voice}
          className="pointer-events-auto mx-auto mt-2 flex items-center gap-1.5 rounded-full border border-line-strong bg-deep/70 px-3 py-1 text-[11px] text-text-2 hover:border-cyan/60 hover:text-text"
        >
          {voice ? <Volume2 className="size-3.5 text-cyan" /> : <VolumeX className="size-3.5" />}
          {voice ? "P speaks replies" : "Voice off"}
        </button>
      </div>

      {/* left column */}
      <div className="absolute inset-y-4 left-4 flex w-[25rem] flex-col gap-3">
        <SystemOverview />
        <Panel title="Terminal" icon={<ScrollText />} source="sample" className="min-h-0 flex-1" bodyClassName="flex">
          <TerminalSession compact fontSize={12} className="flex-1" />
        </Panel>
        <LogsWidget className="h-36 shrink-0" />
      </div>

      {/* right column */}
      <div className="absolute inset-y-4 right-4 flex w-[26rem] flex-col gap-3">
        <Panel title="AI Chat Interface" icon={<Bot />} actions={<StateBadge />} className="min-h-0 flex-1" bodyClassName="flex min-h-0 flex-col">
          <Transcript className="min-h-0 flex-1" />
          <Composer showSuggestions={false} />
        </Panel>
        <Panel
          title="Code Snippet"
          icon={<Code2 />}
          className="h-52 shrink-0"
          actions={
            <>
              <button type="button" aria-label="Copy code" className="text-text-3 hover:text-text" onClick={() => { void navigator.clipboard?.writeText(SAMPLE_CODE); toast("Code copied", "success"); }}>
                <Copy className="size-3.5" />
              </button>
              <button type="button" className="ml-2 text-[10px] text-cyan hover:underline" onClick={() => void sendMessage("Explain the refresh function in dashboard.ts")}>Ask P</button>
            </>
          }
          bodyClassName="overflow-auto scroll-thin p-3"
        >
          <pre className="font-mono text-[11px] leading-[1.5] text-text-2" dangerouslySetInnerHTML={{ __html: highlight(SAMPLE_CODE) }} />
        </Panel>
        <Panel title="Shortcuts" className="shrink-0" bodyClassName="grid grid-cols-4 gap-2 p-3">
          {SHORTCUTS.map((s) => (
            <button key={s.label} type="button" onClick={() => void sendMessage(s.ask)} className="flex flex-col items-center gap-1.5 rounded-lg border border-line bg-elevated/40 px-1 py-2 text-center text-[10.5px] leading-tight text-text-2 transition-colors hover:border-cyan/60 hover:text-text">
              <s.icon className="size-5 text-cyan" strokeWidth={1.6} />
              {s.label}
            </button>
          ))}
        </Panel>
      </div>
    </div>
  );
}
