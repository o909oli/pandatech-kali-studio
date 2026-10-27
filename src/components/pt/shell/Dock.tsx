import { useRouterState } from "@tanstack/react-router";
import { LayoutGrid } from "lucide-react";
import { AppGlyph } from "@/components/pt/ui/AppGlyph";
import { PAvatar } from "@/components/pt/ui/Brand";
import { INTERNAL_APPS, useOpenApp } from "@/lib/pt/apps";
import { closeOverlays, useDesktop } from "@/lib/pt/store";
import { cn } from "@/lib/utils";

export function Dock() {
  const favs = useDesktop((s) => s.dockFavorites);
  const aState = useDesktop((s) => s.assistantState);
  const launcherOpen = useDesktop((s) => s.launcherOpen);
  const open = useOpenApp();
  const path = useRouterState({ select: (r) => r.location.pathname });

  return (
    <nav aria-label="Dock" className="pointer-events-none absolute inset-x-0 bottom-8 z-30 flex justify-center">
      <ul className="dock-surface pointer-events-auto flex items-end gap-2.5 rounded-2xl px-3.5 pb-2 pt-2.5">
        {favs.map((id) => {
          const app = INTERNAL_APPS[id as keyof typeof INTERNAL_APPS];
          if (!app) return null;
          const active = app.path === path && id !== "browser";
          return (
            <li key={id} className="group relative">
              <button
                type="button"
                onClick={() => open(id)}
                aria-label={app.title}
                aria-current={active ? "page" : undefined}
                className="block origin-bottom transition-transform duration-150 ease-out group-hover:-translate-y-1.5 group-hover:scale-110"
              >
                {id === "assistant" ? (
                  <span className="grid size-12 place-items-center rounded-xl border border-line-strong bg-gradient-to-b from-surface to-deep">
                    <PAvatar size={40} state={aState} />
                  </span>
                ) : (
                  <AppGlyph icon={app.icon} size="lg" />
                )}
              </button>
              <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md border border-line-strong bg-elevated px-2 py-0.5 text-[11px] text-text opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                {app.title}
              </span>
              <span className={cn("mx-auto mt-1 block h-1 w-1 rounded-full transition-all", active ? "w-4 bg-cyan glow" : "bg-transparent")} />
            </li>
          );
        })}
        <li className="mx-0.5 self-stretch border-l border-line" aria-hidden />
        <li className="group relative">
          <button
            type="button"
            onClick={() => (launcherOpen ? closeOverlays() : closeOverlays("launcherOpen"))}
            aria-label="Show all applications"
            className="grid size-12 origin-bottom place-items-center rounded-xl border border-line bg-elevated/60 text-text-2 transition-transform duration-150 group-hover:-translate-y-1.5 group-hover:scale-110 group-hover:text-cyan"
          >
            <LayoutGrid className="size-5" />
          </button>
          <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md border border-line-strong bg-elevated px-2 py-0.5 text-[11px] text-text opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
            All applications
          </span>
          <span className="mx-auto mt-1 block h-1 w-1" />
        </li>
      </ul>
    </nav>
  );
}
