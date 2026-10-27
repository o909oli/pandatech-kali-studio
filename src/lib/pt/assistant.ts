import { useSyncExternalStore } from "react";
import type { ActionProposal, ActionResult, ChatMessage } from "./types";
import { uid } from "./format";
import { createStore, desktopStore, setDesktop, toast } from "./store";
import { ASSISTANT_PROVIDERS, DEMO_PROVIDER, getIntegration } from "./integration";
import { isAllowlisted, policyFor } from "./policy";
import { speak, stopSpeaking } from "./voice";

/**
 * Conversation controller for P. One conversation, kept in memory only
 * (never persisted — the prototype does not store chat history on disk).
 */
interface ChatState {
  messages: ChatMessage[];
  streaming: boolean;
  /** proposals waiting for the user, keyed by proposal id */
  pending: Record<string, "waiting" | "running" | "approved" | "denied" | "failed">;
  results: Record<string, ActionResult>;
}

const WELCOME: ChatMessage = {
  id: "welcome",
  role: "assistant",
  createdAt: Date.now(),
  content:
    "Good to see you, boss. I'm **P**. Talk to me about anything, work or otherwise. " +
    "If you want me to touch the system, I'll ask for your approval first.",
};

export const chatStore = createStore<ChatState>({
  messages: [WELCOME],
  streaming: false,
  pending: {},
  results: {},
});

export function useChat<S>(selector: (s: ChatState) => S): S {
  return useSyncExternalStore(
    chatStore.subscribe,
    () => selector(chatStore.get()),
    () => selector(chatStore.get()),
  );
}

let controller: AbortController | null = null;
let doneTimer: ReturnType<typeof setTimeout> | undefined;

function settle(state: "idle" | "done" | "error" | "offline", ms = 1800) {
  setDesktop({ assistantState: state });
  if (doneTimer) clearTimeout(doneTimer);
  if (state === "done" || state === "error") {
    doneTimer = setTimeout(() => setDesktop({ assistantState: "idle" }), ms);
  }
}

export function clearChat() {
  controller?.abort();
  stopSpeaking();
  chatStore.set({ messages: [WELCOME], streaming: false, pending: {}, results: {} });
  settle("idle");
}

export function stopStreaming() {
  controller?.abort();
  stopSpeaking();
}

export async function sendMessage(text: string) {
  const trimmed = text.trim();
  if (!trimmed || chatStore.get().streaming) return;
  stopSpeaking();
  const s = desktopStore.get();
  const provider = ASSISTANT_PROVIDERS[s.assistantProvider] ?? DEMO_PROVIDER;

  const userMsg: ChatMessage = { id: uid("m"), role: "user", content: trimmed, createdAt: Date.now() };
  const botId = uid("m");
  const history = [...chatStore.get().messages, userMsg];
  chatStore.set({
    messages: [...history, { id: botId, role: "assistant", content: "", createdAt: Date.now() }],
    streaming: true,
  });
  setDesktop({ assistantState: "thinking" });

  controller = new AbortController();
  const patchBot = (patch: Partial<ChatMessage>) =>
    chatStore.set((st) => ({
      messages: st.messages.map((m) => (m.id === botId ? { ...m, ...patch } : m)),
    }));

  try {
    let acc = "";
    const reply = await provider.send(history, {
      signal: controller.signal,
      model: s.assistantModel || undefined,
      onToken: (chunk) => {
        acc += chunk;
        if (desktopStore.get().assistantState !== "responding") setDesktop({ assistantState: "responding" });
        patchBot({ content: acc });
      },
    });
    const proposal = reply.proposal && isAllowlisted(reply.proposal.operation) ? reply.proposal : undefined;
    patchBot(proposal ? { content: reply.content, proposal } : { content: reply.content });
    if (desktopStore.get().voiceEnabled) speak(reply.content);
    if (proposal) {
      const needs = policyFor(proposal.operation)?.requiresApproval ?? true;
      chatStore.set((st) => ({ pending: { ...st.pending, [proposal.id]: "waiting" } }));
      setDesktop({ assistantState: needs ? "approval" : "working" });
    } else {
      settle("done");
    }
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") {
      patchBot({ content: (chatStore.get().messages.find((m) => m.id === botId)?.content || "") + "\n\n*Stopped.*" });
      settle("idle");
    } else {
      const message = e instanceof Error ? e.message : "Something went wrong.";
      patchBot({ content: message, error: true });
      settle("error");
    }
  } finally {
    chatStore.set({ streaming: false });
  }
}

export async function resolveProposal(proposal: ActionProposal, approve: boolean) {
  const setPending = (v: ChatState["pending"][string]) =>
    chatStore.set((st) => ({ pending: { ...st.pending, [proposal.id]: v } }));
  if (!approve) {
    setPending("denied");
    settle("idle");
    toast("Action declined. Nothing was changed.", "info");
    return;
  }
  setPending("running");
  setDesktop({ assistantState: "working" });
  const integration = getIntegration(desktopStore.get().mode);
  try {
    let result: ActionResult;
    if (proposal.operation === "open_app") {
      // in-app navigation is handled by the caller via the `pt:navigate` event
      window.dispatchEvent(new CustomEvent("pt:navigate", { detail: { appId: proposal.target } }));
      result = { ok: true, confirmedByNative: true, message: `Opened ${proposal.target}.` };
    } else {
      result = await integration.bridge.execute(proposal);
    }
    chatStore.set((st) => ({ results: { ...st.results, [proposal.id]: result } }));
    setPending(result.ok ? "approved" : "failed");
    settle(result.ok ? "done" : "error", 2400);
    toast(result.message, result.ok ? (result.confirmedByNative ? "success" : "info") : "warning");
  } catch (e) {
    const message = e instanceof Error ? e.message : "The action failed.";
    chatStore.set((st) => ({ results: { ...st.results, [proposal.id]: { ok: false, confirmedByNative: false, message } } }));
    setPending("failed");
    settle("error", 2400);
  }
}
