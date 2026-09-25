"use client";
import { useRef, useState } from "react";
import { ImagePlus, LoaderCircle, RotateCcw, Trash2 } from "lucide-react";
import { BRAND_IMAGE_MAX_BYTES, BRAND_IMAGE_TYPES, BRAND_UPLOAD_ERRORS, brandUploadErrorMessage, type BrandImageKind } from "../../../lib/local/brand";

// Subida autorizada de logo/portada del Local: envía el archivo a /api/local/brand-upload,
// que valida y guarda en el servidor (sin token de cliente ni callback de Vercel Blob).
// Se implementa aparte de FileInput porque necesita autorización Local, progreso y mensajes
// inline según el código de error del servidor (FileInput usa alert() y estilos solo oscuros).

type UploadResult = { ok: true; url: string } | { ok: false; message: string };
function sendBrandImage(locationId: string, kind: BrandImageKind, file: File, onProgress: (pct: number) => void): Promise<UploadResult> {
  return new Promise(resolve => {
    const form = new FormData();
    form.append("locationId", locationId); form.append("kind", kind); form.append("file", file);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/local/brand-upload");
    xhr.responseType = "json";
    xhr.upload.onprogress = e => { if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100)); };
    xhr.onerror = () => resolve({ ok: false, message: BRAND_UPLOAD_ERRORS.NETWORK });
    xhr.ontimeout = () => resolve({ ok: false, message: BRAND_UPLOAD_ERRORS.NETWORK });
    xhr.onload = () => {
      const body = xhr.response as { url?: string; error?: { code?: string } } | null;
      if (xhr.status >= 200 && xhr.status < 300 && typeof body?.url === "string") return resolve({ ok: true, url: body.url });
      if (xhr.status === 401 || xhr.status === 403) return resolve({ ok: false, message: brandUploadErrorMessage(body?.error?.code ?? "FORBIDDEN") });
      if (xhr.status === 413 && !body?.error) return resolve({ ok: false, message: BRAND_UPLOAD_ERRORS.FILE_TOO_LARGE });
      resolve({ ok: false, message: brandUploadErrorMessage(body?.error?.code) });
    };
    xhr.timeout = 60_000;
    xhr.send(form);
  });
}
export default function BrandImageField({ id, kind, locationId, label, hint, value, error, onChange }: {
  id: string; kind: BrandImageKind; locationId: string; label: string; hint: string; value: string; error?: string;
  onChange: (url: string) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const isLogo = kind === "logo";

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setUploadError(null);
    if (!(BRAND_IMAGE_TYPES as readonly string[]).includes(file.type)) { setUploadError("Formato no admitido. Usa PNG, JPG o WEBP."); return; }
    if (file.size > BRAND_IMAGE_MAX_BYTES) { setUploadError(`La imagen pesa ${(file.size / 1048576).toFixed(1)} MB. El máximo es 4 MB.`); return; }
    try {
      setProgress(0);
      const result = await sendBrandImage(locationId, kind, file, setProgress);
      if (result.ok) onChange(result.url); else setUploadError(result.message);
    } finally {
      setProgress(null);
      if (input.current) input.current.value = "";
    }
  }

  const uploading = progress !== null;
  const message = uploadError || error;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm font-semibold text-slate-800 dark:text-slate-100">{label}</label>
        <span className="text-[11px] text-slate-400">PNG, JPG o WEBP · máx. 4 MB</span>
      </div>
      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{hint}</p>
      <div className={`mt-2.5 flex ${isLogo ? "items-center gap-4" : "flex-col gap-3"}`}>
        <button type="button" onClick={() => input.current?.click()} disabled={uploading} aria-describedby={message ? `${id}-error` : undefined}
          className={`group relative flex shrink-0 items-center justify-center overflow-hidden border border-dashed transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
            value ? "border-transparent bg-slate-100 dark:bg-slate-800" : "border-slate-300 bg-slate-50 hover:border-blue-400 hover:bg-blue-50/60 dark:border-slate-700 dark:bg-slate-950 dark:hover:bg-slate-900"
          } ${isLogo ? "h-24 w-24 rounded-2xl" : "aspect-[2/1] w-full max-w-md rounded-2xl"}`}>
          {value && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt={isLogo ? "Logo actual" : "Portada actual"} className={`h-full w-full ${isLogo ? "object-contain p-2" : "object-cover"}`} />
          )}
          {!value && !uploading && (
            <span className="flex flex-col items-center gap-1.5 text-slate-500 dark:text-slate-400">
              <ImagePlus aria-hidden className="h-6 w-6" />
              <span className="text-xs font-semibold">{isLogo ? "Subir logo" : "Subir portada"}</span>
            </span>
          )}
          {uploading && (
            <span className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-white/85 text-blue-700 dark:bg-slate-950/85 dark:text-blue-300">
              <LoaderCircle aria-hidden className="h-5 w-5 animate-spin" />
              <span className="text-xs font-semibold" role="status">Subiendo {progress}%</span>
            </span>
          )}
        </button>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => input.current?.click()} disabled={uploading}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800">
            {value ? <RotateCcw aria-hidden className="h-3.5 w-3.5" /> : <ImagePlus aria-hidden className="h-3.5 w-3.5" />}
            {value ? "Reemplazar" : "Elegir archivo"}
          </button>
          {value && (
            <button type="button" onClick={() => onChange("")} disabled={uploading}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 disabled:opacity-50 dark:text-rose-400 dark:hover:bg-rose-500/10">
              <Trash2 aria-hidden className="h-3.5 w-3.5" /> Quitar
            </button>
          )}
        </div>
      </div>
      <input ref={input} id={id} type="file" accept={BRAND_IMAGE_TYPES.join(",")} className="sr-only" tabIndex={-1}
        onChange={e => handleFile(e.target.files?.[0])} />
      {message && <p id={`${id}-error`} role="alert" className="mt-1.5 text-xs font-medium text-rose-600 dark:text-rose-400">{message}</p>}
    </div>
  );
}
