import { useId } from "react";
import {
  Binary, BookOpen, Bug, Code2, Cog, Download, FileCode2, FileText, Film, Fingerprint, FlaskConical, Folder,
  FolderKanban, Globe, HardDrive, House, Image, KeyRound, LayoutTemplate, Monitor, Music, Network, Package,
  Radar, ScrollText, Search, Server, Share2, ShieldAlert, Skull, Target, Terminal, Trash2, Wifi, Wrench,
  type LucideIcon,
} from "lucide-react";
import type { FolderGlyph } from "@/lib/pt/types";
import { cn } from "@/lib/utils";

export const FOLDER_GLYPHS: Record<FolderGlyph, LucideIcon> = {
  home: House, desktop: Monitor, documents: FileText, downloads: Download, music: Music, pictures: Image,
  videos: Film, templates: LayoutTemplate, public: Share2, projects: FolderKanban, code: Code2, tools: Wrench,
  workspace: FlaskConical, pentest: Target, recon: Radar, exploits: Bug, payloads: Package, wordlists: BookOpen,
  scans: Search, reports: ScrollText, logs: Server, configs: Cog, scripts: Terminal, bruteforce: KeyRound,
  wireless: Wifi, forensics: Fingerprint, malware: Skull, osint: Globe, webapp: FileCode2, trash: Trash2,
  filesystem: HardDrive, drive: HardDrive, network: Network, generic: Folder,
};

/**
 * Original Pandatechs folder icon: layered blue folder with a light glyph.
 * One component renders every folder variant so the family stays consistent.
 */
export function FolderIcon({
  glyph = "generic",
  size = 56,
  className,
  muted,
}: {
  glyph?: FolderGlyph | undefined;
  size?: number | undefined;
  className?: string | undefined;
  muted?: boolean | undefined;
}) {
  const id = useId().replace(/:/g, "");
  const Glyph = FOLDER_GLYPHS[glyph] ?? Folder;
  const isDevice = glyph === "filesystem" || glyph === "drive" || glyph === "network" || glyph === "trash";
  return (
    <span className={cn("relative inline-block shrink-0", muted && "opacity-60", className)} style={{ width: size, height: size }}>
      <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden className="block">
        <defs>
          <linearGradient id={`b${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--pt-electric)" />
            <stop offset="1" stopColor="oklch(0.45 0.17 258)" />
          </linearGradient>
          <linearGradient id={`f${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="oklch(0.78 0.14 232)" />
            <stop offset="1" stopColor="var(--pt-electric)" />
          </linearGradient>
          <linearGradient id={`d${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--pt-surface)" />
            <stop offset="1" stopColor="var(--pt-deep)" />
          </linearGradient>
        </defs>
        {isDevice ? (
          <>
            <rect x="8" y="12" width="48" height="40" rx="7" fill={`url(#d${id})`} stroke="var(--pt-cyan)" strokeOpacity="0.55" />
            <rect x="12" y="44" width="40" height="3" rx="1.5" fill="var(--pt-cyan)" opacity="0.35" />
          </>
        ) : (
          <>
            <path d="M6 16a5 5 0 0 1 5-5h12.5a4 4 0 0 1 3 1.4l3 3.4a4 4 0 0 0 3 1.3H53a5 5 0 0 1 5 5V48a5 5 0 0 1-5 5H11a5 5 0 0 1-5-5Z" fill={`url(#b${id})`} />
            <rect x="9" y="19" width="46" height="4" rx="2" fill="var(--pt-ice)" opacity="0.6" />
            <path d="M6 26a5 5 0 0 1 5-5h42a5 5 0 0 1 5 5v22a5 5 0 0 1-5 5H11a5 5 0 0 1-5-5Z" fill={`url(#f${id})`} />
            <path d="M8 24.5h48" stroke="white" strokeOpacity="0.35" strokeWidth="1" />
          </>
        )}
      </svg>
      <Glyph
        className="absolute left-1/2 -translate-x-1/2 text-ice drop-shadow-[0_1px_2px_oklch(0.2_0.1_258/0.6)]"
        style={{ width: size * 0.32, height: size * 0.32, top: isDevice ? size * 0.3 : size * 0.47 }}
        strokeWidth={2}
      />
    </span>
  );
}

export function FileIcon({ ext = "", size = 56 }: { ext?: string | undefined; size?: number | undefined }) {
  const Icon: LucideIcon =
    ext === "sh" ? Terminal : ["ts", "js", "py", "json"].includes(ext) ? Code2 : ["png", "jpg", "svg", "webp"].includes(ext) ? Image : ext === "zip" ? Package : ext === "pcap" ? Binary : FileText;
  return (
    <span className="relative inline-grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden>
        <path d="M16 6h22l12 12v36a4 4 0 0 1-4 4H16a4 4 0 0 1-4-4V10a4 4 0 0 1 4-4Z" fill="var(--pt-elevated)" stroke="var(--pt-cyan)" strokeOpacity="0.45" />
        <path d="M38 6v8a4 4 0 0 0 4 4h8" fill="none" stroke="var(--pt-cyan)" strokeOpacity="0.45" />
      </svg>
      <Icon className="absolute text-cyan" style={{ width: size * 0.3, height: size * 0.3, top: size * 0.4 }} strokeWidth={1.75} />
      {ext && (
        <span className="absolute bottom-[14%] font-mono text-[9px] uppercase tracking-wider text-text-2" style={{ fontSize: Math.max(8, size * 0.13) }}>
          {ext}
        </span>
      )}
    </span>
  );
}
