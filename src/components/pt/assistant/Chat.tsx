import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Check, CircleAlert, Loader2, Mic, Send, ShieldQuestion, Square, X } from "lucide-react";
import { ASSISTANT_STATE_LABEL, PAvatar } from "@/components/pt/ui/Brand";
import { Button } from "@/components/ui/button";
import { clearChat, resolveProposal, sendMessage, stopStreaming, useChat } from "@/lib/pt/assistant";
import { policyFor } from "@/lib/pt/policy";
import { useAssistantProvider } from "@/lib/pt/integration";
import { setDesktop, toast, useDesktop } from "@/lib/pt/store";
import { listen, listenSupported, stopListening, useListening } from "@/lib/pt/voice";
import type { ActionProposal, ChatMessage } from "@/lib/pt/types";
import { cn } from "@/lib/utils";

export const SUGGESTIONS = [
  "How is my system doing?",
  "Open the terminal",
  "Show network interfaces",
  "Create folder reports-2025",
  "Find report",
  "Install htop",
];

function Markdown({ children }: { children: string }) {
  return (
    <div className="pt-prose">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children || "…"}</ReactMarkdown>
    </div>
  );
}

export function ApprovalCard({ proposal }: { proposal: ActionProposal }) {
  const status = useChat((s) => s.pending[proposal.id]);
  const result = useChat((s) => s.results[proposal.id]);
  const policy = policyFor(proposal.operation);
  const elevated = /elevated/i.test(policy?.permission ?? "");
  const settled = status && status !== "waiting";

  return (
    <div className={cn("mt-2 overflow-hidden rounded-lg border bg-deep/70", status === "waiting" ? "border-warning/50" : "border-line")}>
      <div className="flex items-center gap-2 border-b border-line px-3 py-1.5">
        <ShieldQuestion className="size-3.5 text-warning" />
        <span className="hud-label !text-warning">Approval needed</span>
        {elevated && <span className="ml-auto rounded bg-danger/20 px-1.5 py-px font-display text-[9px] uppercase tracking-wider text-danger">Elevated</span>}
      </div>
      <dl className="grid grid-cols-[5.5rem_1fr] gap-x-3 gap-y-1 px-3 py-2 text-xs">
        <dt className="text-text-3">Action</dt>
        <dd className="font-medium text-text">{proposal.title}</dd>
        <dt className="text-text-3">Permission</dt>
        <dd className="text-text-2">{policy?.permission ?? "Unknown"}</dd>
        <dt className="text-text-3">Target</dt>
        <dd className="break-all font-mono text-[11px] text-ice">{proposal.target}</dd>
        <dt className="text-text-3">Exact step</dt>
        <dd className="break-all rounded bg-base/80 px-1.5 py-1 font-mono text-[11px] text-text-2">{proposal.detail}</dd>
      </dl>
      <div className="flex items-center gap-2 border-t border-line px-3 py-2">
        {!settled ? (
          <>
            <Button size="xs" variant="success" onClick={() => void resolveProposal(proposal, true)}>
              <Check /> Approve
            </Button>
            <Button size="xs" variant="hud" onClick={() => void resolveProposal(proposal, false)}>
              <X /> Decline
            </Button>
          </>
        ) : status === "running" ? (
          <span className="flex items-center gap-2 text-xs text-text-2"><Loader2 className="size-3.5 animate-spin-med" /> Working…</span>
        ) : status === "denied" ? (
          <span className="text-xs text-text-3">Declined. Nothing was changed.</span>
        ) : (
          <span className={cn("flex items-start gap-1.5 text-xs", status === "failed" ? "text-danger" : "text-text-2")}>
            {status === "failed" ? <CircleAlert className="mt-px size-3.5 shrink-0" /> : <Check className="mt-px size-3.5 shrink-0 text-success" />}
            <span>
              {result?.message}
              {result && !result.confirmedByNative && result.ok && (
                <em className="ml-1 text-warning not-italic">(not applied to a real system)</em>
              )}
            </span>
          </span>
        )}
      </div>
    </div>
  );
}

function Bubble({ m }: { m: ChatMessage }) {
  const user = m.role === "user";
  return (
    <div className={cn("flex gap-2.5", user && "justify-end")}>
      {!user && <PAvatar size={28} className="mt-0.5" />}
      <div className={cn("max-w-[88%] min-w-0", user && "max-w-[80%]")}>
        <div
          className={cn(
            "rounded-xl px-3 py-2",
            user ? "rounded-br-sm bg-electric/90 text-primary-foreground" : "rounded-tl-sm border border-line bg-elevated/50",
            m.error && "border-danger/50 bg-danger/10",
          )}
        >
          {user ? <p className="whitespace-pre-wrap text-sm">{m.content}</p> : <Markdown>{m.content}</Markdown>}
        </div>
        {m.proposal && <ApprovalCard proposal={m.proposal} />}
      </div>
    </div>
  );
}

export function Transcript({ className }: { className?: string | undefined }) {
  const messages = useChat((s) => s.messages);
  const streaming = useChat((s) => s.streaming);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight, behavior: "smooth" });
  }, [messages, streaming]);
  return (
    <div ref={ref} className={cn("scroll-thin flex flex-col gap-3.5 overflow-y-auto p-4", className)} aria-live="polite">
      {messages.map((m) => (
        <Bubble key={m.id} m={m} />
      ))}
    </div>
  );
}

export function Composer({ autoFocus, showSuggestions = true }: { autoFocus?: boolean | undefined; showSuggestions?: boolean | undefined }) {
  const [text, setText] = useState("");
  const streaming = useChat((s) => s.streaming);
  const messages = useChat((s) => s.messages);
  const provider = useAssistantProvider();
  const listening = useListening();
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus]);

  const submit = () => {
    if (!text.trim()) return;
    void sendMessage(text);
    setText("");
  };

  return (
    <div className="border-t border-line bg-deep/50 p-3">
      {showSuggestions && messages.length <= 1 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => void sendMessage(s)}
              className="rounded-full border border-line bg-elevated/50 px-2.5 py-1 text-[11px] text-text-2 transition-colors hover:border-cyan/60 hover:text-text"
            >
              {s}
            </button>
          ))}
        </div>
      )}
      <div className="input-surface flex items-end gap-2 p-2">
        <textarea
          ref={ref}
          value={text}
          rows={1}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder={listening ? "Listening…" : "Talk or type to P…"}
          aria-label="Message P"
          className="max-h-28 min-h-6 flex-1 resize-none bg-transparent px-1 text-sm text-text outline-none placeholder:text-text-3"
        />
        <Button
          size="icon-sm"
          variant={listening ? "hud-active" : "quiet"}
          aria-label={listening ? "Stop listening" : "Talk to P"}
          aria-pressed={listening}
          onClick={async () => {
            if (listening) return stopListening();
            if (!listenSupported()) return toast("Voice input works in Chrome or Edge. You can still type to P.", "info");
            setDesktop({ assistantState: "listening" });
            try {
              const heard = await listen(setText);
              setDesktop({ assistantState: "idle" });
              if (heard) {
                setText("");
                void sendMessage(heard);
              }
            } catch (e) {
              setDesktop({ assistantState: "idle" });
              toast(e instanceof Error ? e.message : "Voice input failed.", "warning");
            }
          }}
        >
          <Mic className={listening ? "text-violet animate-breathe" : undefined} />
        </Button>
        {streaming ? (
          <Button size="icon-sm" variant="danger" onClick={stopStreaming} aria-label="Stop response">
            <Square />
          </Button>
        ) : (
          <Button size="icon-sm" variant="brand" onClick={submit} disabled={!text.trim()} aria-label="Send message">
            <Send />
          </Button>
        )}
      </div>
      <p className="mt-1.5 flex items-center justify-between px-1 text-[10px] text-text-3">
        <span>{provider.sendsDataOffDevice ? "Powered by Lovable AI. Messages are processed online." : "Runs on this device. Nothing leaves your machine."}</span>
        <button type="button" className="hover:text-text-2" onClick={clearChat}>New chat</button>
      </p>
    </div>
  );
}

export function StateBadge() {
  const state = useDesktop((s) => s.assistantState);
  const tone = state === "error" || state === "offline" ? "text-danger" : state === "approval" ? "text-warning" : state === "done" ? "text-success" : "text-cyan";
  return (
    <span className={cn("flex items-center gap-1.5 font-display text-[10px] uppercase tracking-[0.16em]", tone)}>
      <span className={cn("size-1.5 rounded-full bg-current", state !== "idle" && "animate-breathe")} />
      {ASSISTANT_STATE_LABEL[state]}
    </span>
  );
}
