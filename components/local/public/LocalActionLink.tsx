// Botón de acción de la experiencia pública del Local (base para el registro de acciones del Bloque 3).
// Sin `href` se renderiza como elemento no navegable (vista previa).
import { ChevronRight, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export type LocalActionLinkProps = {
  icon: LucideIcon | ((props: { className?: string; "aria-hidden"?: boolean }) => ReactNode);
  label: string;
  detail?: string | null;
  href?: string;
  external?: boolean;
  variant?: "primary" | "secondary";
  primaryColor: string;
  onPrimary: string;
};

export default function LocalActionLink({ icon: Icon, label, detail, href, external, variant = "secondary", primaryColor, onPrimary }: LocalActionLinkProps) {
  const primary = variant === "primary";
  const body = (
    <>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
        style={primary ? { backgroundColor: "rgba(255,255,255,0.18)", color: onPrimary } : { backgroundColor: `${primaryColor}14`, color: primaryColor }}>
        <Icon aria-hidden className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1 text-left">
        <span className="block text-[15px] font-semibold leading-tight">{label}</span>
        {detail && <span className={`mt-0.5 block truncate text-[12.5px] ${primary ? "opacity-80" : "text-slate-500"}`}>{detail}</span>}
      </span>
      <ChevronRight aria-hidden className={`h-5 w-5 shrink-0 ${primary ? "opacity-70" : "text-slate-400"}`} />
    </>
  );
  const className = `flex min-h-[64px] w-full items-center gap-3.5 rounded-2xl px-4 py-3 transition duration-150 ${
    primary ? "shadow-[0_10px_24px_-12px_rgba(15,23,42,0.45)]" : "border border-slate-200 bg-white text-slate-900 shadow-sm"
  } ${href ? "active:scale-[0.99] hover:-translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900" : ""}`;
  const style = primary ? { backgroundColor: primaryColor, color: onPrimary } : undefined;
  return href ? (
    <a href={href} className={className} style={style} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>{body}</a>
  ) : (
    <div className={className} style={style}>{body}</div>
  );
}
