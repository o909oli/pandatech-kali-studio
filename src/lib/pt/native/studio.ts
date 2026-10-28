/**
 * NATIVE STUDIO INTEGRATION — implemented by Copilot.
 *
 * Every method fails closed until it is wired to the real workspace,
 * Git, PTY, debug adapter, extension host and test runner.
 * See docs/STUDIO_INTEGRATION.md.
 */
import type { ActionResult, Sourced } from "../types";
import type { StudioIntegration } from "../studio/types";

const off = <T,>(): Sourced<T> => ({
  source: "unavailable",
  data: null,
  updatedAt: Date.now(),
  error: "Native Studio integration is not connected yet.",
});
const refuse = (): ActionResult => ({
  ok: false,
  confirmedByNative: false,
  message: "Native Studio integration is not connected. Nothing was changed.",
});

export const nativeStudio: StudioIntegration = {
  mode: "native",
  status: () => ({ workspace: "unavailable", git: "unavailable", terminal: "unavailable", debug: "unavailable", extensions: "unavailable", tests: "unavailable" }),
  workspace: {
    current: async () => off(),
    recent: async () => off(),
    templates: async () => off(),
    tree: async () => off(),
    read: async () => off(),
    write: async () => refuse(),
  },
  diagnostics: async () => off(),
  git: { status: async () => off(), original: async () => off() },
  terminal: { profiles: async () => off(), run: async () => off() },
  debug: { configs: async () => off(), script: async () => off() },
  extensions: { list: async () => off(), tools: async () => off() },
  tests: { list: async () => off(), run: async () => off() },
  execute: async () => refuse(),
};
