import type { BridgeOperation } from "../types";
import { uid } from "../format";
import type { ActionClass, ProposedAction } from "./types";

export const CLASS_INFO: Record<ActionClass, { label: string; operation: BridgeOperation; risk: ProposedAction["risk"] }> = {
  read: { label: "Read-only inspection", operation: "read_workspace", risk: "low" },
  create_file: { label: "Creates files", operation: "create_file", risk: "low" },
  edit_file: { label: "Edits files", operation: "write_file", risk: "medium" },
  run_process: { label: "Runs a process", operation: "run_process", risk: "medium" },
  project_config: { label: "Changes project configuration", operation: "change_project_config", risk: "medium" },
  system_config: { label: "Changes system configuration", operation: "change_setting", risk: "high" },
  install: { label: "Installs or removes software", operation: "install_package", risk: "high" },
  elevated: { label: "Uses elevated privileges", operation: "run_elevated", risk: "high" },
  external: { label: "Sends information externally", operation: "send_external", risk: "medium" },
};

/** Classifies a shell command before it is shown in an approval card. */
export function classifyCommand(command: string): { actionClass: ActionClass; risk: ProposedAction["risk"] } {
  const c = command.trim();
  if (/(^|[;&|]\s*)(sudo|doas|pkexec|su)\b/.test(c)) return { actionClass: "elevated", risk: "high" };
  if (/\b(apt(-get)?|dnf|yum|pacman|zypper|snap|flatpak)\s+(install|remove|purge|upgrade)\b|\bpip3?\s+install\b|\bnpm\s+(i|install)\s+(-g|--global)\b/.test(c))
    return { actionClass: "install", risk: "high" };
  if (/\b(systemctl|ufw|iptables|nft|update-alternatives|chown|chmod\s+-R)\b|\/etc\//.test(c)) return { actionClass: "system_config", risk: "high" };
  if (/\brm\s+(-[a-zA-Z]*[rf]|--recursive|--force)|\bgit\s+(reset\s+--hard|clean\s+-[a-z]*f|checkout\s+--)\b/.test(c))
    return { actionClass: "edit_file", risk: "high" };
  if (/\b(curl|wget|scp|rsync|ssh)\b|\bgit\s+push\b/.test(c)) return { actionClass: "external", risk: "medium" };
  if (/\b(npm|pnpm|yarn|bun|composer)\s+(i|install|add|remove|update)\b/.test(c)) return { actionClass: "project_config", risk: "medium" };
  if (/^\s*(ls|pwd|cat|git\s+(status|log|diff|branch))\b/.test(c)) return { actionClass: "read", risk: "low" };
  return { actionClass: "run_process", risk: "medium" };
}

export function makeAction(
  a: Omit<ProposedAction, "id" | "operation" | "risk"> & { risk?: ProposedAction["risk"] | undefined },
): ProposedAction {
  const info = CLASS_INFO[a.actionClass];
  return { id: uid("act"), operation: info.operation, risk: a.risk ?? info.risk, ...a } as ProposedAction;
}

export function commandAction(command: string, reason: string, cwd: string): ProposedAction {
  const { actionClass, risk } = classifyCommand(command);
  return makeAction({
    actionClass: actionClass === "read" ? "run_process" : actionClass,
    risk,
    title: "Run a terminal command",
    target: cwd,
    reason,
    files: [],
    command,
    effect:
      actionClass === "elevated"
        ? "Runs with administrator rights. You will be asked for your password by the system, never by P."
        : actionClass === "install"
          ? "Installs or removes software on this machine."
          : "Runs in the workspace terminal and prints its output.",
  });
}
