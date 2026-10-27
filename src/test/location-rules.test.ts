import { describe, expect, it } from "vitest";
import {
  effectiveStatus, isValidPhone, isValidPosition, isValidToken, normalisePhone, shouldStorePing, smsHref,
} from "@/lib/location/rules";

const NOW = Date.parse("2026-10-27T10:00:00Z");

describe("location sharing rules", () => {
  it("an active link past its expiry reads as expired", () => {
    expect(effectiveStatus({ status: "sharing", expires_at: "2026-10-27T09:59:00Z" }, NOW)).toBe("expired");
    expect(effectiveStatus({ status: "pending", expires_at: "2026-10-27T11:00:00Z" }, NOW)).toBe("pending");
  });

  it("a stopped or declined link stays stopped or declined", () => {
    expect(effectiveStatus({ status: "stopped", expires_at: "2026-10-27T09:00:00Z" }, NOW)).toBe("stopped");
    expect(effectiveStatus({ status: "declined", expires_at: "2026-10-28T09:00:00Z" }, NOW)).toBe("declined");
  });

  it("only 64-character random tokens open a share page", () => {
    expect(isValidToken("a".repeat(64))).toBe(true);
    expect(isValidToken("a".repeat(63))).toBe(false);
    expect(isValidToken("../" + "a".repeat(61))).toBe(false);
  });

  it("rejects impossible coordinates", () => {
    expect(isValidPosition({ lat: -1.29, lng: 36.82, accuracy: 12 })).toBe(true);
    expect(isValidPosition({ lat: 91, lng: 0, accuracy: null })).toBe(false);
    expect(isValidPosition({ lat: 0, lng: 181, accuracy: null })).toBe(false);
    expect(isValidPosition({ lat: Number.NaN, lng: 0, accuracy: null })).toBe(false);
  });

  it("stores at most one position every 4 seconds per phone", () => {
    expect(shouldStorePing(null, NOW)).toBe(true);
    expect(shouldStorePing(new Date(NOW - 3000).toISOString(), NOW)).toBe(false);
    expect(shouldStorePing(new Date(NOW - 4000).toISOString(), NOW)).toBe(true);
  });

  it("phone numbers keep a leading + and digits only", () => {
    expect(normalisePhone(" +254 712-345 678 ")).toBe("+254712345678");
    expect(isValidPhone("+254 712 345 678")).toBe(true);
    expect(isValidPhone("123")).toBe(false);
    expect(smsHref("+254 712 345 678", "hi there")).toBe("sms:+254712345678?&body=hi%20there");
  });
});
