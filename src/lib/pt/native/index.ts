/**
 * NATIVE INTEGRATION — implemented by GitHub Copilot on the Linux machine.
 *
 * The prototype ships with every method failing closed: it returns an
 * "unavailable" result so the UI shows an honest empty state instead of
 * pretending. Replace each method with a call to the local Pandatechs bridge
 * (default http://127.0.0.1:7421) as described in docs/COPILOT_INTEGRATION.md.
 *
 * Rules that must hold in every implementation:
 *  - Only operations in `lib/pt/policy.ts` are allowed; the bridge re-checks.
 *  - Never return `confirmedByNative: true` unless the bridge verified the effect.
 *  - Never log or persist passwords, tokens or file contents.
 */
import type {
  ActionProposal, ActionResult, Integration, Sourced,
} from "../types";
import { createOllamaProvider } from "./ollama";

export const BRIDGE_URL = "http://127.0.0.1:7421";

const unavailable = <T>(what: string): Promise<Sourced<T>> =>
  Promise.resolve({
    source: "unavailable",
    data: null,
    updatedAt: Date.now(),
    error: `${what}: native bridge is not connected (see docs/COPILOT_INTEGRATION.md).`,
  });

const noAction = async (p?: ActionProposal): Promise<ActionResult> => ({
  ok: false,
  confirmedByNative: false,
  message: `Native bridge is not connected. "${p?.title ?? "Action"}" was not executed.`,
});

export const nativeIntegration: Integration = {
  mode: "native",
  system: {
    // TODO(copilot): GET {BRIDGE_URL}/v1/system/metrics
    getMetrics: () => unavailable("System metrics"),
    // TODO(copilot): GET {BRIDGE_URL}/v1/system/processes
    getProcesses: () => unavailable("Processes"),
  },
  network: {
    // TODO(copilot): GET {BRIDGE_URL}/v1/network/state
    getState: () => unavailable("Network state"),
    // TODO(copilot): GET {BRIDGE_URL}/v1/network/connections
    getConnections: () => unavailable("Connections"),
  },
  files: {
    // TODO(copilot): GET {BRIDGE_URL}/v1/files/places
    places: () => unavailable("Places"),
    // TODO(copilot): GET {BRIDGE_URL}/v1/files/list?path=
    list: () => unavailable("Directory listing"),
    // TODO(copilot): GET {BRIDGE_URL}/v1/files/recent
    recent: () => unavailable("Recent files"),
  },
  launcher: {
    // TODO(copilot): GET {BRIDGE_URL}/v1/apps  (parse .desktop entries)
    listApps: () => unavailable("Applications"),
    // TODO(copilot): POST {BRIDGE_URL}/v1/apps/launch
    launchNative: () => noAction(),
  },
  windows: {
    // TODO(copilot): GET {BRIDGE_URL}/v1/windows  (wmctrl / xdotool / libwnck)
    listWindows: () => unavailable("Windows"),
  },
  security: {
    // TODO(copilot): GET {BRIDGE_URL}/v1/security/firewall
    firewall: () => unavailable("Firewall"),
    events: () => unavailable("Security events"),
    updates: () => unavailable("Updates"),
  },
  notifications: {
    // TODO(copilot): GET {BRIDGE_URL}/v1/notifications
    list: () => unavailable("Notifications"),
  },
  assistants: {
    ollama: createOllamaProvider(),
  },
  speech: {
    available: false,
    listen: async () => {
      throw new Error("Voice input is not configured.");
    },
    speak: async () => {
      throw new Error("Speech output is not configured.");
    },
  },
  bridge: {
    // TODO(copilot): POST {BRIDGE_URL}/v1/actions  (bridge re-validates + asks polkit for elevation)
    execute: (p) => noAction(p),
  },
};
