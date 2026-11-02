"use client";
import dynamic from "next/dynamic";
import { useEffect, useId, useState } from "react";
import { parseInstallation, type PointKind, type InstallationInput, type installationDto } from "@/lib/geolocation/validation";
const Map = dynamic(() => import("./InstallationMap"), { ssr: false, loading: () => <p>Cargando mapa…</p> });
type LocationDto = ReturnType<typeof installationDto>;
export default function InstallationEditor({ kind, pointId }: { kind: PointKind; pointId: string }) {
  const prefix = useId();
  const [stored, setStored] = useState<LocationDto>({ status: "PENDING" });
  const [lat, setLat] = useState(""); const [lng, setLng] = useState("");
  const [label, setLabel] = useState(""); const [address, setAddress] = useState("");
  const [accuracy, setAccuracy] = useState("");
  const [method, setMethod] = useState<InstallationInput["method"]>("MANUAL");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ latitude: number; longitude: number; address: string }[]>([]);
  const [busy, setBusy] = useState(true); const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(""); const [message, setMessage] = useState("");
  const endpoint = `/api/point-locations/${kind}/${encodeURIComponent(pointId)}`;
  function hydrate(data: LocationDto) {
    setStored(data); setLat(data.status === "CONFIGURED" ? String(data.latitude) : ""); setLng(data.status === "CONFIGURED" ? String(data.longitude) : "");
    setLabel(data.status === "CONFIGURED" ? data.label || "" : ""); setAddress(data.status === "CONFIGURED" ? data.address || "" : "");
    setAccuracy(data.status === "CONFIGURED" && data.accuracyMeters !== null ? String(data.accuracyMeters) : "");
    setMethod(data.status === "CONFIGURED" ? data.method : "MANUAL");
  }
  useEffect(() => {
    const controller = new AbortController();
    fetch(endpoint, { cache: "no-store", signal: controller.signal }).then(async response => {
      const data = await response.json(); if (!response.ok) throw new Error(data.error);
      hydrate(data); setLoaded(true);
    }).catch(e => { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "No se pudo cargar la ubicación."); })
      .finally(() => { if (!controller.signal.aborted) setBusy(false); });
    return () => controller.abort();
  }, [endpoint]);
  const select = (latitude: number, longitude: number) => { setLat(latitude.toFixed(6)); setLng(longitude.toFixed(6)); setMethod("MAP"); setAccuracy(""); setMessage(""); };
  async function save(remove = false) {
    setError(""); setMessage("");
    let input;
    try { if (!remove) input = parseInstallation({ latitude: lat.trim() ? Number(lat) : null, longitude: lng.trim() ? Number(lng) : null, label, address, accuracyMeters: accuracy.trim() ? Number(accuracy) : null, method, visibility: "PRIVATE" }); }
    catch (e) { setError((e as Error).message); return; }
    setBusy(true);
    try {
      const response = await fetch(endpoint, { method: remove ? "DELETE" : "PUT", headers: { "Content-Type": "application/json" }, body: remove ? undefined : JSON.stringify(input) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error);
      hydrate(data); setMessage(remove ? "Ubicación eliminada." : "Ubicación guardada.");
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo guardar."); } finally { setBusy(false); }
  }
  async function search() {
    setBusy(true); setError(""); setResults([]);
    try {
      const response = await fetch("/api/point-locations/search", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query, kind, pointId }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error);
      setResults(data.results); if (!data.results.length) setMessage("No se encontraron direcciones.");
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo buscar."); } finally { setBusy(false); }
  }
  const fieldClass = "block w-full rounded-lg border border-slate-400 bg-white text-slate-950 p-2";
  return <section aria-labelledby={`${prefix}-heading`} aria-busy={busy} className="space-y-4 rounded-2xl border border-slate-300 p-4 sm:p-6">
    <h2 id={`${prefix}-heading`} className="text-xl font-bold">Ubicación de instalación</h2>
    <p>Ubicación fija del punto. No se solicita la ubicación del visitante.</p>
    <p className="font-semibold">{!loaded ? "Cargando ubicación…" : stored.status === "PENDING" ? "Sin ubicación configurada" : `Ubicación configurada · ${new Date(stored.updatedAt).toLocaleString("es-CL")}`}</p>
    <p>Privada: solo administradores de esta cuenta pueden consultarla. No se publica en el perfil ni en el QR.</p>
    {error && <p role="alert" className="text-red-700 dark:text-red-300">{error}</p>}
    <p role="status" aria-live="polite">{message}</p>
    <fieldset disabled={busy || !loaded} className="space-y-4 disabled:opacity-60">
      <div><label htmlFor={`${prefix}-search`}>Buscar dirección o lugar</label><div className="flex gap-2"><input id={`${prefix}-search`} value={query} maxLength={200} onChange={e => setQuery(e.target.value)} className={fieldClass} /><button type="button" onClick={search} disabled={query.trim().length < 3} className="rounded-lg border px-3 disabled:opacity-50">Buscar</button></div></div>
      {!!results.length && <ul className="space-y-2">{results.map((r,i) => <li key={i}><button type="button" className="text-left underline" onClick={() => { select(r.latitude,r.longitude); setAddress(r.address); setMethod("ADDRESS"); setResults([]); }}>{r.address}</button></li>)}</ul>}
      <Map latitude={lat.trim() ? Number(lat) : null} longitude={lng.trim() ? Number(lng) : null} onSelect={select} disabled={busy || !loaded} />
      <p className="text-sm">Haz clic en el mapa o arrastra el marcador. También puedes usar los campos con teclado.</p>
      <div className="grid gap-3 sm:grid-cols-2">{([["Latitud",lat,setLat,-90,90],["Longitud",lng,setLng,-180,180]] as const).map(([name,value,set,min,max]) => <label key={name}>{name}<input aria-label={name} type="number" step="any" min={min} max={max} value={value} onChange={e => { set(e.target.value); setMethod("MANUAL"); setAccuracy(""); }} className={fieldClass}/></label>)}</div>
      <label className="block">Nombre o referencia<input value={label} maxLength={120} onChange={e => setLabel(e.target.value)} className={fieldClass}/></label>
      <label className="block">Dirección descriptiva (opcional)<input value={address} maxLength={300} onChange={e => setAddress(e.target.value)} className={fieldClass}/></label>
      <label className="block">Precisión estimada en metros (opcional)<input type="number" min={0} max={100000} step="any" value={accuracy} onChange={e => setAccuracy(e.target.value)} className={fieldClass}/></label>
      <div className="flex flex-wrap gap-3"><button type="button" onClick={() => save()} className="rounded-lg bg-blue-600 text-white px-4 py-2">Guardar ubicación</button>
      {stored.status === "CONFIGURED" && <button type="button" onClick={() => { if (window.confirm("¿Eliminar la ubicación de instalación? El destino NFC/QR se conserva.")) void save(true); }} className="rounded-lg border px-4 py-2">Eliminar ubicación</button>}</div>
    </fieldset>
    <p className="text-xs"><a href="https://www.geoapify.com/" className="underline">Powered by Geoapify</a> · Datos © <a href="https://www.openstreetmap.org/copyright" className="underline">OpenStreetMap</a></p>
  </section>;
}
