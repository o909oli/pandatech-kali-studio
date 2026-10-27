import { OPERATION_POLICY } from "@/lib/pt/policy";
import type { BridgeOperation } from "@/lib/pt/types";

/** Operations P's brain may propose. Read-only lookups are answered from context instead. */
export const PROPOSABLE_OPERATIONS = (Object.keys(OPERATION_POLICY) as BridgeOperation[]).filter(
  (op) => OPERATION_POLICY[op].requiresApproval,
);

export const INTERNAL_APP_IDS = [
  "terminal", "files", "editor", "notes", "monitor", "network", "security", "assistant", "settings", "applications", "workspaces", "location",
] as const;

export interface ProposalDraft {
  operation: BridgeOperation;
  title: string;
  target: string;
  detail: string;
}

const clip = (s: unknown, n: number) => (typeof s === "string" ? s.trim().slice(0, n) : "");

/**
 * Re-validates a proposal coming from the model. Anything outside the
 * allowlist, or an open_app for an unknown app, is dropped.
 */
export function sanitizeProposal(raw: unknown): ProposalDraft | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const operation = r["operation"];
  if (typeof operation !== "string" || !(PROPOSABLE_OPERATIONS as string[]).includes(operation)) return null;
  const title = clip(r["title"], 120);
  const target = clip(r["target"], 300);
  const detail = clip(r["detail"], 500);
  if (!title || !target) return null;
  if (operation === "open_app" && !(INTERNAL_APP_IDS as readonly string[]).includes(target)) return null;
  return { operation: operation as BridgeOperation, title, target, detail: detail || title };
}
