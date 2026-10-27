import { createFileRoute, Outlet } from "@tanstack/react-router";
import { Stage } from "@/components/pt/ui/Stage";
import { TopPanel } from "@/components/pt/shell/TopPanel";
import { Dock } from "@/components/pt/shell/Dock";
import { Footer } from "@/components/pt/shell/Footer";
import { Overlays } from "@/components/pt/shell/Overlays";
import { Wallpaper } from "@/components/pt/shell/Wallpaper";
import { useNavigateEvents } from "@/lib/pt/apps";

export const Route = createFileRoute("/_shell")({
  component: ShellLayout,
});

function ShellLayout() {
  useNavigateEvents();
  return (
    <Stage>
      <Wallpaper />
      <div className="relative z-10 flex h-full flex-col">
        <TopPanel />
        <main className="relative min-h-0 flex-1">
          <Outlet />
        </main>
      </div>
      <Dock />
      <Footer />
      <Overlays />
    </Stage>
  );
}
