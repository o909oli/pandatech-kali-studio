import type { BridgeOperation } from "./types";

export interface OperationPolicy {
  /** changes the system or data */
  modifies: boolean;
  /** human readable permission shown in the approval card */
  permission: string;
  /** must be approved by the user before the bridge runs it */
  requiresApproval: boolean;
}

/**
 * The single allowlist for everything P (or any UI) may ask the native bridge
 * to do. Anything not listed here is rejected. Keep this in sync with the
 * native bridge — see docs/COPILOT_INTEGRATION.md §6.
 */
export const OPERATION_POLICY: Record<BridgeOperation, OperationPolicy> = {
  show_metrics: { modifies: false, permission: "Read system metrics", requiresApproval: false },
  list_interfaces: { modifies: false, permission: "Read network state", requiresApproval: false },
  find_file: { modifies: false, permission: "Search permitted folders", requiresApproval: false },
  open_app: { modifies: false, permission: "Launch an installed application", requiresApproval: true },
  open_folder: { modifies: false, permission: "Open a folder in Pandatechs Files", requiresApproval: true },
  read_file_for_summary: { modifies: false, permission: "Read file contents and pass them to the AI model", requiresApproval: true },
  create_folder: { modifies: true, permission: "Create a folder", requiresApproval: true },
  delete_file: { modifies: true, permission: "Delete files", requiresApproval: true },
  install_package: { modifies: true, permission: "Install software (elevated)", requiresApproval: true },
  remove_package: { modifies: true, permission: "Remove software (elevated)", requiresApproval: true },
  change_setting: { modifies: true, permission: "Change system settings", requiresApproval: true },
  change_firewall: { modifies: true, permission: "Change firewall rules (elevated)", requiresApproval: true },
  run_security_tool: { modifies: true, permission: "Execute a security tool against a target", requiresApproval: true },
  run_elevated: { modifies: true, permission: "Run a command with elevated privileges", requiresApproval: true },
  send_external: { modifies: false, permission: "Send data outside this machine", requiresApproval: true },
  modify_boot_or_auth: { modifies: true, permission: "Modify boot, login or authentication", requiresApproval: true },
  /* Pandatechs Studio */
  read_workspace: { modifies: false, permission: "Read files inside the open workspace", requiresApproval: false },
  create_file: { modifies: true, permission: "Create a file in the workspace", requiresApproval: true },
  write_file: { modifies: true, permission: "Edit a file in the workspace", requiresApproval: true },
  run_process: { modifies: true, permission: "Run a process in the workspace terminal", requiresApproval: true },
  git_change: { modifies: true, permission: "Change the Git repository (stage, commit, discard, push)", requiresApproval: true },
  change_project_config: { modifies: true, permission: "Change project configuration", requiresApproval: true },
  install_extension: { modifies: true, permission: "Install, update or remove an extension", requiresApproval: true },
};

export function policyFor(op: string): OperationPolicy | null {
  return (OPERATION_POLICY as Record<string, OperationPolicy>)[op] ?? null;
}

export function requiresApproval(op: string): boolean {
  // Unknown operations are never allowed silently.
  return policyFor(op)?.requiresApproval ?? true;
}

export function isAllowlisted(op: string): op is BridgeOperation {
  return policyFor(op) !== null;
}
