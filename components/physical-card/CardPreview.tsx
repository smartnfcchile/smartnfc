"use client";

import { useMemo } from "react";
import type { CardSideDesign } from "../../lib/physical-card/templates";
import { qrSvg } from "../../lib/qr/svg";

/** QR dibujado en el navegador (sin servicios externos). Codifica exactamente `value`, igual que antes. */
function LocalQr({ value }: { value: string }) {
  const qr = useMemo(() => qrSvg(value), [value]);
  return <svg role="img" aria-label={`QR hacia ${value}`} viewBox={`0 0 ${qr.size} ${qr.size}`} shapeRendering="crispEdges" className="block aspect-square w-full"><rect width={qr.size} height={qr.size} fill="#fff"/><path d={qr.path} fill="#0F172A"/></svg>;
}

/**
 * Tamaños de texto. "viewport" (por defecto, editor de tarjetas): los mismos de siempre, relativos a la ventana.
 * "card" (vistas ilustrativas, p. ej. /personas): relativos al ancho de la tarjeta, con mínimos legibles en móvil;
 * en tarjetas de menos de 330 px se muestra solo el ícono NFC para que el rótulo no tape el nombre.
 */
const TEXT = {
  viewport: { name: "text-[clamp(11px,2.7vw,24px)]", position: "text-[clamp(6px,1.2vw,11px)]", tagline: "text-[clamp(6px,1.15vw,10px)]", contact: "text-[clamp(5px,1vw,9px)]", nfc: "text-[clamp(6px,1.1vw,10px)]", nfcLabel: undefined },
  card: { name: "text-[clamp(15px,6.2cqw,26px)]", position: "text-[clamp(10.5px,3cqw,13px)]", tagline: "text-[clamp(10px,2.8cqw,12px)]", contact: "text-[clamp(9.5px,2.5cqw,11px)]", nfc: "text-[clamp(9.5px,2.6cqw,11px)]", nfcLabel: "@max-[330px]:hidden" },
} as const;

export type CardPreviewTextSize = keyof typeof TEXT;

export default function CardPreview({ side, publicUrl, guides = false, scale = 1, label, textSize = "viewport" }: { side: CardSideDesign; publicUrl: string; guides?: boolean; scale?: number; label?: string; textSize?: CardPreviewTextSize }) {
  const t = TEXT[textSize];
  const align = side.alignment === "center" ? "items-center text-center" : side.alignment === "right" ? "items-end text-right" : "items-start text-left";
  const photoLayout = side.layout.includes("photo-split");
  return <div className="space-y-2"><p className="text-center text-[10px] font-bold uppercase tracking-[.2em] text-slate-500">{label}</p><div className="relative mx-auto aspect-[1.586] w-full max-w-[560px] overflow-hidden rounded-[5%] shadow-2xl" style={{ background: side.background, color: side.text, transform: `scale(${scale})`, transformOrigin: "center", ...(textSize === "card" ? { containerType: "inline-size" as const } : {}) }}>
    <div className="absolute inset-0 opacity-90" style={{ background: side.layout.includes("diagonal") ? `linear-gradient(135deg, transparent 55%, ${side.primary} 55%)` : side.layout.includes("promo") ? `radial-gradient(circle at 85% 20%, ${side.secondary} 0 18%, transparent 19%)` : side.layout.includes("club") ? `linear-gradient(115deg, ${side.background} 65%, ${side.primary} 65%)` : "transparent" }}/>
    {side.layout.includes("side-stripe") && <div className="absolute inset-y-0 left-0 w-[12%]" style={{ background: side.primary }}/>} 
    {side.layout.includes("bottom-band") && <div className="absolute inset-x-0 bottom-0 h-[18%]" style={{ background: side.primary }}/>} 
    {photoLayout && side.photoUrl && <img src={side.photoUrl} alt="Fotografía" className="absolute inset-y-0 right-0 h-full w-[42%] object-cover"/>}
    <div className={`absolute inset-[9%] flex flex-col justify-between ${align} ${photoLayout ? "right-[44%]" : ""}`}>
      <div className="max-w-[70%]">{side.logoUrl ? <img src={side.logoUrl} alt="Logo" className="mb-3 h-8 max-w-28 object-contain object-left"/> : <div className="mb-3 h-1.5 w-14 rounded-full" style={{ background: side.secondary }}/>}<p className={`${t.name} font-black leading-tight`}>{side.name || side.company}</p>{side.position && <p className={`mt-1 ${t.position} font-semibold`} style={{ color: side.muted }}>{side.position}{side.company ? ` · ${side.company}` : ""}</p>}<p className={`mt-2 ${t.tagline} leading-snug`}>{side.tagline}</p></div>
      <div className={`${t.contact} leading-relaxed`} style={{ color: side.muted }}>{[side.phone, side.email, side.website, side.instagram, side.address].filter(Boolean).slice(0, 3).map(v => <div key={v}>{v}</div>)}</div>
    </div>
    {side.qrVisible && <div className="absolute bottom-[9%] right-[7%] rounded-[8%] bg-white p-[2%] shadow-xl" style={{ width: `${Math.max(18, Math.min(28, side.qrSizeMm)) / 85.6 * 100}%` }}><LocalQr value={publicUrl} /></div>}
    {side.nfcVisible && <div className={`absolute right-[7%] top-[9%] flex items-center gap-1.5 ${t.nfc} font-bold`}><span className="text-lg">◖)))</span><span className={t.nfcLabel}>{side.nfcText}</span></div>}
    {guides && <><div className="pointer-events-none absolute inset-[3.4%] rounded-[4%] border border-dashed border-red-400"/><div className="pointer-events-none absolute inset-[8.7%] rounded border border-dashed border-emerald-300"/><span className="absolute left-[4%] top-[4%] text-[7px] font-bold text-red-300">CORTE</span><span className="absolute left-[9%] top-[9%] text-[7px] font-bold text-emerald-300">ÁREA SEGURA</span></>}
  </div></div>;
}
