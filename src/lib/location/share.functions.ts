import { createServerFn } from "@tanstack/react-start";
import {
  effectiveStatus,
  isValidPosition,
  isValidToken,
  shouldStorePing,
  type Position,
  type ShareStatus,
} from "./rules";

/**
 * Functions used by the phone owner on the public /locate/<token> page.
 * They are public endpoints: every handler checks the long random token first
 * and only ever touches the single request that token belongs to.
 */

export interface ShareInfo {
  found: boolean;
  status: ShareStatus;
  requesterName: string | null;
  message: string | null;
  expiresAt: string | null;
}

const NOT_FOUND: ShareInfo = { found: false, status: "expired", requesterName: null, message: null, expiresAt: null };

function tokenInput(input: { token: string }) {
  if (!input || !isValidToken(input.token)) throw new Error("Invalid link");
  return { token: input.token };
}

async function loadByToken(token: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("location_requests")
    .select("id, status, expires_at, requester_name, message, last_seen_at")
    .eq("token", token)
    .maybeSingle();
  return { supabaseAdmin, row: data };
}

export const getShareInfo = createServerFn({ method: "POST" })
  .inputValidator(tokenInput)
  .handler(async ({ data }): Promise<ShareInfo> => {
    const { row } = await loadByToken(data.token);
    if (!row) return NOT_FOUND;
    return {
      found: true,
      status: effectiveStatus(row),
      requesterName: row.requester_name,
      message: row.message,
      expiresAt: row.expires_at,
    };
  });

/** The phone owner tapped Allow. */
export const consentToShare = createServerFn({ method: "POST" })
  .inputValidator(tokenInput)
  .handler(async ({ data }): Promise<{ ok: boolean; status: ShareStatus }> => {
    const { supabaseAdmin, row } = await loadByToken(data.token);
    if (!row) return { ok: false, status: "expired" };
    const status = effectiveStatus(row);
    if (status === "sharing") return { ok: true, status };
    if (status !== "pending") return { ok: false, status };
    await supabaseAdmin
      .from("location_requests")
      .update({ status: "sharing", consented_at: new Date().toISOString() })
      .eq("id", row.id)
      .eq("status", "pending");
    return { ok: true, status: "sharing" };
  });

/** One position update. Ignored unless the person is currently sharing. */
export const sendPosition = createServerFn({ method: "POST" })
  .inputValidator((input: { token: string; position: Position }) => {
    const { token } = tokenInput(input);
    if (!isValidPosition(input.position)) throw new Error("Invalid position");
    return { token, position: { lat: input.position.lat, lng: input.position.lng, accuracy: input.position.accuracy ?? null } };
  })
  .handler(async ({ data }): Promise<{ ok: boolean; status: ShareStatus }> => {
    const { supabaseAdmin, row } = await loadByToken(data.token);
    if (!row) return { ok: false, status: "expired" };
    const status = effectiveStatus(row);
    if (status !== "sharing") return { ok: false, status };
    if (!shouldStorePing(row.last_seen_at)) return { ok: true, status };
    const now = new Date().toISOString();
    const { lat, lng, accuracy } = data.position;
    await supabaseAdmin.from("location_pings").insert({ request_id: row.id, lat, lng, accuracy, recorded_at: now });
    await supabaseAdmin
      .from("location_requests")
      .update({ last_lat: lat, last_lng: lng, last_accuracy: accuracy, last_seen_at: now })
      .eq("id", row.id);
    return { ok: true, status };
  });

/** The phone owner stopped sharing or declined. */
export const stopSharing = createServerFn({ method: "POST" })
  .inputValidator((input: { token: string; decline?: boolean }) => ({ ...tokenInput(input), decline: input.decline === true }))
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    const { supabaseAdmin, row } = await loadByToken(data.token);
    if (!row) return { ok: false };
    const status = effectiveStatus(row);
    if (status !== "pending" && status !== "sharing") return { ok: true };
    await supabaseAdmin
      .from("location_requests")
      .update({ status: data.decline && status === "pending" ? "declined" : "stopped", stopped_at: new Date().toISOString() })
      .eq("id", row.id);
    return { ok: true };
  });
