import { useEffect, useRef } from "react";
import type * as Leaflet from "leaflet";
import "leaflet/dist/leaflet.css";
import { cn } from "@/lib/utils";

export interface MapPoint {
  id: string;
  lat: number;
  lng: number;
  accuracy: number | null;
  label: string;
  live: boolean;
}

/**
 * Dark neon map. Leaflet touches `window` on import, so it is loaded only in
 * the browser after mount.
 */
export function LocationMap({
  points,
  trail,
  selectedId,
  onSelect,
  className,
}: {
  points: MapPoint[];
  trail: [number, number][];
  selectedId: string | null;
  onSelect?: (id: string) => void;
  className?: string | undefined;
}) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<Leaflet.Map | null>(null);
  const L = useRef<typeof Leaflet | null>(null);
  const layer = useRef<Leaflet.LayerGroup | null>(null);
  const fittedFor = useRef<string | null>(null);
  const ready = useRef<() => void>(() => {});

  const draw = () => {
    const lib = L.current;
    const m = map.current;
    const g = layer.current;
    if (!lib || !m || !g) return;
    g.clearLayers();
    if (trail.length > 1) {
      lib.polyline(trail, { className: "pt-map-trail", weight: 3, opacity: 0.85 }).addTo(g);
    }
    for (const p of points) {
      const selected = p.id === selectedId;
      if (p.accuracy && selected) {
        lib.circle([p.lat, p.lng], { radius: p.accuracy, className: "pt-map-accuracy", weight: 1 }).addTo(g);
      }
      const icon = lib.divIcon({
        className: "",
        html: `<span class="pt-map-pin ${p.live ? "is-live" : ""} ${selected ? "is-selected" : ""}"><span></span></span>`,
        iconSize: [22, 22],
        iconAnchor: [11, 11],
      });
      lib
        .marker([p.lat, p.lng], { icon, title: p.label })
        .on("click", () => onSelect?.(p.id))
        .bindTooltip(p.label, { direction: "top", offset: [0, -10], className: "pt-map-tip" })
        .addTo(g);
    }
    const focus = points.find((p) => p.id === selectedId);
    const key = `${selectedId ?? "all"}:${points.length}`;
    if (fittedFor.current !== key) {
      fittedFor.current = key;
      if (focus) m.setView([focus.lat, focus.lng], Math.max(m.getZoom(), 15));
      else if (points.length > 0) m.fitBounds(lib.latLngBounds(points.map((p) => [p.lat, p.lng])), { padding: [60, 60], maxZoom: 15 });
    } else if (focus && points.length) {
      m.panTo([focus.lat, focus.lng]);
    }
  };
  ready.current = draw;

  useEffect(() => {
    let cancelled = false;
    void import("leaflet").then((mod) => {
      if (cancelled || !el.current || map.current) return;
      const lib = (mod as unknown as { default?: typeof Leaflet }).default ?? (mod as unknown as typeof Leaflet);
      L.current = lib;
      const m = lib.map(el.current, { zoomControl: true, attributionControl: true, worldCopyJump: true }).setView([20, 10], 2);
      lib
        .tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution: "&copy; OpenStreetMap contributors",
        })
        .addTo(m);
      layer.current = lib.layerGroup().addTo(m);
      map.current = m;
      ready.current();
    });
    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
      layer.current = null;
    };
  }, []);

  useEffect(() => {
    draw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points, trail, selectedId]);

  useEffect(() => {
    const ro = new ResizeObserver(() => map.current?.invalidateSize());
    if (el.current) ro.observe(el.current);
    return () => ro.disconnect();
  }, []);

  return <div ref={el} className={cn("pt-map h-full w-full", className)} role="application" aria-label="Map of shared locations" />;
}
