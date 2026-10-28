/**
 * P's AI connection — the one place that decides where P's brain runs.
 *
 * 1. Inside Lovable (preview / published app): uses the built-in Lovable AI
 *    with the auto-provided LOVABLE_API_KEY. Nothing to configure.
 * 2. Anywhere else (your Linux machine, a server): set these environment
 *    variables (see .env.example and docs/AI_CONFIG.md):
 *
 *      P_AI_BASE_URL   OpenAI-compatible API base, e.g.
 *                        http://localhost:11434/v1   (Ollama, fully offline)
 *                        http://localhost:1234/v1    (LM Studio)
 *                        https://api.openai.com/v1   (OpenAI)
 *      P_AI_API_KEY    key for that service (leave empty for Ollama / LM Studio)
 *      P_AI_MODEL      model name, e.g. llama3.1, qwen2.5-coder, gpt-4.1-mini
 *      P_AI_API        "chat" (default, works everywhere) or "responses" (OpenAI only)
 *
 * When P_AI_BASE_URL is set it always wins, so a machine can be pinned to a
 * local model. Keys never leave the server.
 */
import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";

export const LOVABLE_GATEWAY_URL = "https://ai.gateway.lovable.dev";
export const LOVABLE_CHAT_MODEL = "openai/gpt-6-astra";

export type AiConnection =
  | { kind: "lovable"; apiKey: string; model: string }
  | { kind: "custom"; baseURL: string; apiKey: string; model: string; api: "chat" | "responses" };

const env = (name: string) => {
  const v = process.env[name];
  return v && v.trim() ? v.trim() : undefined;
};

/** Reads the configuration at request time (never at import time). */
export function resolveAiConnection(): AiConnection | null {
  const baseURL = env("P_AI_BASE_URL");
  if (baseURL) {
    return {
      kind: "custom",
      baseURL: baseURL.replace(/\/+$/, ""),
      // local servers (Ollama, LM Studio) ignore the key but the SDK needs a value
      apiKey: env("P_AI_API_KEY") ?? "local",
      model: env("P_AI_MODEL") ?? "llama3.1",
      api: env("P_AI_API") === "responses" ? "responses" : "chat",
    };
  }
  const apiKey = env("LOVABLE_API_KEY");
  if (apiKey) return { kind: "lovable", apiKey, model: LOVABLE_CHAT_MODEL };
  return null;
}

export const NOT_CONFIGURED =
  "P's AI is not connected on this machine. Set P_AI_BASE_URL and P_AI_MODEL (see docs/AI_CONFIG.md), then restart.";

/** Builds the language model for a request. `fetch` carries the Lovable run id. */
export function chatModel(conn: AiConnection, fetchImpl?: typeof fetch): LanguageModel {
  if (conn.kind === "lovable") {
    const provider = createOpenAI({
      baseURL: `${LOVABLE_GATEWAY_URL}/v1`,
      apiKey: conn.apiKey,
      headers: { "Lovable-API-Key": conn.apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
      ...(fetchImpl ? { fetch: fetchImpl } : {}),
    });
    return provider.responses(conn.model);
  }
  const provider = createOpenAI({ baseURL: conn.baseURL, apiKey: conn.apiKey });
  return conn.api === "responses" ? provider.responses(conn.model) : provider.chat(conn.model);
}

/** Reasoning options only apply to the built-in route; local servers may reject them. */
export function chatProviderOptions(conn: AiConnection, effort: "low" | "medium" = "low") {
  if (conn.kind === "lovable") {
    return {
      openai: {
        forceReasoning: true,
        reasoningEffort: effort,
        reasoningSummary: "auto",
        store: false,
        include: ["reasoning.encrypted_content"],
      },
    };
  }
  return conn.api === "responses" ? { openai: { store: false } } : {};
}

/** Safe, secret-free description for the UI. */
export function describeAi(conn: AiConnection | null) {
  if (!conn) return { connected: false, provider: "none", model: null, offDevice: false };
  if (conn.kind === "lovable") return { connected: true, provider: "Lovable AI (built in)", model: "P online", offDevice: true };
  const local = /localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\]/.test(conn.baseURL);
  return { connected: true, provider: local ? "Local model on this machine" : "Your AI provider", model: conn.model, offDevice: !local };
}
