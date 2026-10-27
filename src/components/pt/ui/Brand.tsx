import wordmark from "@/assets/pandatechs-wordmark.webp";
import emblem from "@/assets/panda-emblem.webp";
import pAvatar from "@/assets/p-avatar.webp";
import { cn } from "@/lib/utils";
import type { AssistantState } from "@/lib/pt/types";

export function Wordmark({ className }: { className?: string | undefined }) {
  return <img src={wordmark} alt="Pandatechs Enterprises" className={cn("h-10 w-auto select-none", className)} draggable={false} />;
}

export function Emblem({ className, glow }: { className?: string | undefined; glow?: boolean | undefined }) {
  return (
    <img
      src={emblem}
      alt=""
      aria-hidden
      draggable={false}
      className={cn("size-8 select-none rounded-full", glow && "glow", className)}
    />
  );
}

/**
 * The "P" assistant mark: a hex-cut ring with a stylised P and a state-driven
 * aura. Drawn in SVG so it is crisp at every size.
 */
export function PMark({
  size = 40,
  state = "idle",
  className,
}: {
  size?: number | undefined;
  state?: AssistantState | undefined;
  className?: string | undefined;
}) {
  const busy = state === "thinking" || state === "working" || state === "responding";
  const tone =
    state === "error" || state === "offline"
      ? "var(--pt-danger)"
      : state === "approval"
        ? "var(--pt-warning)"
        : state === "done"
          ? "var(--pt-success)"
          : state === "listening"
            ? "var(--pt-violet)"
            : "var(--pt-cyan)";
  return (
    <span className={cn("relative inline-grid shrink-0 place-items-center", className)} style={{ width: size, height: size }}>
      {(state === "listening" || state === "approval") && (
        <span className="animate-pulse-ring absolute inset-0 rounded-full border-2" style={{ borderColor: tone }} />
      )}
      <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden className="relative">
        <defs>
          <radialGradient id="p-core" cx="50%" cy="40%" r="60%">
            <stop offset="0" stopColor="var(--pt-surface)" />
            <stop offset="1" stopColor="var(--pt-deep)" />
          </radialGradient>
        </defs>
        <circle cx="24" cy="24" r="22" fill="url(#p-core)" stroke={tone} strokeOpacity="0.35" />
        <g className={busy ? "animate-spin-med" : "animate-spin-slow"} style={{ transformOrigin: "24px 24px" }}>
          <circle cx="24" cy="24" r="19" fill="none" stroke={tone} strokeWidth="2" strokeDasharray="22 8 4 8" strokeLinecap="round" />
        </g>
        <path
          d="M19 33V15h7.2c3.6 0 6 2.3 6 5.6s-2.4 5.6-6 5.6H19"
          fill="none"
          stroke="var(--pt-text)"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="31.5" cy="31.5" r="2" fill={tone} />
      </svg>
    </span>
  );
}

export const ASSISTANT_STATE_LABEL: Record<AssistantState, string> = {
  idle: "Ready",
  listening: "Listening",
  thinking: "Thinking",
  responding: "Responding",
  working: "Working",
  approval: "Waiting for approval",
  done: "Done",
  error: "Something went wrong",
  offline: "Model offline",
};

/** P's face (from the hologram) inside a state-coloured ring. */
export function PAvatar({ size = 36, state = "idle", className }: { size?: number | undefined; state?: AssistantState | undefined; className?: string | undefined }) {
  const ring =
    state === "error" || state === "offline"
      ? "var(--pt-danger)"
      : state === "approval"
        ? "var(--pt-warning)"
        : state === "done"
          ? "var(--pt-success)"
          : state === "listening"
            ? "var(--pt-violet)"
            : "var(--pt-cyan)";
  const busy = state === "thinking" || state === "working" || state === "responding";
  return (
    <span className={cn("relative inline-grid shrink-0 place-items-center", className)} style={{ width: size, height: size }}>
      {(state === "listening" || state === "approval") && (
        <span className="animate-pulse-ring absolute inset-0 rounded-full border-2" style={{ borderColor: ring }} />
      )}
      <svg viewBox="0 0 40 40" className={cn("absolute inset-0", busy ? "animate-spin-med" : "")} aria-hidden>
        <circle cx="20" cy="20" r="18.5" fill="none" stroke={ring} strokeWidth="1.6" strokeDasharray={busy ? "30 10 6 10" : "200"} strokeLinecap="round" />
      </svg>
      <img src={pAvatar} alt="" aria-hidden draggable={false} className="rounded-full object-cover" style={{ width: size - 6, height: size - 6, boxShadow: `0 0 12px -2px ${ring}` }} />
    </span>
  );
}
