import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Desktop "display". Lays out against a logical canvas of at least
 * 1600×900 and scales to the real viewport, so 1366×768, 1600×900 and
 * 1920×1080 all keep the same composition without clipping.
 */
const BASE_W = 1600;
const BASE_H = 900;

export function useStageScale() {
  const [dims, setDims] = useState({ scale: 1, w: BASE_W, h: BASE_H });
  useEffect(() => {
    const update = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const scale = Math.min(1.5, Math.max(0.5, Math.min(vw / BASE_W, vh / BASE_H)));
      setDims({ scale, w: vw / scale, h: vh / scale });
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return dims;
}

export function Stage({ children, className }: { children: ReactNode; className?: string | undefined }) {
  const { scale, w, h } = useStageScale();
  return (
    <div className="fixed inset-0 overflow-hidden bg-deep">
      <div
        className={cn("relative origin-top-left", className)}
        style={{ width: w, height: h, transform: `scale(${scale})` }}
        data-stage
      >
        {children}
      </div>
    </div>
  );
}
