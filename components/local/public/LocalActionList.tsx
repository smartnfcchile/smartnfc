// Dibuja PublicAction[] con el registro visual único (action-icons.tsx). La usan la landing pública y las vistas previas.
import type { PublicAction } from "../../../lib/local/public-actions";
import type { ResolvedLocalBrand } from "../../../lib/local/brand";
import LocalActionLink from "./LocalActionLink";

export default function LocalActionList({ actions, brand, variant, label }: {
  actions: PublicAction[]; brand: ResolvedLocalBrand; variant: "primary" | "secondary" | "contact"; label: string;
}) {
  if (!actions.length) return null;
  return (
    <nav aria-label={label} className={variant === "contact" ? "divide-y divide-slate-900/[0.06]" : "space-y-2.5"}>
      {actions.map(a => (
        <LocalActionLink key={a.key} type={a.type} label={a.label} detail={a.detail} href={a.href} ping={a.ping} external={a.external}
          variant={variant} primaryColor={brand.primaryColor} onPrimary={brand.onPrimary} />
      ))}
    </nav>
  );
}
