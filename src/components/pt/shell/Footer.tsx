import { usePolled } from "@/lib/pt/integration";
import { useDesktop } from "@/lib/pt/store";
import { SourceBadge } from "@/components/pt/ui/bits";
import { formatBytes } from "@/lib/pt/format";

export function Footer() {
  const mode = useDesktop((s) => s.mode);
  const { result } = usePolled((i) => i.system.getMetrics(), 2000);
  const m = result?.data;
  return (
    <footer className="absolute inset-x-0 bottom-0 z-20 flex h-7 items-center gap-4 border-t border-line bg-deep/85 px-4 font-display text-[10.5px] tracking-[0.12em] text-text-3 backdrop-blur">
      <span className="uppercase">
        <span className="text-text-2">Pandatechs Enterprises</span>
        <span className="mx-2 text-line-strong">|</span>
        Built for professionals. Designed for excellence.
      </span>
      <span className="ml-auto flex items-center gap-4 tracking-wider">
        {m && (
          <>
            <span>CPU <b className="font-semibold text-text-2">{m.cpuPercent.toFixed(0)}%</b></span>
            <span>MEM <b className="font-semibold text-text-2">{formatBytes(m.memUsedBytes, 1)}</b></span>
          </>
        )}
        <span>panda@pandatechs</span>
        <SourceBadge source={mode === "demo" ? "sample" : result?.source ?? "unavailable"} />
      </span>
    </footer>
  );
}
