import { useEffect, useRef, useState } from "react";
import type { AssistantProvider, Integration, Sourced } from "./types";
import { demoIntegration } from "./demo";
import { nativeIntegration } from "./native";
import { useDesktop } from "./store";
import { brainAssistant } from "./brain";

/**
 * Single switch for demo vs native. Components never branch on the mode —
 * they call the Integration and render the `source` badge it returns.
 */
export function getIntegration(mode: "demo" | "native"): Integration {
  return mode === "native" ? nativeIntegration : (demoIntegration as Integration);
}

export function useIntegration(): Integration {
  const mode = useDesktop((s) => s.mode);
  return getIntegration(mode);
}

export const DEMO_PROVIDER: AssistantProvider = demoIntegration.assistants["demo"]!;

/** Assistant providers are independent of the data mode: demo + local model are always offered. */
export const ASSISTANT_PROVIDERS: Record<string, AssistantProvider> = {
  brain: brainAssistant,
  ...demoIntegration.assistants,
  ...nativeIntegration.assistants,
};

export function useAssistantProvider(): AssistantProvider {
  const id = useDesktop((s) => s.assistantProvider);
  return ASSISTANT_PROVIDERS[id] ?? DEMO_PROVIDER;
}

/** Poll a provider call. Keeps the last good value while refreshing. */
export function usePolled<T>(
  fetcher: (i: Integration) => Promise<Sourced<T>>,
  intervalMs = 0,
  deps: unknown[] = [],
): { result: Sourced<T> | null; loading: boolean; refresh: () => void } {
  const integration = useIntegration();
  const [result, setResult] = useState<Sourced<T> | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const fetchRef = useRef(fetcher);
  fetchRef.current = fetcher;

  useEffect(() => {
    let alive = true;
    const run = async () => {
      try {
        const r = await fetchRef.current(integration);
        if (alive) setResult(r);
      } catch (e) {
        if (alive)
          setResult({
            source: "error",
            data: null,
            updatedAt: Date.now(),
            error: e instanceof Error ? e.message : "Unknown error",
          });
      } finally {
        if (alive) setLoading(false);
      }
    };
    setLoading(true);
    void run();
    if (!intervalMs) return () => void (alive = false);
    const id = setInterval(run, intervalMs);
    return () => {
      alive = false;
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [integration, intervalMs, tick, ...deps]);

  return { result, loading, refresh: () => setTick((t) => t + 1) };
}
