// Versión PÚBLICA de una tarjeta para /c/[slug] (BUG-E2E-2, privacidad, 27-oct-2026).
//
// Todo lo que se entrega a un componente cliente se serializa en el HTML de la página. Por eso el perfil
// público recibe solo esta proyección, construida en el servidor con una lista cerrada de campos:
//   - Un dato de contacto o red social con «Mostrar» desmarcado sale como null: no aparece en la página,
//     en el HTML, en la vCard ni en ninguna otra salida pública. En la base se conserva intacto y el
//     propietario lo sigue viendo en su editor (que no usa esta función).
//   - De la empresa solo se publican name e isActive (lo que usa el perfil). Nunca notas internas, plan,
//     licencias, límites ni fechas.
//   - Sin userId, companyId ni otros identificadores internos más allá del id de la tarjeta (necesario para
//     la analítica pública existente).

import type { CardLinkData, CardProfileData } from "../../components/card-profile/CardProfileView";

type Nullable<T> = T | null | undefined;

/** Fila de base de datos (Card + links + company) tal como la carga /c/[slug]; puede traer campos de más. */
export type CardRowForPublicProfile = {
  id: string; slug: string; name: string; isActive: boolean;
  themeColor: string; themeMode: string; template: string; bannerStyle: string; photoStyle: string;
  logoUrl: Nullable<string>; avatarUrl: Nullable<string>; coverUrl: Nullable<string>; heroImageUrl: Nullable<string>;
  profileName: Nullable<string>; role: Nullable<string>; companyName: Nullable<string>; bio: Nullable<string>; location: Nullable<string>;
  videoUrl: Nullable<string>; videoTitle: Nullable<string>;
  email: Nullable<string>; phone: Nullable<string>; whatsapp: Nullable<string>;
  instagram: Nullable<string>; facebook: Nullable<string>; linkedin: Nullable<string>; tiktok: Nullable<string>; youtube: Nullable<string>;
  showEmail: boolean; showPhone: boolean; showWhatsapp: boolean; showInstagram: boolean; showFacebook: boolean;
  showLinkedin: boolean; showTiktok: boolean; showYoutube: boolean;
  shareContactEnabled: boolean; shareContactButtonText: string; shareContactIntro: string; shareContactConfirm: string;
  shareContactConsent: string; shareContactFields?: unknown; primaryActionType: string; secondaryActionType: string;
  company: { name: string; isActive: boolean };
  links: Array<{ id: string; title: string; url: string; order: number; isActive: boolean }>;
};

const onlyIfShown = (shown: boolean, value: Nullable<string>) => (shown ? value ?? null : null);

export function toPublicCardProfile(card: CardRowForPublicProfile, options: { shareContactEnabled: boolean }): CardProfileData {
  const links: CardLinkData[] = card.links
    .filter((l) => l.isActive)
    .map((l) => ({ id: l.id, title: l.title, url: l.url, order: l.order, isActive: l.isActive }));

  return {
    id: card.id,
    slug: card.slug,
    name: card.name,
    isActive: card.isActive,
    themeColor: card.themeColor,
    themeMode: card.themeMode,
    template: card.template,
    bannerStyle: card.bannerStyle,
    photoStyle: card.photoStyle,
    logoUrl: card.logoUrl ?? null,
    avatarUrl: card.avatarUrl ?? null,
    coverUrl: card.coverUrl ?? null,
    heroImageUrl: card.heroImageUrl ?? null,
    profileName: card.profileName ?? null,
    role: card.role ?? null,
    companyName: card.companyName ?? null,
    bio: card.bio ?? null,
    location: card.location ?? null,
    videoUrl: card.videoUrl ?? null,
    videoTitle: card.videoTitle ?? null,

    email: onlyIfShown(card.showEmail, card.email),
    phone: onlyIfShown(card.showPhone, card.phone),
    whatsapp: onlyIfShown(card.showWhatsapp, card.whatsapp),
    instagram: onlyIfShown(card.showInstagram, card.instagram),
    facebook: onlyIfShown(card.showFacebook, card.facebook),
    linkedin: onlyIfShown(card.showLinkedin, card.linkedin),
    tiktok: onlyIfShown(card.showTiktok, card.tiktok),
    youtube: onlyIfShown(card.showYoutube, card.youtube),
    showEmail: card.showEmail,
    showPhone: card.showPhone,
    showWhatsapp: card.showWhatsapp,
    showInstagram: card.showInstagram,
    showFacebook: card.showFacebook,
    showLinkedin: card.showLinkedin,
    showTiktok: card.showTiktok,
    showYoutube: card.showYoutube,

    company: { name: card.company.name, isActive: card.company.isActive },
    links,

    shareContactEnabled: options.shareContactEnabled,
    shareContactButtonText: card.shareContactButtonText,
    shareContactIntro: card.shareContactIntro,
    shareContactConfirm: card.shareContactConfirm,
    shareContactConsent: card.shareContactConsent,
    shareContactFields: card.shareContactFields,
    primaryActionType: card.primaryActionType,
    secondaryActionType: card.secondaryActionType,
  };
}
