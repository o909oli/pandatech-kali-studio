import { useId, type ReactNode } from "react";
import { CircleAlert, Database, PlugZap } from "lucide-react";
import type { DataSource } from "@/lib/pt/types";
import { cn } from "@/lib/utils";

/** Shows where data came from. Live data shows a small green dot only. */
export function SourceBadge({ source, className }: { source?: DataSource | undefined; className?: string | undefined }) {
  if (!source) return null;
  const map: Record<DataSource, { label: string; cls: string }> = {
    live: { label: "Live", cls: "border-success/40 text-success" },
    sample: { label: "Sample", cls: "border-warning/40 text-warning" },
    unavailable: { label: "Not connected", cls: "border-line-strong text-text-3" },
    error: { label: "Error", cls: "border-danger/50 text-danger" },
  };
  const m = map[source];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-1.5 py-px font-display text-[9px] font-semibold uppercase tracking-[0.14em]",
        m.cls,
        className,
      )}
      title={source === "sample" ? "Sample data from the demo provider" : undefined}
    >
      <span className={cn("size-1 rounded-full bg-current", source === "live" && "animate-breathe")} />
      {m.label}
    </span>
  );
}

export function Panel({
  title,
  icon,
  source,
  actions,
  children,
  className,
  bodyClassName,
}: {
  title: ReactNode;
  icon?: ReactNode | undefined;
  source?: DataSource | undefined;
  actions?: ReactNode | undefined;
  children: ReactNode;
  className?: string | undefined;
  bodyClassName?: string | undefined;
}) {
  return (
    <section className={cn("panel flex min-h-0 flex-col overflow-hidden", className)}>
      <header className="flex h-9 shrink-0 items-center gap-2 border-b border-line px-3">
        {icon && <span className="text-cyan [&_svg]:size-3.5">{icon}</span>}
        <h3 className="hud-label !text-text-2 truncate">{title}</h3>
        <SourceBadge source={source} className="ml-1" />
        <div className="ml-auto flex items-center gap-1">{actions}</div>
      </header>
      <div className={cn("min-h-0 flex-1", bodyClassName)}>{children}</div>
    </section>
  );
}

export function Sparkline({
  data,
  max,
  className,
  tone = "cyan",
  fill = true,
  height = 48,
}: {
  data: number[];
  max?: number | undefined;
  className?: string | undefined;
  tone?: "cyan" | "electric" | "violet" | "success" | "warning";
  fill?: boolean | undefined;
  height?: number | undefined;
}) {
  const id = useId().replace(/:/g, "");
  const W = 200;
  const top = max ?? Math.max(1, ...data) * 1.1;
  const pts = data.map((v, i) => [(i / Math.max(1, data.length - 1)) * W, height - (v / top) * (height - 2) - 1]);
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${(x ?? 0).toFixed(1)},${(y ?? 0).toFixed(1)}`).join(" ");
  const color = `var(--pt-${tone})`;
  return (
    <svg viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="none" className={cn("block w-full", className)} style={{ height }}>
      <defs>
        <linearGradient id={`g${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.38" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map((f) => (
        <line key={f} x1="0" x2={W} y1={height * f} y2={height * f} stroke="var(--pt-cyan)" strokeOpacity="0.06" />
      ))}
      {fill && data.length > 1 && <path d={`${line} L${W},${height} L0,${height} Z`} fill={`url(#g${id})`} />}
      {data.length > 1 && <path d={line} fill="none" stroke={color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />}
    </svg>
  );
}

export function Meter({ value, tone = "electric", className }: { value: number; tone?: "electric" | "cyan" | "success" | "warning" | "danger" | "violet"; className?: string | undefined }) {
  const bg = { electric: "bg-electric", cyan: "bg-cyan", success: "bg-success", warning: "bg-warning", danger: "bg-danger", violet: "bg-violet" }[tone];
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-deep/80 ring-1 ring-line", className)}>
      <div className={cn("h-full rounded-full transition-[width] duration-700", bg)} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}

export function Ring({ value, size = 64, label, tone = "cyan" }: { value: number; size?: number | undefined; label?: ReactNode | undefined; tone?: "cyan" | "electric" | "violet" | "success" | "warning" | "ice" }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  return (
    <span className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg viewBox="0 0 64 64" width={size} height={size} className="-rotate-90">
        <circle cx="32" cy="32" r={r} fill="none" stroke="var(--pt-line)" strokeWidth="5" />
        <circle
          cx="32" cy="32" r={r} fill="none" stroke={`var(--pt-${tone})`} strokeWidth="5" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(100, value) / 100)}
          style={{ transition: "stroke-dashoffset .7s ease", filter: "drop-shadow(0 0 4px var(--pt-glow))" }}
        />
      </svg>
      <span className="absolute text-center font-display text-sm font-semibold text-text">{label ?? `${Math.round(value)}%`}</span>
    </span>
  );
}

export function EmptyState({
  title,
  body,
  kind = "empty",
  action,
}: {
  title: string;
  body?: string | undefined;
  kind?: "empty" | "unavailable" | "error";
  action?: ReactNode | undefined;
}) {
  const Icon = kind === "error" ? CircleAlert : kind === "unavailable" ? PlugZap : Database;
  return (
    <div className="flex h-full min-h-24 flex-col items-center justify-center gap-2 p-4 text-center">
      <Icon className={cn("size-6", kind === "error" ? "text-danger" : "text-text-3")} strokeWidth={1.5} />
      <p className="text-sm font-medium text-text-2">{title}</p>
      {body && <p className="max-w-xs text-xs text-text-3">{body}</p>}
      {action}
    </div>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded border border-line-strong bg-deep/70 px-1.5 py-px font-mono text-[10px] text-text-2">{children}</kbd>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-5 w-9 shrink-0 rounded-full border transition-colors",
        checked ? "border-cyan/60 bg-electric" : "border-line-strong bg-deep",
      )}
    >
      <span className={cn("absolute top-0.5 size-3.5 rounded-full bg-text shadow transition-transform", checked ? "translate-x-[18px]" : "translate-x-0.5")} />
    </button>
  );
}
