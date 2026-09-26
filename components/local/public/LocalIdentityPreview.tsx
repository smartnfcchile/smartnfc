// Vista previa del editor de identidad: es la misma LocalLandingView de la landing pública,
// sin acciones de objetivo (cada Punto Inteligente aporta las suyas) y sin enlaces navegables.
import type { ResolvedLocalBrand } from "../../../lib/local/brand";
import { buildContactActions } from "../../../lib/local/public-actions";
import LocalLandingView from "./LocalLandingView";

export default function LocalIdentityPreview({ brand, framed = true }: { brand: ResolvedLocalBrand; framed?: boolean }) {
  return (
    <LocalLandingView brand={brand} framed={framed} actions={buildContactActions(brand, { interactive: false })}
      emptyHint="Aquí aparecerán las acciones de cada Punto Inteligente, con la identidad de tu local." />
  );
}
