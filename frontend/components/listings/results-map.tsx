"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import { BAKU_CENTER, type LatLng } from "@/lib/baku-geo";
import type { NearbyMarker } from "./nearby-map";

interface Props {
  /** Campus of the university filter, if any. */
  center: LatLng | null;
  points: (NearbyMarker & { position: LatLng })[];
  labels: { open: string; university: string };
}

const esc = (s: string) => s.replace(/[&<>"']/g, (ch) => `&#${ch.charCodeAt(0)};`);

/**
 * Search results on an OpenStreetMap map (same Leaflet setup and pin styles as
 * NearbyMap). Pins sit at area level — metro station, neighborhood or district
 * centre — never at the private address.
 */
export function ResultsMap({ center, points, labels }: Props) {
  const el = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let map: import("leaflet").Map | undefined;
    let cancelled = false;
    import("leaflet").then((L) => {
      if (cancelled || !el.current) return;
      map = L.map(el.current, { scrollWheelZoom: false, zoomControl: true }).setView(center ?? BAKU_CENTER, 13);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);

      const bounds = L.latLngBounds([]);
      if (center) {
        L.marker(center, {
          icon: L.divIcon({ className: "nearby-pin nearby-pin--self", html: `<span>${esc(labels.university)}</span>`, iconSize: undefined, iconAnchor: [0, 0] }),
          interactive: false,
          keyboard: false,
          zIndexOffset: 1000,
        }).addTo(map);
        bounds.extend(center);
      }
      for (const p of points) {
        const icon = L.divIcon({ className: "nearby-pin", html: `<span>${esc(p.price)}</span>`, iconSize: undefined, iconAnchor: [0, 0] });
        const img = p.image ? `<img src="${esc(p.image)}" alt="" loading="lazy">` : "";
        L.marker(p.position, { icon, title: p.title, alt: `${p.title}, ${p.price}`, keyboard: true })
          .addTo(map)
          .bindPopup(`<a class="nearby-pop" href="${esc(p.href)}">${img}<strong>${esc(p.title)}</strong><span>${esc(p.price)} · ${esc(labels.open)} →</span></a>`, {
            maxWidth: 240,
            minWidth: 200,
          });
        bounds.extend(p.position);
      }
      if (bounds.isValid()) map.fitBounds(bounds.pad(0.1), { maxZoom: 15 });
    });
    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [center, points, labels]);

  return <div ref={el} className="nearby-map relative z-0 h-[420px] w-full overflow-hidden rounded-2xl border border-line bg-mist sm:h-[520px]" />;
}
