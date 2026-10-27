import type { ActionProposal, AssistantProvider, ChatMessage, Integration } from "./types";
import { uid, formatBytes, formatRate } from "./format";
import { desktopStore } from "./store";
import { demoIntegration } from "./demo";
import { nativeIntegration } from "./native";

/** Short system summary the brain can talk about. Never includes file contents. */
async function snapshot(): Promise<string> {
  const mode = desktopStore.get().mode;
  const i = (mode === "native" ? nativeIntegration : demoIntegration) as Integration;
  try {
    const [m, n] = await Promise.all([i.system.getMetrics(), i.network.getState()]);
    const parts: string[] = [];
    if (m.data) {
      parts.push(
        `CPU ${m.data.cpuPercent.toFixed(0)}%`,
        `memory ${formatBytes(m.data.memUsedBytes)} of ${formatBytes(m.data.memTotalBytes, 0)}`,
        `disk ${formatBytes(m.data.rootUsedBytes, 0)} of ${formatBytes(m.data.rootTotalBytes, 0)} used`,
      );
    }
    if (n.data) parts.push(`network ${n.data.connected ? "connected" : "offline"}, down ${formatRate(n.data.downBps)}, up ${formatRate(n.data.upBps)}`);
    return parts.length ? `${parts.join("; ")} (${m.source})` : "not connected";
  } catch {
    return "not available";
  }
}

/** P's conversational brain, powered by Lovable AI through the app's own server route. */
export const brainAssistant: AssistantProvider = {
  id: "brain",
  label: "P Brain (Lovable AI)",
  sendsDataOffDevice: true,
  async status() {
    return { available: true, label: "Online", detail: "Full conversation powered by Lovable AI. Messages are processed online." };
  },
  async send(history: ChatMessage[], { signal, onToken }) {
    const messages = history
      .filter((m) => m.role !== "system" && !m.error && m.content.trim())
      .slice(-30)
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: (m.proposal ? `${m.content}\n(I proposed: ${m.proposal.title})` : m.content).slice(0, 8000),
      }));
    while (messages[0]?.role === "assistant" && messages.length > 1) messages.shift();

    const res = await fetch("/api/p-chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal,
      body: JSON.stringify({
        messages,
        context: {
          dataMode: desktopStore.get().mode,
          localTime: new Date().toLocaleString(),
          system: await snapshot(),
        },
      }),
    });
    if (!res.ok || !res.body) {
      const j = (await res.json().catch(() => null)) as { error?: string } | null;
      throw new Error(j?.error ?? `P could not reply (error ${res.status}).`);
    }

    const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
    let buf = "";
    let content = "";
    let proposal: ActionProposal | undefined;
    let failure: string | undefined;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += value;
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";
      for (const l of lines) {
        if (!l.trim()) continue;
        const ev = JSON.parse(l) as { t: string; d?: string; message?: string; proposal?: Omit<ActionProposal, "id"> };
        if (ev.t === "text" && ev.d) {
          content += ev.d;
          onToken(ev.d);
        } else if (ev.t === "proposal" && ev.proposal && !proposal) {
          proposal = { id: uid("act"), ...ev.proposal };
        } else if (ev.t === "error") {
          failure = ev.message ?? "P could not reply.";
        }
      }
    }
    if (failure && !content) throw new Error(failure);
    if (!content && proposal) content = "Ready when you approve, boss.";
    return proposal ? { content, proposal } : { content };
  },
};
