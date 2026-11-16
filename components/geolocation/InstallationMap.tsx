"use client";
import { useEffect, useRef, useState } from "react";
import type { Map, Marker } from "leaflet";
import "leaflet/dist/leaflet.css";
import { validCoordinates } from "@/lib/geolocation/validation";
type Props = { latitude: number | null; longitude: number | null; onSelect: (lat: number, lng: number) => void; disabled: boolean };
export default function InstallationMap({ latitude, longitude, onSelect, disabled }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<Map | null>(null);
  const marker = useRef<Marker | null>(null);
  const callback = useRef(onSelect);
  const blocked = useRef(disabled);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { callback.current = onSelect; blocked.current = disabled;
    if (disabled) marker.current?.dragging?.disable(); else marker.current?.dragging?.enable();
  }, [onSelect, disabled]);
  useEffect(() => {
    let cancelled = false;
    import("leaflet").then(L => {
      if (cancelled || !container.current) return;
      const m = L.map(container.current, { center: [-39.82, -73.24], zoom: 12, worldCopyJump: true });
      map.current = m;
      const key = process.env.NEXT_PUBLIC_GEOAPIFY_MAP_KEY;
      if (key) L.tileLayer(`https://maps.geoapify.com/v1/tile/osm-carto/{z}/{x}/{y}.png?apiKey=${encodeURIComponent(key)}`, {
        maxZoom: 20, attribution: '<a href="https://www.geoapify.com/">Powered by Geoapify</a> | © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).on("tileerror", () => setError("No se pudo cargar el mapa base. Puedes ingresar coordenadas.")).addTo(m);
      else setError("Mapa base pendiente de configuración. Puedes ingresar coordenadas; la cuadrícula permite seleccionar una posición.");
      m.on("click", e => { if (!blocked.current) callback.current(e.latlng.lat, ((e.latlng.lng + 180) % 360 + 360) % 360 - 180); });
      setReady(true);
    }).catch(() => setError("No se pudo cargar el mapa. Usa las coordenadas manuales."));
    return () => { cancelled = true; map.current?.remove(); map.current = null; marker.current = null; };
  }, []);
  useEffect(() => {
    if (!ready || !map.current) return;
    if (!validCoordinates(latitude, longitude)) { marker.current?.remove(); marker.current = null; return; }
    let cancelled = false;
    import("leaflet").then(L => {
      if (cancelled || !map.current) return;
      const position: [number, number] = [latitude!, longitude!];
      if (!marker.current) {
        marker.current = L.marker(position, { draggable: !blocked.current, keyboard: true, title: "Ubicación fija del punto",
          icon: L.divIcon({ className: "", html: '<span style="display:block;background:#2563eb;border:3px solid white;border-radius:50%;width:24px;height:24px;box-shadow:0 1px 5px #333"></span>', iconSize: [24,24], iconAnchor: [12,12] }) }).addTo(map.current);
        marker.current.on("dragend", () => { const p = marker.current!.getLatLng(); callback.current(p.lat, ((p.lng + 180) % 360 + 360) % 360 - 180); });
      } else marker.current.setLatLng(position);
      map.current.panTo(position);
    });
    return () => { cancelled = true; };
  }, [latitude, longitude, ready]);
  return <div><div ref={container} aria-label="Mapa de instalación: usa flechas para desplazar o ingresa coordenadas debajo" className="h-72 w-full rounded-xl border relative z-0" />
    {error && <p role="status" className="mt-2 text-sm">{error}</p>}</div>;
}
