/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState } from "react";
import { toCssImageUrl } from "../lib/card-images";
import {
  BANNER_CURVE_PATHS, BANNER_FRAMES, BANNER_HEIGHT, HERO_DESKTOP, HERO_DESKTOP_GRADIENT, HERO_MOBILE,
  HERO_MOBILE_GRADIENT, HERO_POSITION, computeBannerSafeZone, computeCoverCrop, getBannerOverlays, overlayRect,
  type BannerOverlay, type Rect,
} from "../lib/profile-image-crop";
import type { ImageSize } from "../lib/profile-image-specs";

const pct = (value: number, total: number) => `${(value / total) * 100}%`;
const rectStyle = (r: Rect, w: number, h: number): React.CSSProperties => ({
  left: pct(r.x, w), top: pct(r.y, h), width: pct(r.width, w), height: pct(r.height, h),
});
const percentLabel = (fraction: number) => `${Math.round(Math.max(0, fraction) * 100)} %`;

/** Solo se previsualizan referencias de imagen seguras (mismo criterio que la landing). */
function usePreviewImage(url: string | null | undefined) {
  const [size, setSize] = useState<{ url: string; size: ImageSize } | null>(null);
  const safe = url && toCssImageUrl(url) ? url : null;
  const read = (img: HTMLImageElement | null) => {
    if (!safe || !img || !img.complete || img.naturalWidth <= 0) return;
    const next = { width: img.naturalWidth, height: img.naturalHeight };
    setSize((prev) => (prev && prev.url === safe && prev.size.width === next.width && prev.size.height === next.height ? prev : { url: safe, size: next }));
  };
  // onLoad no se dispara si la imagen ya cargó antes de la hidratación: se lee también al montar.
  const onLoad = (e: React.SyntheticEvent<HTMLImageElement>) => read(e.currentTarget);
  return { src: safe, size: size && size.url === safe ? size.size : null, onLoad, ref: read };
}

function Legend({ items }: { items: Array<"visible" | "cropped" | "safe" | "covered"> }) {
  const all = {
    visible: <><span className="h-3 w-4 rounded-sm border border-slate-500 bg-slate-400" />Se ve</>,
    cropped: <><span className="h-3 w-4 rounded-sm bg-red-500/60" />Se recorta</>,
    safe: <><span className="h-3 w-4 rounded-sm border-2 border-dashed border-emerald-400" />Zona segura</>,
    covered: <><span className="h-3 w-4 rounded-sm border border-sky-300 bg-sky-400/50" />Queda tapado</>,
  };
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-slate-300">
      {items.map((key) => <li key={key} className="flex items-center gap-1.5">{all[key]}</li>)}
    </ul>
  );
}

function OverlayShape({ overlay, frameWidth }: { overlay: BannerOverlay; frameWidth: number }) {
  if (overlay.kind === "curve" && overlay.curve) {
    const r = overlayRect(overlay, frameWidth);
    return (
      <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="absolute" style={rectStyle(r, frameWidth, BANNER_HEIGHT)} aria-hidden="true">
        <path d={BANNER_CURVE_PATHS[overlay.curve]} className="fill-sky-400/50 stroke-sky-200" strokeWidth={3} vectorEffect="non-scaling-stroke" />
      </svg>
    );
  }
  // Avatar o insignia: el elemento completo (sobresale bajo la portada; el marco lo recorta)
  const size = overlay.elementSize ?? 0;
  const element: Rect = { x: (frameWidth - size) / 2, y: BANNER_HEIGHT - overlay.height, width: size, height: size };
  const shape: React.CSSProperties =
    overlay.shape === "hexagon" ? { clipPath: "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)" }
    : overlay.shape === "rounded-square" ? { borderRadius: "18.75%" }
    : overlay.shape === "no-frame" ? { borderRadius: 0 }
    : { borderRadius: "50%" };
  return <div className="absolute border-2 border-sky-200 bg-sky-400/50" style={{ ...rectStyle(element, frameWidth, BANNER_HEIGHT), ...shape }} aria-hidden="true" />;
}

// ── Portada ─────────────────────────────────────────────────────────────────

/** Se muestra en lugar de inventar una zona segura cuando no existe una útil. */
export function NoSafeZoneWarning() {
  return (
    <p role="alert" className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] font-medium text-amber-200">
      Con esta proporción y la plantilla elegida no queda una zona que se vea completa y sin tapar en todas las pantallas. Usa una imagen en proporción 7:3 (1344 × 576 px).
    </p>
  );
}

export function BannerCropPreview({ url, template, bannerStyle, photoStyle }: {
  url: string | null | undefined; template: string; bannerStyle: string; photoStyle: string;
}) {
  const { src, size, onLoad, ref } = usePreviewImage(url);
  const [guides, setGuides] = useState(true);
  if (!src) return null;

  const overlays = getBannerOverlays({ template, bannerStyle, photoStyle });
  const narrow = BANNER_FRAMES.reduce((a, b) => (b.width < a.width ? b : a));
  const wide = BANNER_FRAMES.reduce((a, b) => (b.width > a.width ? b : a));

  const full = size && {
    cropNarrow: computeCoverCrop(size, { width: narrow.width, height: BANNER_HEIGHT }),
    cropWide: computeCoverCrop(size, { width: wide.width, height: BANNER_HEIGHT }),
  };
  // Una única zona segura: la región de la imagen visible y sin tapar en las tres vistas
  const safe = size ? computeBannerSafeZone(size, overlays) : null;

  return (
    <section className="mt-3 space-y-4 rounded-xl border border-slate-800 bg-slate-950/60 p-4" aria-label="Vista previa del recorte de la portada">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-xs font-bold text-white">Así se verá tu portada</h3>
        <label className="flex cursor-pointer items-center gap-1.5 text-[10px] text-slate-400">
          <input type="checkbox" checked={guides} onChange={(e) => setGuides(e.target.checked)} className="h-3 w-3" />
          Mostrar guías
        </label>
      </div>
      <Legend items={["visible", "cropped", "safe", "covered"]} />

      {/* Imagen completa con lo que se recorta */}
      <figure className="space-y-1.5">
        <figcaption className="text-[10px] font-semibold text-slate-300">
          Tu imagen completa{size ? ` (${size.width} × ${size.height} px)` : ""}
        </figcaption>
        <div
          className="relative overflow-hidden rounded-lg bg-slate-900"
          style={size ? { aspectRatio: `${size.width} / ${size.height}`, maxWidth: `${Math.min(448, 220 * (size.width / size.height))}px` } : { maxWidth: "448px" }}
        >
          <img ref={ref} src={src} alt="" onLoad={onLoad} className="block h-full w-full" />
          {full && guides && size && (
            <>
              {/* Fuera del escritorio: se recorta siempre. Fuera del móvil estrecho: se recorta en algunos teléfonos. */}
              <div className="absolute" style={{ ...rectStyle(full.cropWide.visible, size.width, size.height), boxShadow: "0 0 0 9999px rgba(239, 68, 68, 0.6)" }} />
              <div className="absolute" style={{ ...rectStyle(full.cropNarrow.visible, size.width, size.height), boxShadow: "0 0 0 9999px rgba(239, 68, 68, 0.3)" }} />
              {safe && <div className="absolute border-2 border-dashed border-emerald-400" data-safe-zone="image" style={rectStyle(safe.image, size.width, size.height)} />}
            </>
          )}
        </div>
        {full && (
          <p className="text-[10px] leading-relaxed text-slate-400">
            {full.cropNarrow.croppedX > 0.005
              ? `En teléfonos estrechos se pierde hasta un ${percentLabel(full.cropNarrow.croppedX)} del ancho (a los lados).`
              : full.cropWide.croppedY > 0.005
                ? `Se pierde un ${percentLabel(full.cropWide.croppedY)} del alto (arriba y abajo).`
                : "La imagen se ve completa."}
            {full.cropWide.croppedX > 0.005 && ` En escritorio se pierde un ${percentLabel(full.cropWide.croppedX)}.`}
            {safe && ` Zona segura en tu imagen: ${Math.round(safe.image.width)} × ${Math.round(safe.image.height)} px (se ve y queda libre en las tres vistas).`}
          </p>
        )}
        {size && !safe && <NoSafeZoneWarning />}
      </figure>

      {/* Tres pantallas reales: mismo object-cover centrado que la landing */}
      <div className="space-y-3">
        {BANNER_FRAMES.map((frame) => {
          const crop = size ? computeCoverCrop(size, { width: frame.width, height: BANNER_HEIGHT }) : null;
          return (
            <figure key={frame.id} className="space-y-1" data-frame={frame.id}>
              <figcaption className="flex items-baseline justify-between gap-2 text-[10px]">
                <span className="font-semibold text-slate-300">{frame.label} <span className="font-normal text-slate-500">· {frame.hint}</span></span>
                {crop && <span className="text-slate-500">{crop.croppedX > 0.005 ? `se recorta ${percentLabel(crop.croppedX)} a los lados` : crop.croppedY > 0.005 ? `se recorta ${percentLabel(crop.croppedY)} arriba y abajo` : "sin recorte"}</span>}
              </figcaption>
              <div className="relative w-full overflow-hidden rounded-md bg-slate-800" style={{ maxWidth: `${frame.width}px`, aspectRatio: `${frame.width} / ${BANNER_HEIGHT}` }}>
                <img src={src} alt="" className="block h-full w-full object-cover" />
                {guides && (
                  <>
                    {safe && <div className="absolute border-2 border-dashed border-emerald-400" data-safe-zone={frame.id} style={rectStyle(safe.frames[frame.id], frame.width, BANNER_HEIGHT)} />}
                    {overlays.map((overlay) => <OverlayShape key={overlay.kind} overlay={overlay} frameWidth={frame.width} />)}
                  </>
                )}
              </div>
            </figure>
          );
        })}
      </div>
      <p className="text-[10px] leading-relaxed text-slate-400">
        Queda tapado: {overlays.map((o) => o.label.toLowerCase()).join(" y ")}. Cambia según la plantilla y la curva elegidas en «Diseño».
      </p>
    </section>
  );
}

// ── Hero / Fondo ────────────────────────────────────────────────────────────

export function HeroCropPreview({ url }: { url: string | null | undefined }) {
  const { src, size, onLoad, ref } = usePreviewImage(url);
  if (!src) return null;

  const mobileFrame = { width: HERO_MOBILE.width, height: HERO_MOBILE.stripHeight + 110 };
  const stripCrop = size ? computeCoverCrop(size, { width: HERO_MOBILE.width, height: HERO_MOBILE.stripHeight }, HERO_POSITION) : null;
  const deskCrop = size ? computeCoverCrop(size, { width: HERO_DESKTOP.width, height: HERO_DESKTOP.height }, HERO_POSITION) : null;
  const cardTop = HERO_MOBILE.stripHeight - HERO_MOBILE.cardOverlap;
  const deskCard: Rect = { x: (HERO_DESKTOP.width - HERO_DESKTOP.cardWidth) / 2, y: HERO_DESKTOP.paddingY, width: HERO_DESKTOP.cardWidth, height: HERO_DESKTOP.height };

  return (
    <section className="mt-3 space-y-4 rounded-xl border border-slate-800 bg-slate-950/60 p-4" aria-label="Vista previa del fondo hero">
      <h3 className="text-xs font-bold text-white">Así se verá tu fondo</h3>
      <Legend items={["visible", "safe", "covered"]} />
      <img ref={ref} src={src} alt="" onLoad={onLoad} className="hidden" />

      <div className="grid gap-4 sm:grid-cols-[minmax(0,5fr)_minmax(0,11fr)]">
        {/* Móvil: franja de 220 px, oscurecida, con la tarjeta subiendo 48 px */}
        <figure className="space-y-1" data-frame="hero-mobile">
          <figcaption className="text-[10px] font-semibold text-slate-300">Móvil <span className="font-normal text-slate-500">· franja de {HERO_MOBILE.stripHeight} px</span></figcaption>
          <div className="relative w-full overflow-hidden rounded-md bg-slate-950" style={{ maxWidth: "220px", aspectRatio: `${mobileFrame.width} / ${mobileFrame.height}` }}>
            <div className="absolute inset-x-0 top-0 overflow-hidden" style={{ height: pct(HERO_MOBILE.stripHeight, mobileFrame.height) }}>
              <img src={src} alt="" className="block h-full w-full object-cover object-top" />
              <div className="absolute inset-0" style={{ backgroundImage: HERO_MOBILE_GRADIENT }} />
            </div>
            <div className="absolute border-2 border-dashed border-emerald-400" style={rectStyle({ x: 0, y: 0, width: HERO_MOBILE.width, height: cardTop }, mobileFrame.width, mobileFrame.height)} />
            <div className="absolute rounded-t-[14%] border-2 border-sky-200 bg-sky-400/50" style={rectStyle({ x: HERO_MOBILE.cardInset, y: cardTop, width: HERO_MOBILE.width - HERO_MOBILE.cardInset * 2, height: mobileFrame.height - cardTop }, mobileFrame.width, mobileFrame.height)}>
              <span className="absolute left-1/2 top-2 -translate-x-1/2 whitespace-nowrap text-[9px] font-bold text-white">Tu tarjeta</span>
            </div>
          </div>
          {stripCrop && (
            <p className="text-[10px] leading-relaxed text-slate-400">
              Se ve la parte superior: {percentLabel(1 - stripCrop.croppedY)} del alto{stripCrop.croppedX > 0.005 ? ` y ${percentLabel(1 - stripCrop.croppedX)} del ancho` : ""}. La tarjeta tapa los últimos {HERO_MOBILE.cardOverlap} px.
            </p>
          )}
        </figure>

        {/* Escritorio: fondo a pantalla completa, oscurecido, con la tarjeta al centro */}
        <figure className="space-y-1" data-frame="hero-desktop">
          <figcaption className="text-[10px] font-semibold text-slate-300">Escritorio <span className="font-normal text-slate-500">· pantalla {HERO_DESKTOP.width} × {HERO_DESKTOP.height} px</span></figcaption>
          <div className="relative w-full overflow-hidden rounded-md bg-slate-950" style={{ aspectRatio: `${HERO_DESKTOP.width} / ${HERO_DESKTOP.height}` }}>
            <img src={src} alt="" className="block h-full w-full object-cover object-top" />
            <div className="absolute inset-0" style={{ backgroundImage: HERO_DESKTOP_GRADIENT }} />
            <div className="absolute rounded-t-[8%] border-2 border-sky-200 bg-sky-400/50" style={rectStyle(deskCard, HERO_DESKTOP.width, HERO_DESKTOP.height)}>
              <span className="absolute left-1/2 top-2 -translate-x-1/2 whitespace-nowrap text-[9px] font-bold text-white">Tu tarjeta</span>
            </div>
          </div>
          {deskCrop && (
            <p className="text-[10px] leading-relaxed text-slate-400">
              La tarjeta cubre el centro y el fondo se oscurece hacia abajo. Se ven sobre todo los costados{deskCrop.croppedY > 0.005 ? `; se recorta un ${percentLabel(deskCrop.croppedY)} del alto por abajo` : ""}.
            </p>
          )}
        </figure>
      </div>
      <p className="text-[10px] leading-relaxed text-slate-400">
        Es una imagen decorativa: evita textos. En pantallas más anchas o más altas el recorte cambia.
      </p>
    </section>
  );
}
