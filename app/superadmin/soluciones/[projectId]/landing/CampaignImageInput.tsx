"use client";

import { useEffect, useId, useRef, useState } from "react";
import { safeDestination } from "../../../../../lib/local/safe-url";

export default function CampaignImageInput({ scope, kind, value, label, onChange }: {
  scope: { companyId: string; projectId: string }; kind: "image" | "logo";
  value: string; label: string; onChange: (url: string) => void;
}) {
  const id = useId();
  const latestChange = useRef(onChange);
  const request = useRef<XMLHttpRequest | null>(null);
  const [local, setLocal] = useState("");
  const [progress, setProgress] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  useEffect(() => { latestChange.current = onChange; }, [onChange]);
  useEffect(() => () => { request.current?.abort(); }, []);
  useEffect(() => () => { if (local) URL.revokeObjectURL(local); }, [local]);

  function upload(file?: File) {
    if (!file || request.current) return;
    setError("");
    setMessage("");
    setLocal("");
    if (!file.size || file.size > 4 * 1024 * 1024) {
      setError("Selecciona una imagen de hasta 4 MB.");
      return;
    }
    if (file.type && !["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Selecciona una imagen JPG, PNG o WebP.");
      return;
    }
    setLocal(URL.createObjectURL(file));
    setProgress(0);
    const xhr = new XMLHttpRequest();
    request.current = xhr;
    const finish = () => { request.current = null; setProgress(null); setLocal(""); };
    const fail = (text: string) => { setError(text); finish(); };
    xhr.open("POST", "/api/soluciones/campaign-image?" + new URLSearchParams({ ...scope, kind }));
    xhr.responseType = "json";
    xhr.timeout = 60000;
    xhr.upload.onprogress = event => { if (event.lengthComputable) setProgress(Math.round(100 * event.loaded / event.total)); };
    xhr.onerror = xhr.ontimeout = () => fail("No se pudo completar la carga. Intenta nuevamente.");
    xhr.onload = () => {
      const result = xhr.response;
      if (xhr.status !== 200 || typeof result?.url !== "string" || !safeDestination(result.url)) {
        fail(result?.error || "No se pudo cargar la imagen.");
        return;
      }
      latestChange.current(result.url);
      setMessage(`Imagen optimizada · ${Math.ceil(result.bytes / 1024)} KB. Guarda el borrador para conservar el cambio.`);
      finish();
    };
    const form = new FormData();
    form.append("file", file);
    xhr.send(form);
  }

  const preview = local || (safeDestination(value) ? value : "");
  return <div className="space-y-2 rounded-md border p-3"
    onDragOver={event => event.preventDefault()}
    onDrop={event => { event.preventDefault(); upload(event.dataTransfer.files[0]); }}>
    {preview && (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={preview} alt={local ? "Miniatura antes de optimizar" : "Miniatura actual"} referrerPolicy="no-referrer" className="max-h-32 w-full object-contain" />
    )}
    <label htmlFor={id} className="block text-sm font-medium">{value ? "Reemplazar" : "Subir"} {kind === "logo" ? "logo" : "imagen"}</label>
    <input id={id} type="file" accept="image/jpeg,image/png,image/webp" disabled={progress !== null}
      className="block w-full text-sm" onChange={event => { upload(event.target.files?.[0]); event.target.value = ""; }} />
    <p className="text-xs text-slate-500">También puedes arrastrar un JPG, PNG o WebP de hasta 4 MB.</p>
    {progress !== null && <div role="status" className="text-sm">
      <progress aria-label="Progreso de carga" value={progress} max={100} /> {progress < 100 ? `${progress}%` : "Optimizando y almacenando…"}
    </div>}
    {error && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{error}</p>}
    {message && <p role="status" className="text-sm">{message}</p>}
    <details className="text-sm">
      <summary className="cursor-pointer">Usar URL HTTPS</summary>
      <label className="block">{label}
        <input className="mt-1 w-full rounded-md border bg-transparent p-2" type="url" maxLength={2048}
          value={value} disabled={progress !== null} onChange={event => onChange(event.target.value)} />
      </label>
    </details>
  </div>;
}
