import { describe, expect, it } from "vitest";
import { OPERATION_POLICY, isAllowlisted, requiresApproval } from "@/lib/pt/policy";
import { demoIntegration } from "@/lib/pt/demo";
import { nativeIntegration } from "@/lib/pt/native";

describe("approval policy", () => {
  it.each([
    "delete_file", "install_package", "remove_package", "change_setting", "change_firewall",
    "run_security_tool", "run_elevated", "send_external", "modify_boot_or_auth", "open_app", "read_file_for_summary",
  ])("%s always needs the user's approval", (op) => {
    expect(requiresApproval(op)).toBe(true);
  });

  it("read-only lookups run without an approval card", () => {
    expect(requiresApproval("show_metrics")).toBe(false);
    expect(requiresApproval("list_interfaces")).toBe(false);
  });

  it("unknown operations are refused and treated as needing approval", () => {
    expect(isAllowlisted("rm_rf_everything")).toBe(false);
    expect(requiresApproval("rm_rf_everything")).toBe(true);
  });

  it("every operation that modifies the system requires approval", () => {
    for (const p of Object.values(OPERATION_POLICY)) if (p.modifies) expect(p.requiresApproval).toBe(true);
  });
});

describe("honest results", () => {
  const proposal = { id: "a1", operation: "delete_file" as const, title: "Delete x", target: "x", detail: "x" };

  it("demo bridge never claims a real system change", async () => {
    const r = await demoIntegration.bridge.execute(proposal);
    expect(r.confirmedByNative).toBe(false);
  });

  it("native bridge fails closed until it is connected", async () => {
    const r = await nativeIntegration.bridge.execute(proposal);
    expect(r.ok).toBe(false);
    expect(r.confirmedByNative).toBe(false);
  });

  it("demo data is always labelled as sample", async () => {
    expect((await demoIntegration.system.getMetrics()).source).toBe("sample");
    expect((await demoIntegration.network.getState()).source).toBe("sample");
  });
});
