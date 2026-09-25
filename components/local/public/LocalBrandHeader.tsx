// Cabecera de marca del Local. Componente de presentación puro (sin estado ni efectos):
// se usa en la vista previa del editor y se reutilizará en las landings públicas (Bloque 4).
import { MapPin } from "lucide-react";
import type { ResolvedLocalBrand } from "../../../lib/local/brand";

export default function LocalBrandHeader({ brand }: { brand: ResolvedLocalBrand }) {
  const coverStyle = brand.coverImageUrl
    ? undefined
    : { background: `radial-gradient(120% 90% at 85% 0%, ${brand.secondaryColor}cc 0%, transparent 60%), linear-gradient(135deg, ${brand.primaryColor} 0%, ${brand.secondaryColor} 100%)` };
  return (
    <header className="relative">
      <div className="relative h-44 overflow-hidden" style={coverStyle}>
        {brand.coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={brand.coverImageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div aria-hidden className="absolute inset-0 opacity-[0.14]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)", backgroundSize: "14px 14px" }} />
        )}
        <div aria-hidden className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/35 to-transparent" />
      </div>
      <div className="relative px-6 -mt-11">
        <div className="h-[88px] w-[88px] rounded-[22px] bg-white p-1.5 shadow-[0_10px_30px_-8px_rgba(15,23,42,0.35)] ring-1 ring-slate-900/5">
          {brand.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={brand.logoUrl} alt={`Logo de ${brand.displayName}`} className="h-full w-full rounded-[17px] object-contain" />
          ) : (
            <div className="flex h-full w-full items-center justify-center rounded-[17px] text-[28px] font-bold tracking-tight"
              style={{ backgroundColor: brand.primaryColor, color: brand.onPrimary }} aria-label={`Iniciales de ${brand.displayName}`}>
              {brand.initials}
            </div>
          )}
        </div>
        <h1 className="mt-4 text-[26px] font-bold leading-tight tracking-[-0.02em] text-slate-900 break-words">{brand.displayName}</h1>
        {brand.shortDescription && <p className="mt-2 text-[15px] leading-relaxed text-slate-600 break-words">{brand.shortDescription}</p>}
        {brand.address && (
          <p className="mt-3 flex items-start gap-1.5 text-[13px] font-medium text-slate-500">
            <MapPin aria-hidden className="mt-[1px] h-4 w-4 shrink-0" style={{ color: brand.primaryColor }} />
            <span className="break-words">{brand.address}</span>
          </p>
        )}
      </div>
    </header>
  );
}
