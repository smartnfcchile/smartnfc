// Acciones de contacto derivadas de la identidad del Local (teléfono, web, ubicación).
import { Globe, MapPin, Phone } from "lucide-react";
import { phoneHref, type ResolvedLocalBrand } from "../../../lib/local/brand";
import LocalActionLink from "./LocalActionLink";

function hostOf(url: string) { try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; } }
function prettyPhone(phone: string) {
  const m = /^\+56(9)(\d{4})(\d{4})$/.exec(phone);
  return m ? `+56 ${m[1]} ${m[2]} ${m[3]}` : phone;
}

export default function LocalContactActions({ brand, interactive = false }: { brand: ResolvedLocalBrand; interactive?: boolean }) {
  const common = { primaryColor: brand.primaryColor, onPrimary: brand.onPrimary };
  const actions = [
    brand.phone && { key: "phone", icon: Phone, label: "Llamar", detail: prettyPhone(brand.phone), href: phoneHref(brand.phone), external: false },
    brand.mapsUrl && { key: "maps", icon: MapPin, label: "Cómo llegar", detail: brand.address || "Abrir en el mapa", href: brand.mapsUrl, external: true },
    brand.websiteUrl && { key: "web", icon: Globe, label: "Sitio web", detail: hostOf(brand.websiteUrl), href: brand.websiteUrl, external: true },
  ].filter(Boolean) as Array<{ key: string; icon: typeof Phone; label: string; detail: string; href: string; external: boolean }>;
  if (!actions.length) return null;
  return (
    <nav aria-label="Contacto del local" className="space-y-2.5">
      {actions.map((a, i) => (
        <LocalActionLink key={a.key} {...common} icon={a.icon} label={a.label} detail={a.detail}
          href={interactive ? a.href : undefined} external={a.external} variant={i === 0 ? "primary" : "secondary"} />
      ))}
    </nav>
  );
}
