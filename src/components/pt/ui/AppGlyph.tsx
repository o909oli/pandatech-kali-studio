import {
  Activity, Bot, Bug, Cable, ClipboardCheck, Code2, Cpu, Database, FileText, Folder, Globe, HardDrive, Hash,
  KeyRound, LayoutGrid, MapPin, MemoryStick, Network, NotebookPen, Radar, Radio, Search, Settings, Share2, Shield,
  Target, Terminal, Users, Waves, Wifi, Zap, type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const ICONS: Record<string, LucideIcon> = {
  folder: Folder, terminal: Terminal, code: Code2, notebook: NotebookPen, activity: Activity, network: Network,
  shield: Shield, bot: Bot, settings: Settings, layout: LayoutGrid, globe: Globe, radar: Radar, waves: Waves,
  search: Search, share: Share2, bug: Bug, clipboard: ClipboardCheck, zap: Zap, database: Database, target: Target,
  cable: Cable, key: KeyRound, hash: Hash, wifi: Wifi, radio: Radio, "hard-drive": HardDrive, memory: MemoryStick,
  "map-pin": MapPin, "file-text": FileText, cpu: Cpu, users: Users,
};

/** A rounded app tile in the Pandatechs style: dark glass, cyan line, glowing glyph. */
export function AppGlyph({
  icon,
  size = "md",
  tone = "electric",
  className,
}: {
  icon: string;
  size?: "sm" | "md" | "lg" | "xl";
  tone?: "electric" | "cyan" | "violet" | "success" | "warning" | "danger";
  className?: string | undefined;
}) {
  const Icon = ICONS[icon] ?? LayoutGrid;
  const box = { sm: "size-7 rounded-md", md: "size-10 rounded-lg", lg: "size-12 rounded-xl", xl: "size-16 rounded-2xl" }[size];
  const glyph = { sm: "size-3.5", md: "size-5", lg: "size-6", xl: "size-8" }[size];
  const color = {
    electric: "text-electric", cyan: "text-cyan", violet: "text-violet",
    success: "text-success", warning: "text-warning", danger: "text-danger",
  }[tone];
  return (
    <span
      className={cn(
        "relative inline-grid shrink-0 place-items-center border border-line-strong bg-gradient-to-b from-surface to-deep",
        box,
        className,
      )}
    >
      <span className="absolute inset-x-1 top-0 h-px bg-gradient-to-r from-transparent via-cyan/50 to-transparent" />
      <Icon className={cn(glyph, color, "drop-shadow-[0_0_6px_currentColor]")} strokeWidth={1.75} />
    </span>
  );
}
