// Contenido de una promoción en la experiencia pública. Presentación pura (sin estado).
// Muestra solo título, descripción, imagen validada y vigencia; nunca datos administrativos.
import { CalendarClock, CalendarX2 } from "lucide-react";
import type { ResolvedLocalBrand } from "../../../lib/local/brand";
import type { PromotionView } from "../../../lib/local/objective-config";

export default function LocalPromotionCard({ promotion, brand }: { promotion: PromotionView; brand: ResolvedLocalBrand }) {
  const inactive = promotion.status !== "active";
  const StatusIcon = promotion.status === "ended" ? CalendarX2 : CalendarClock;
  if (!promotion.title && !promotion.description && !promotion.imageUrl && !promotion.periodText) return null;
  return (
    <section aria-label="Promoción" className="overflow-hidden rounded-2xl bg-white shadow-[0_1px_2px_rgba(15,23,42,0.06)] ring-1 ring-slate-900/[0.07]">
      {promotion.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={promotion.imageUrl} alt="" className={`aspect-[2/1] w-full object-cover ${inactive ? "opacity-60 grayscale" : ""}`} />
      )}
      <div className="space-y-2 px-5 py-4">
        {promotion.title && <h2 className="text-[19px] font-bold leading-snug tracking-[-0.01em] text-slate-900 break-words">{promotion.title}</h2>}
        {promotion.description && <p className="whitespace-pre-line text-[14.5px] leading-relaxed text-slate-600 break-words">{promotion.description}</p>}
        {promotion.periodText && (
          <p className={`flex items-start gap-1.5 text-[13px] font-semibold ${inactive ? "text-slate-500" : ""}`} style={inactive ? undefined : { color: brand.primaryColor }}>
            <StatusIcon aria-hidden className="mt-[1px] h-4 w-4 shrink-0" /><span>{promotion.periodText}</span>
          </p>
        )}
      </div>
    </section>
  );
}
