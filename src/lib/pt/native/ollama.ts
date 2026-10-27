import type { AssistantProvider, ChatMessage } from "../types";

/**
 * Local-model provider (Ollama-compatible HTTP API on this machine).
 * Nothing is assumed installed: `status()` reports honestly and `send()`
 * fails with a readable error when the service is not reachable.
 * Replies never leave the device — `sendsDataOffDevice` is false.
 */
export const OLLAMA_URL = "http://127.0.0.1:11434";

const SYSTEM_PROMPT =
  "You are P, the personal assistant of Pandatechs Desktop. Be concise, practical and honest. " +
  "You can propose desktop actions but never claim an action happened unless the system confirms it. " +
  "Support only authorised, legal security work and ask for scope and permission first.";

export function createOllamaProvider(baseUrl = OLLAMA_URL): AssistantProvider {
  return {
    id: "ollama",
    label: "Local model (Ollama)",
    sendsDataOffDevice: false,
    async status() {
      try {
        const res = await fetch(`${baseUrl}/api/tags`, { signal: AbortSignal.timeout(2500) });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as { models?: { name: string }[] };
        const models = (json.models ?? []).map((m) => m.name);
        return {
          available: models.length > 0,
          label: models.length ? "Local model ready" : "No model installed",
          detail: models.length
            ? `${models.length} model${models.length > 1 ? "s" : ""} found on this device.`
            : "The service is running but no model has been downloaded yet.",
          models,
        };
      } catch {
        return {
          available: false,
          label: "Local model offline",
          detail: "Could not reach the local model service on 127.0.0.1:11434.",
        };
      }
    },
    async send(history: ChatMessage[], { signal, onToken, model }) {
      if (!model) throw new Error("Choose a model in Settings → Assistant first.");
      const res = await fetch(`${baseUrl}/api/chat`, {
        method: "POST",
        signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          stream: true,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            ...history
              .filter((m) => m.role !== "system" && !m.error)
              .map((m) => ({ role: m.role, content: m.content })),
          ],
        }),
      }).catch(() => {
        throw new Error("The local model service is not reachable.");
      });
      if (!res.ok || !res.body) throw new Error(`Local model returned HTTP ${res.status}.`);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let full = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const chunk = JSON.parse(line) as { message?: { content?: string } };
            const piece = chunk.message?.content ?? "";
            if (piece) {
              full += piece;
              onToken(piece);
            }
          } catch {
            /* partial line */
          }
        }
      }
      return { content: full };
    },
  };
}
