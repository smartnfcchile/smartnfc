// Botón de acción de la experiencia pública del Local. Presentación pura, sin estado.
// Sin `href` se dibuja como elemento no navegable (vistas previas).
import { ChevronRight } from "lucide-react";
import type { ActionIconComponent } from "./action-icons";

export type LocalActionLinkProps = {
  icon: ActionIconComponent;
  label: string;
  detail?: string | null;
  href?: string;
  external?: boolean;
  variant?: "primary" | "secondary" | "contact";
  primaryColor: string;
  onPrimary: string;
};

export default function LocalActionLink({ icon: Icon, label, detail, href, external, variant = "secondary", primaryColor, onPrimary }: LocalActionLinkProps) {
  const primary = variant === "primary", contact = variant === "contact";
  const body = (
    <>
      <span className={`flex shrink-0 items-center justify-center ${contact ? "h-9 w-9 rounded-full" : "h-10 w-10 rounded-xl"}`}
        style={primary ? { backgroundColor: "rgba(255,255,255,0.18)", color: onPrimary } : { backgroundColor: `${primaryColor}14`, color: primaryColor }}>
        <Icon aria-hidden className={contact ? "h-[18px] w-[18px]" : "h-5 w-5"} />
      </span>
      <span className="min-w-0 flex-1 text-left">
        <span className={`block font-semibold leading-tight ${contact ? "text-[14.5px]" : "text-[15.5px]"}`}>{label}</span>
        {detail && <span className={`mt-0.5 block truncate text-[12.5px] ${primary ? "opacity-85" : "text-slate-500"}`}>{detail}</span>}
      </span>
      <ChevronRight aria-hidden className={`h-5 w-5 shrink-0 ${primary ? "opacity-70" : "text-slate-400"}`} />
    </>
  );
  const shape = primary
    ? "min-h-[64px] rounded-2xl px-4 py-3 shadow-[0_12px_28px_-14px_rgba(15,23,42,0.55)]"
    : contact
      ? "min-h-[56px] px-1 py-2.5 text-slate-900"
      : "min-h-[60px] rounded-2xl bg-white px-4 py-3 text-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.06)] ring-1 ring-slate-900/[0.07]";
  const interactive = href
    ? " transition duration-150 hover:-translate-y-px active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900" + (contact ? " hover:bg-slate-900/[0.03] rounded-xl" : "")
    : "";
  const className = `flex w-full items-center gap-3.5 ${shape}${interactive}`;
  const style = primary ? { backgroundColor: primaryColor, color: onPrimary } : undefined;
  return href ? (
    <a href={href} className={className} style={style} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>{body}</a>
  ) : (
    <div className={className} style={style}>{body}</div>
  );
}
