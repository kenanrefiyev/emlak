"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import type { LatLng } from "@/lib/baku-geo";

export interface NearbyMarker {
  id: string;
  href: string;
  title: string;
  price: string;
  image: string | null;
}

interface Props {
  center: LatLng;
  points: (NearbyMarker & { position: LatLng })[];
  labels: { thisListing: string; approxArea: string; open: string };
}

const esc = (s: string) => s.replace(/[&<>"']/g, (ch) => `&#${ch.charCodeAt(0)};`);

/**
 * Leaflet map of the listing's approximate area (a circle, never a pin on the
 * address) plus price markers for nearby listings. Leaflet touches `window`,
 * so it is loaded only in the browser.
 */
export function NearbyMap({ center, points, labels }: Props) {
  const el = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let map: import("leaflet").Map | undefined;
    let cancelled = false;
    import("leaflet").then((L) => {
      if (cancelled || !el.current) return;
      map = L.map(el.current, { scrollWheelZoom: false, zoomControl: true }).setView(center, 14);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);

      L.circle(center, { radius: 450, color: "#1563df", weight: 2, fillColor: "#1563df", fillOpacity: 0.15 })
        .addTo(map)
        .bindTooltip(`${esc(labels.thisListing)} · ${esc(labels.approxArea)}`, { direction: "top" });
      L.marker(center, {
        icon: L.divIcon({ className: "nearby-pin nearby-pin--self", html: `<span>${esc(labels.thisListing)}</span>`, iconSize: undefined, iconAnchor: [0, 0] }),
        interactive: false,
        keyboard: false,
        zIndexOffset: 1000,
      }).addTo(map);

      const bounds = L.latLngBounds([center]);
      for (const p of points) {
        const icon = L.divIcon({
          className: "nearby-pin",
          html: `<span>${esc(p.price)}</span>`,
          iconSize: undefined,
          iconAnchor: [0, 0],
        });
        const img = p.image ? `<img src="${esc(p.image)}" alt="" loading="lazy">` : "";
        L.marker(p.position, { icon, title: p.title, alt: `${p.title}, ${p.price}`, keyboard: true })
          .addTo(map)
          .bindPopup(
            `<a class="nearby-pop" href="${esc(p.href)}">${img}<strong>${esc(p.title)}</strong><span>${esc(p.price)} · ${esc(labels.open)} →</span></a>`,
            { maxWidth: 240, minWidth: 200 },
          );
        bounds.extend(p.position);
      }
      if (points.length) map.fitBounds(bounds.pad(0.15), { maxZoom: 15 });
    });
    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [center, points, labels]);

  return <div ref={el} className="nearby-map relative z-0 h-[380px] w-full overflow-hidden rounded-2xl border border-line bg-mist sm:h-[440px]" />;
}
