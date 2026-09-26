// Registro único de íconos por tipo de acción pública. Lucide para acciones genéricas y SVG
// internos para marcas. El Action Builder, la landing y las vistas previas usan este mismo registro
// (tipo → ícono; nombre, texto y validación viven en lib/local/public-actions.ts).
import { BadgePercent, Globe, Link2, MapPin, Phone, UtensilsCrossed } from "lucide-react";
import type { ComponentType } from "react";
import type { PublicActionType } from "../../../lib/local/public-actions";
import { FacebookIcon, GoogleIcon, InstagramIcon, LinkedInIcon, ThreadsIcon, TikTokIcon, WhatsAppIcon, XIcon, YouTubeIcon } from "./brand-icons";

export type ActionIconComponent = ComponentType<{ className?: string; "aria-hidden"?: boolean }>;

export const ACTION_ICONS: Record<PublicActionType, ActionIconComponent> = {
  WHATSAPP: WhatsAppIcon, INSTAGRAM: InstagramIcon, FACEBOOK: FacebookIcon, TIKTOK: TikTokIcon, YOUTUBE: YouTubeIcon,
  LINKEDIN: LinkedInIcon, X: XIcon, THREADS: ThreadsIcon, GOOGLE_REVIEW: GoogleIcon,
  WEB: Globe, MENU: UtensilsCrossed, PROMOTION: BadgePercent, LOCATION: MapPin, PHONE: Phone, LINK: Link2,
};

export function ActionIcon({ type, className }: { type: PublicActionType; className?: string }) {
  const Icon = ACTION_ICONS[type] ?? Link2;
  return <Icon aria-hidden className={className} />;
}
