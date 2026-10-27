import { describe, expect, it } from "vitest";
import { PROPOSABLE_OPERATIONS, sanitizeProposal } from "@/lib/p/proposal";

describe("P brain proposals", () => {
  it("keeps an allowlisted proposal", () => {
    expect(sanitizeProposal({ operation: "open_app", title: "Open terminal", target: "terminal", detail: "Open it" })).toEqual({
      operation: "open_app", title: "Open terminal", target: "terminal", detail: "Open it",
    });
  });

  it("drops operations outside the allowlist", () => {
    expect(sanitizeProposal({ operation: "format_disk", title: "x", target: "/", detail: "x" })).toBeNull();
  });

  it("drops open_app for an app that does not exist", () => {
    expect(sanitizeProposal({ operation: "open_app", title: "Open", target: "rootkit", detail: "x" })).toBeNull();
  });

  it("only offers operations that need the user's approval", () => {
    expect(PROPOSABLE_OPERATIONS).not.toContain("show_metrics");
    expect(PROPOSABLE_OPERATIONS).toContain("delete_file");
  });
});
