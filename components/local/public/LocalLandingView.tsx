// Composición única de la experiencia pública de SmartNFC Local.
// Jerarquía: identidad → acción principal → acciones secundarias → contacto/ubicación → atribución.
// La usan /l/[code], la vista previa del editor de identidad y la vista previa del formulario de puntos:
// no existe otra representación visual de la landing.
import type { ResolvedLocalBrand } from "../../../lib/local/brand";
import { visibleActions, type PublicAction } from "../../../lib/local/public-actions";
import LocalBrandHeader from "./LocalBrandHeader";
import LocalActionList from "./LocalActionList";
import LocalPublicShell from "./LocalPublicShell";
import LocalPromotionCard from "./LocalPromotionCard";
import type { PromotionView } from "../../../lib/local/objective-config";

export default function LocalLandingView({ brand, actions, framed = false, emptyHint, promotion }: {
  brand: ResolvedLocalBrand;
  actions: PublicAction[];
  framed?: boolean;
  /** Solo vistas previas: texto cuando aún no hay acciones del objetivo. Nunca se usa en la landing pública. */
  emptyHint?: string;
  /** Contenido y vigencia de una promoción (objetivo PROMOTION). */
  promotion?: PromotionView | null;
}) {
  const primary = visibleActions(actions, "primary");
  const secondary = visibleActions(actions, "secondary");
  const contact = visibleActions(actions, "contact");
  // En las vistas previas (framed) no se declara otro <main>: el landmark principal es el de la página que la contiene.
  const Main = framed ? "div" : "main";
  return (
    <LocalPublicShell brand={brand} framed={framed}>
      <LocalBrandHeader brand={brand} headingLevel={framed ? 2 : 1} />
      <Main className="space-y-3 px-6 pt-7">
        {promotion && <LocalPromotionCard promotion={promotion} brand={brand} />}
        <LocalActionList actions={primary} brand={brand} variant="primary" label="Acción principal" />
        <LocalActionList actions={secondary} brand={brand} variant="secondary" label="Más acciones" />
        {!primary.length && !secondary.length && emptyHint && !(promotion && promotion.status !== "active") && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 px-5 py-6 text-center text-[13px] leading-relaxed text-slate-500">
            {emptyHint}
          </div>
        )}
      </Main>
      {contact.length > 0 && (
        <section aria-label="Contacto y ubicación" className="px-6 pt-8">
          <h2 className="px-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">Contacto</h2>
          <div className="mt-1.5"><LocalActionList actions={contact} brand={brand} variant="contact" label="Contacto del local" /></div>
        </section>
      )}
    </LocalPublicShell>
  );
}
