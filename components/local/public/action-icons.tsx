// Registro visual único de las acciones públicas: tipo → ícono → identidad de marca.
// Lucide para acciones genéricas y SVG internos (brand-icons.tsx) para marcas. Lo usan la Página del Local,
// todas las vistas previas, el Action Builder y el dashboard: no hay estilos de marca repartidos por componentes.
// Nombre, texto y validación de cada tipo viven en lib/local/public-actions.ts.
//
// Criterio visual: la marca se reconoce en el ícono y su contenedor; la tarjeta mantiene el diseño limpio del Local.
// - brand: contenedor con el color característico y glifo blanco (WhatsApp, Facebook, YouTube, LinkedIn, X, …).
// - gradient: contenedor con el degradado característico (Instagram).
// - google: contenedor blanco con la "G" multicolor.
// - local: acciones genéricas (web, teléfono, ubicación, correo, guardar contacto…) con el color del Local.
import type { ComponentType, CSSProperties } from "react";
import { BadgePercent, Globe, Link2, Mail, MapPin, Phone, UserPlus, UtensilsCrossed } from "lucide-react";
import type { PublicActionType } from "../../../lib/local/public-actions";
import { FacebookIcon, GoogleColorIcon, InstagramIcon, LinkedInIcon, ThreadsIcon, TikTokIcon, WhatsAppIcon, XIcon, YouTubeIcon } from "./brand-icons";

export type ActionIconComponent = ComponentType<{ className?: string; "aria-hidden"?: boolean; style?: CSSProperties }>;
type ActionTone =
  | { kind: "brand"; bg: string; fg: string; glyphStyle?: CSSProperties }
  | { kind: "gradient"; bg: string; fg: string }
  | { kind: "google" }
  | { kind: "local" };

export const ACTION_VISUALS: Record<PublicActionType, { icon: ActionIconComponent; tone: ActionTone }> = {
  WHATSAPP: { icon: WhatsAppIcon, tone: { kind: "brand", bg: "#25D366", fg: "#ffffff" } },
  INSTAGRAM: { icon: InstagramIcon, tone: { kind: "gradient", bg: "linear-gradient(45deg, #F58529 0%, #DD2A7B 45%, #8134AF 75%, #515BD4 100%)", fg: "#ffffff" } },
  FACEBOOK: { icon: FacebookIcon, tone: { kind: "brand", bg: "#1877F2", fg: "#ffffff" } },
  TIKTOK: { icon: TikTokIcon, tone: { kind: "brand", bg: "#000000", fg: "#ffffff", glyphStyle: { filter: "drop-shadow(-1px -1px 0 #25F4EE) drop-shadow(1px 1px 0 #FE2C55)" } } },
  YOUTUBE: { icon: YouTubeIcon, tone: { kind: "brand", bg: "#FF0000", fg: "#ffffff" } },
  LINKEDIN: { icon: LinkedInIcon, tone: { kind: "brand", bg: "#0A66C2", fg: "#ffffff" } },
  X: { icon: XIcon, tone: { kind: "brand", bg: "#000000", fg: "#ffffff" } },
  THREADS: { icon: ThreadsIcon, tone: { kind: "brand", bg: "#000000", fg: "#ffffff" } },
  GOOGLE_REVIEW: { icon: GoogleColorIcon, tone: { kind: "google" } },
  WEB: { icon: Globe, tone: { kind: "local" } },
  MENU: { icon: UtensilsCrossed, tone: { kind: "local" } },
  PROMOTION: { icon: BadgePercent, tone: { kind: "local" } },
  LOCATION: { icon: MapPin, tone: { kind: "local" } },
  PHONE: { icon: Phone, tone: { kind: "local" } },
  EMAIL: { icon: Mail, tone: { kind: "local" } },
  LINK: { icon: Link2, tone: { kind: "local" } },
  SAVE_CONTACT: { icon: UserPlus, tone: { kind: "local" } },
};

/** Compatibilidad: solo el ícono de cada tipo. */
export const ACTION_ICONS = Object.fromEntries(Object.entries(ACTION_VISUALS).map(([t, v]) => [t, v.icon])) as Record<PublicActionType, ActionIconComponent>;

const SIZES = {
  md: { box: "h-10 w-10 rounded-xl", glyph: "h-5 w-5" },
  sm: { box: "h-9 w-9 rounded-full", glyph: "h-[18px] w-[18px]" },
  xs: { box: "h-8 w-8 rounded-lg", glyph: "h-4 w-4" },
} as const;

/**
 * Ícono de una acción dentro de su contenedor, con la identidad de su marca o la del Local.
 * `onFill`: el ícono está sobre un botón relleno con el color del Local (acción principal).
 */
export function ActionGlyph({ type, size = "md", primaryColor = "#2563eb", onPrimary = "#ffffff", onFill = false, className = "" }: {
  type: PublicActionType; size?: keyof typeof SIZES; primaryColor?: string; onPrimary?: string; onFill?: boolean; className?: string;
}) {
  const { icon: Icon, tone } = ACTION_VISUALS[type] ?? ACTION_VISUALS.LINK;
  const s = SIZES[size];
  // Sobre el botón principal (relleno con el color del Local) el contenedor de marca lleva un aro claro para separarse.
  const ring = onFill && tone.kind !== "local" ? " ring-2 ring-white/60" : tone.kind === "google" ? " ring-1 ring-slate-900/10" : "";
  let style: CSSProperties, glyphStyle: CSSProperties | undefined;
  if (tone.kind === "brand") { style = { backgroundColor: tone.bg, color: tone.fg }; glyphStyle = tone.glyphStyle; }
  else if (tone.kind === "gradient") style = { backgroundImage: tone.bg, color: tone.fg };
  else if (tone.kind === "google") style = { backgroundColor: "#ffffff" };
  else style = onFill ? { backgroundColor: "rgba(255,255,255,0.18)", color: onPrimary } : { backgroundColor: `${primaryColor}14`, color: primaryColor };
  return (
    <span aria-hidden className={`flex shrink-0 items-center justify-center ${s.box}${ring} ${className}`} style={style}>
      <Icon aria-hidden className={s.glyph} style={glyphStyle} />
    </span>
  );
}

export function ActionIcon({ type, className }: { type: PublicActionType; className?: string }) {
  const Icon = ACTION_ICONS[type] ?? Link2;
  return <Icon aria-hidden className={className} />;
}
