import wallpaperPanda from "@/assets/wallpaper-panda.webp";
import wallpaperNetwork from "@/assets/login-network.webp";
import { useDesktop, type WallpaperId } from "@/lib/pt/store";

export const WALLPAPERS: Record<WallpaperId, { label: string; src: string }> = {
  panda: { label: "Panda Guardian", src: wallpaperPanda },
  network: { label: "Network Grid", src: wallpaperNetwork },
};

export function Wallpaper({ dim = 0.35 }: { dim?: number | undefined }) {
  const id = useDesktop((s) => s.wallpaper);
  const brightness = useDesktop((s) => s.brightness);
  return (
    <div className="absolute inset-0 -z-0 overflow-hidden bg-deep" aria-hidden>
      <img src={WALLPAPERS[id].src} alt="" className="h-full w-full object-cover" draggable={false} style={{ filter: `brightness(${0.6 + brightness / 250})` }} />
      <div className="absolute inset-0 bg-gradient-to-b from-deep/55 via-transparent to-deep/80" style={{ opacity: 0.6 + dim }} />
      <div className="grid-backdrop absolute inset-0 opacity-40" />
    </div>
  );
}
