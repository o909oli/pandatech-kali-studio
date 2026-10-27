import { useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Maximize2, Minimize2, Minus, X } from "lucide-react";
import { AppGlyph } from "@/components/pt/ui/AppGlyph";
import { SourceBadge } from "@/components/pt/ui/bits";
import type { DataSource } from "@/lib/pt/types";
import { cn } from "@/lib/utils";

/** Window chrome shared by every app route. Close/minimise return to the desktop. */
export function AppWindow({
  title,
  icon,
  source,
  toolbar,
  children,
  className,
  bodyClassName,
}: {
  title: string;
  icon: string;
  source?: DataSource | undefined;
  toolbar?: ReactNode | undefined;
  children: ReactNode;
  className?: string | undefined;
  bodyClassName?: string | undefined;
}) {
  const navigate = useNavigate();
  const [max, setMax] = useState(false);
  const back = () => void navigate({ to: "/desktop" });
  return (
    <div className={cn("absolute inset-x-0 top-0 bottom-[7.25rem] flex justify-center px-6 pb-2 pt-3", max && "!px-2")}>
      <section
        aria-label={title}
        className={cn("window-surface animate-rise flex h-full w-full flex-col overflow-hidden rounded-xl", max ? "max-w-none" : "max-w-[1500px]", className)}
      >
        <header className="flex h-10 shrink-0 items-center gap-3 border-b border-line bg-deep/60 px-3">
          <AppGlyph icon={icon} size="sm" />
          <h1 className="font-display text-[13px] font-semibold tracking-wide text-text">{title}</h1>
          <SourceBadge source={source} />
          <div className="ml-4 flex min-w-0 flex-1 items-center gap-2">{toolbar}</div>
          <div className="flex items-center gap-1">
            <button type="button" aria-label="Minimise to desktop" onClick={back} className="grid size-6 place-items-center rounded text-text-3 hover:bg-surface hover:text-text">
              <Minus className="size-3.5" />
            </button>
            <button type="button" aria-label={max ? "Restore window" : "Maximise window"} onClick={() => setMax((m) => !m)} className="grid size-6 place-items-center rounded text-text-3 hover:bg-surface hover:text-text">
              {max ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
            </button>
            <button type="button" aria-label="Close and return to desktop" onClick={back} className="grid size-6 place-items-center rounded text-text-3 hover:bg-danger/80 hover:text-primary-foreground">
              <X className="size-3.5" />
            </button>
          </div>
        </header>
        <div className={cn("min-h-0 flex-1", bodyClassName)}>{children}</div>
      </section>
    </div>
  );
}
