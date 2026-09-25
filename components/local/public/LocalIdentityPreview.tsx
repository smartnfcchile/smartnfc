// Composición de identidad del Local (cabecera + contacto) usada por la vista previa del editor.
// Las landings del Bloque 4 compondrán estos mismos componentes con las acciones de cada objetivo.
import type { ResolvedLocalBrand } from "../../../lib/local/brand";
import LocalBrandHeader from "./LocalBrandHeader";
import LocalContactActions from "./LocalContactActions";
import LocalPublicShell from "./LocalPublicShell";

export default function LocalIdentityPreview({ brand, framed = true }: { brand: ResolvedLocalBrand; framed?: boolean }) {
  const hasContact = !!(brand.phone || brand.mapsUrl || brand.websiteUrl);
  return (
    <LocalPublicShell brand={brand} framed={framed}>
      <LocalBrandHeader brand={brand} />
      <div className="px-6 pt-7">
        {hasContact ? <LocalContactActions brand={brand} /> : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 px-5 py-6 text-center text-[13px] leading-relaxed text-slate-500">
            Aquí aparecerán las acciones de cada Punto Inteligente, con la identidad de tu local.
          </div>
        )}
      </div>
    </LocalPublicShell>
  );
}
