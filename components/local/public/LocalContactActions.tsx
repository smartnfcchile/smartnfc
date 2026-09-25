// Acciones de contacto del Local (teléfono, ubicación, web) dibujadas con el registro único de acciones.
// Se conserva como atajo compatible; LocalLandingView compone lo mismo a partir de PublicAction[].
import type { ResolvedLocalBrand } from "../../../lib/local/brand";
import { buildContactActions } from "../../../lib/local/public-actions";
import LocalActionList from "./LocalActionList";

export default function LocalContactActions({ brand, interactive = false }: { brand: ResolvedLocalBrand; interactive?: boolean }) {
  return <LocalActionList actions={buildContactActions(brand, { interactive })} brand={brand} variant="contact" label="Contacto del local" />;
}
