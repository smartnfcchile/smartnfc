// Registro único de íconos por tipo de acción pública. Lucide para acciones genéricas y SVG
// internos para marcas. El Action Builder usará exactamente este mismo registro.
import { BadgePercent, Globe, Link2, MapPin, Phone, UtensilsCrossed } from "lucide-react";
import type { ComponentType } from "react";
import type { PublicActionType } from "../../../lib/local/public-actions";
import { FacebookIcon, GoogleIcon, InstagramIcon, LinkedInIcon, ThreadsIcon, TikTokIcon, WhatsAppIcon, XIcon, YouTubeIcon } from "./brand-icons";

export type ActionIconComponent = ComponentType<{ className?: string; "aria-hidden"?: boolean }>;

export const ACTION_ICONS: Record<PublicActionType, ActionIconComponent> = {
  whatsapp: WhatsAppIcon, instagram: InstagramIcon, facebook: FacebookIcon, tiktok: TikTokIcon, youtube: YouTubeIcon,
  linkedin: LinkedInIcon, x: XIcon, threads: ThreadsIcon, google_review: GoogleIcon,
  web: Globe, menu: UtensilsCrossed, promotion: BadgePercent, location: MapPin, phone: Phone, link: Link2,
};

export function ActionIcon({ type, className }: { type: PublicActionType; className?: string }) {
  const Icon = ACTION_ICONS[type] ?? Link2;
  return <Icon aria-hidden className={className} />;
}
