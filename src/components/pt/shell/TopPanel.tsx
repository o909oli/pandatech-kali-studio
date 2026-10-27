import { useEffect, useState } from "react";
import { Bell, Bluetooth, BluetoothOff, Search, Volume2, Wifi, WifiOff } from "lucide-react";
import { Emblem, PAvatar } from "@/components/pt/ui/Brand";
import { Kbd } from "@/components/pt/ui/bits";
import { closeOverlays, setDesktop, useDesktop } from "@/lib/pt/store";
import { useOpenApp } from "@/lib/pt/apps";
import { cn } from "@/lib/utils";

function Clock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 15_000);
    return () => clearInterval(id);
  }, []);
  if (!now) return <span className="w-28" />;
  return (
    <span className="flex items-baseline gap-2 font-display tabular-nums">
      <span className="text-[13px] font-semibold text-text">
        {now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
      </span>
      <span className="text-[11px] text-text-3">{now.toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" })}</span>
    </span>
  );
}

const TrayButton = ({ active, onClick, label, children, badge }: { active?: boolean; onClick: () => void; label: string; children: React.ReactNode; badge?: number }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={label}
    title={label}
    className={cn(
      "relative grid h-7 min-w-7 place-items-center rounded-md px-1.5 text-text-2 transition-colors hover:bg-surface/70 hover:text-text [&_svg]:size-4",
      active && "bg-surface/80 text-cyan",
    )}
  >
    {children}
    {badge ? (
      <span className="absolute -right-0.5 -top-0.5 grid size-3.5 place-items-center rounded-full bg-danger font-display text-[9px] font-bold text-primary-foreground">
        {badge}
      </span>
    ) : null}
  </button>
);

export function TopPanel() {
  const s = useDesktop((x) => x);
  const open = useOpenApp();
  const unread = s.notifications.filter((n) => !n.read).length;

  return (
    <header className="topbar-surface relative z-40 flex h-9 shrink-0 items-center gap-1 px-2.5">
      <button
        type="button"
        onClick={() => (s.launcherOpen ? closeOverlays() : closeOverlays("launcherOpen"))}
        className={cn(
          "flex h-7 items-center gap-2 rounded-md px-1.5 pr-2.5 transition-colors hover:bg-surface/70",
          s.launcherOpen && "bg-surface/80",
        )}
        aria-label="Applications menu"
      >
        <Emblem className="size-5" />
        <span className="font-display text-[12px] font-semibold tracking-wide text-text">Applications</span>
      </button>

      <div className="mx-1 h-4 w-px bg-line" />
      <div className="flex items-center gap-0.5" role="group" aria-label="Workspaces">
        {[1, 2, 3, 4].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setDesktop({ workspace: n })}
            aria-pressed={s.workspace === n}
            aria-label={`Workspace ${n}`}
            className={cn(
              "grid size-6 place-items-center rounded font-display text-[11px] font-semibold transition-colors",
              s.workspace === n ? "bg-electric/25 text-cyan ring-1 ring-cyan/50" : "text-text-3 hover:bg-surface/60 hover:text-text",
            )}
          >
            {n}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => closeOverlays("paletteOpen")}
        className="mx-auto flex h-7 w-[26rem] items-center gap-2 rounded-md border border-line bg-deep/60 px-2.5 text-left text-xs text-text-3 transition-colors hover:border-line-strong hover:text-text-2"
        aria-label="Open command palette"
      >
        <Search className="size-3.5" />
        <span className="flex-1">Search apps, files, settings or ask P…</span>
        <Kbd>Ctrl K</Kbd>
      </button>

      <div className="flex items-center gap-0.5">
        <TrayButton label={s.wifi ? "Wi-Fi on" : "Wi-Fi off"} onClick={() => setDesktop({ wifi: !s.wifi })}>
          {s.wifi ? <Wifi /> : <WifiOff />}
        </TrayButton>
        <TrayButton label={s.bluetooth ? "Bluetooth on" : "Bluetooth off"} onClick={() => setDesktop({ bluetooth: !s.bluetooth })} active={s.bluetooth}>
          {s.bluetooth ? <Bluetooth /> : <BluetoothOff />}
        </TrayButton>
        <TrayButton label="Quick settings" active={s.quickOpen} onClick={() => (s.quickOpen ? closeOverlays() : closeOverlays("quickOpen"))}>
          <Volume2 />
        </TrayButton>
        <TrayButton label="Notifications" active={s.notifOpen} badge={s.dnd ? 0 : unread} onClick={() => (s.notifOpen ? closeOverlays() : closeOverlays("notifOpen"))}>
          <Bell />
        </TrayButton>
        <button
          type="button"
          onClick={() => setDesktop({ assistantOpen: !s.assistantOpen })}
          aria-label="Toggle P assistant"
          title="P — Personal AI"
          className={cn("ml-0.5 grid h-7 place-items-center rounded-md px-1 hover:bg-surface/70", s.assistantOpen && "bg-surface/80")}
        >
          <PAvatar size={26} state={s.assistantState} />
        </button>
        <div className="mx-1.5 h-4 w-px bg-line" />
        <Clock />
        <button
          type="button"
          onClick={() => open("settings")}
          className="ml-2 flex items-center gap-1.5 rounded-md py-0.5 pl-0.5 pr-2 hover:bg-surface/70"
          aria-label="Account settings"
        >
          <span className="grid size-6 place-items-center rounded-full bg-gradient-to-b from-electric to-surface font-display text-[11px] font-bold text-text ring-1 ring-cyan/40">
            P
          </span>
          <span className="text-xs font-medium text-text-2">panda</span>
        </button>
      </div>
    </header>
  );
}
