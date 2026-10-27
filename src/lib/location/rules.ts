/**
 * Consent-based location sharing rules. Shared by the browser and the server so
 * both sides agree on what is valid. Location is only ever collected after the
 * phone owner opens the link and taps "Allow"; a phone number never locates.
 */

export type ShareStatus = "pending" | "sharing" | "stopped" | "declined" | "expired";

/** Allowed link lifetimes, in hours. */
export const DURATION_HOURS = [1, 6, 24, 72] as const;
export type DurationHours = (typeof DURATION_HOURS)[number];

/** Minimum gap between stored position updates from one phone. */
export const MIN_PING_INTERVAL_MS = 4000;

export interface StatusInput {
  status: string;
  expires_at: string;
}

/** The status a person sees right now: active links past their expiry read as expired. */
export function effectiveStatus(row: StatusInput, now: number = Date.now()): ShareStatus {
  const s = row.status as ShareStatus;
  if ((s === "pending" || s === "sharing") && new Date(row.expires_at).getTime() <= now) return "expired";
  return s;
}

export function isValidToken(token: unknown): token is string {
  return typeof token === "string" && /^[a-f0-9]{64}$/.test(token);
}

export interface Position {
  lat: number;
  lng: number;
  accuracy: number | null;
}

export function isValidPosition(p: unknown): p is Position {
  if (!p || typeof p !== "object") return false;
  const { lat, lng, accuracy } = p as Record<string, unknown>;
  if (typeof lat !== "number" || typeof lng !== "number") return false;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return false;
  if (accuracy !== null && accuracy !== undefined) {
    if (typeof accuracy !== "number" || !Number.isFinite(accuracy) || accuracy < 0 || accuracy > 100_000) return false;
  }
  return true;
}

/** Whether a new position should be stored, given the last stored update time. */
export function shouldStorePing(lastSeenAt: string | null, now: number = Date.now()): boolean {
  if (!lastSeenAt) return true;
  return now - new Date(lastSeenAt).getTime() >= MIN_PING_INTERVAL_MS;
}

/** Normalises a typed phone number to the digits and leading + a dialler accepts. */
export function normalisePhone(raw: string): string {
  const t = raw.trim();
  const plus = t.startsWith("+");
  const digits = t.replace(/\D/g, "");
  return digits ? (plus ? "+" : "") + digits : "";
}

export function isValidPhone(raw: string): boolean {
  const n = normalisePhone(raw).replace("+", "");
  return n.length >= 7 && n.length <= 15;
}

export function shareUrl(origin: string, token: string): string {
  return `${origin.replace(/\/$/, "")}/locate/${token}`;
}

export function inviteText(opts: { from: string | null; message: string | null; url: string }): string {
  const who = opts.from?.trim() || "A Pandatechs user";
  const note = opts.message?.trim() ? `${opts.message.trim()}\n\n` : "";
  return `${note}${who} is asking you to share your location. Open this link and tap Allow only if you agree. You can stop at any time: ${opts.url}`;
}

/** sms: link that opens the phone's messaging app with the invite pre-filled. */
export function smsHref(phone: string, body: string): string {
  return `sms:${normalisePhone(phone)}?&body=${encodeURIComponent(body)}`;
}

export function telHref(phone: string): string {
  return `tel:${normalisePhone(phone)}`;
}

export const STATUS_LABEL: Record<ShareStatus, string> = {
  pending: "Waiting for consent",
  sharing: "Sharing live",
  stopped: "Stopped",
  declined: "Declined",
  expired: "Expired",
};
