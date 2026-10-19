// Datos de ejemplo de SmartNFC Personas (P2): del modelo de respuestas a las entradas de los componentes reales
// (CardProfileView en vista previa y CardPreview). Todo es ficticio: nombres aprobados, contactos de ejemplo
// (dominio reservado example.com, número sin dueño) y enlaces genéricos que en vista previa no navegan.
// El QR de demostración apunta a una ruta real de SmartNFC (/personas), nunca a un perfil inexistente.
import type { CardProfileData } from "../../components/card-profile/CardProfileView";
import { PHYSICAL_CARD_TEMPLATES, makeTemplateSide, type CardSideDesign } from "../physical-card/templates";
import { getPublicUrl } from "../public-url";
import { PERSONAS_LABELS } from "../../content/flows/personas";
import { exampleIdentity, profileStyle, type ContenidoDonde, type Estilo, type PersonasAnswersModel, type Red } from "./answers";

export const PREVIEW_CARD_ID = "personas-vista-previa";
/** Ruta real a la que lleva el QR de la tarjeta de ejemplo. */
export const DEMO_QR_PATH = "/personas";
export const demoQrUrl = () => getPublicUrl(DEMO_QR_PATH);

/** Contactos ficticios: nunca se muestran como enlaces en la vista previa. */
export const EXAMPLE_CONTACT = {
  phone: "+56 9 0000 0000",
  emailDomain: "example.com",
  location: "Valdivia, Los Ríos",
} as const;

const NETWORK_URL: Record<Red, string> = {
  INSTAGRAM: "https://www.instagram.com/", FACEBOOK: "https://www.facebook.com/", LINKEDIN: "https://www.linkedin.com/",
  TIKTOK: "https://www.tiktok.com/", YOUTUBE: "https://www.youtube.com/",
};
const NETWORK_FIELD = {
  INSTAGRAM: ["instagram", "showInstagram"], FACEBOOK: ["facebook", "showFacebook"], LINKEDIN: ["linkedin", "showLinkedin"],
  TIKTOK: ["tiktok", "showTiktok"], YOUTUBE: ["youtube", "showYoutube"],
} as const satisfies Record<Red, readonly [keyof CardProfileData, keyof CardProfileData]>;

const WORKS_TITLE: Record<ContenidoDonde, string> = {
  instagram: "Mis trabajos en Instagram", web: "Portafolio en línea", youtube: "Mis videos en YouTube", none: "Mis trabajos",
};
const CATALOG_TITLE: Record<ContenidoDonde, string> = {
  instagram: "Catálogo en Instagram", web: "Catálogo en línea", youtube: "Catálogo en video", none: "Catálogo",
};

const slugName = (name: string) => name.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z]+/g, ".");

/** Perfil de ejemplo para CardProfileView (isPreview). Sin captura de datos (D6) ni empresa. */
export function previewProfile(model: PersonasAnswersModel): CardProfileData {
  const { name, role } = exampleIdentity(model);
  const { template, themeColor } = profileStyle(model);
  const show = (x: (typeof model.mostrar)[number]) => model.mostrar.includes(x);
  const donde = model.contenidoDonde ?? "web";
  const links = [
    show("trabajos") && { title: WORKS_TITLE[donde], url: "https://example.com/trabajos" },
    show("catalogo") && { title: CATALOG_TITLE[donde], url: "https://example.com/catalogo" },
    show("agenda") && { title: "Agenda o sitio web", url: "https://example.com/agenda" },
  ].filter((l): l is { title: string; url: string } => !!l)
    .map((l, i) => ({ id: `ejemplo-${i}`, title: l.title, url: l.url, order: i, isActive: true }));

  const networks: Partial<CardProfileData> = {};
  for (const red of model.redes) {
    const [field, flag] = NETWORK_FIELD[red];
    Object.assign(networks, { [field]: NETWORK_URL[red], [flag]: true });
  }

  return {
    id: PREVIEW_CARD_ID, slug: "vista-previa", name, isActive: true,
    themeColor, themeMode: template === "classic-light" ? "light" : "dark", template,
    bannerStyle: "straight", photoStyle: "circle",
    logoUrl: null, avatarUrl: null, coverUrl: null, heroImageUrl: null,
    profileName: name, role, companyName: null, bio: null,
    location: show("zona") ? EXAMPLE_CONTACT.location : null,
    videoUrl: null, videoTitle: null, // sin iframe de YouTube (tercero)
    email: show("correo") ? `${slugName(name)}@${EXAMPLE_CONTACT.emailDomain}` : null,
    phone: show("llamada") ? EXAMPLE_CONTACT.phone : null,
    whatsapp: show("whatsapp") ? EXAMPLE_CONTACT.phone : null,
    instagram: null, facebook: null, linkedin: null, tiktok: null, youtube: null,
    showEmail: show("correo"), showPhone: show("llamada"), showWhatsapp: show("whatsapp"),
    showInstagram: false, showFacebook: false, showLinkedin: false, showTiktok: false, showYoutube: false,
    ...networks,
    company: { name: "", isActive: true },
    links,
    shareContactEnabled: false, shareContactButtonText: "", shareContactIntro: "", shareContactConfirm: "", shareContactConsent: "",
    primaryActionType: "WHATSAPP", secondaryActionType: "SAVE_CONTACT",
  };
}

/**
 * Plantilla física profesional por estilo del perfil. Se usa la plantilla real del editor de tarjetas;
 * solo cambian nombre, cargo, color principal y textos de ejemplo.
 */
export const ESTILO_PHYSICAL_TEMPLATE: Record<Estilo, string> = {
  // Claro (perfil limpio) ↔ minimalista; Llamativo (bloques de color y bordes marcados) ↔ banda ancha de color.
  oscuro: "franja-lateral", claro: "minimalista", diagonal: "corporativa-oscura", llamativo: "corporativa-clara",
};

export function previewCardSides(model: PersonasAnswersModel): { front: CardSideDesign; back: CardSideDesign } {
  const slug = ESTILO_PHYSICAL_TEMPLATE[model.estilo ?? "oscuro"];
  const template = PHYSICAL_CARD_TEMPLATES.find(t => t.slug === slug && t.category === "PROFESSIONAL");
  if (!template) throw new Error(`Plantilla física no encontrada: ${slug}`);
  const { name, role } = exampleIdentity(model);
  const { themeColor } = profileStyle(model);
  // En la plantilla minimalista el color de marca es el acento (secondary); en las demás, el bloque principal.
  const accent = template.layout === "minimal" ? { secondary: themeColor } : { primary: themeColor };
  const custom = (side: CardSideDesign): CardSideDesign => ({
    ...side, ...accent, name, position: role ?? "", company: "", tagline: "Acerca tu teléfono y guárdame",
  });
  return {
    front: custom(makeTemplateSide(template, false)),
    // Reverso sin frase: el QR queda libre también en móviles angostos; la nota bajo la tarjeta explica adónde lleva.
    back: { ...custom(makeTemplateSide(template, true)), tagline: "" },
  };
}

/** Texto equivalente de la vista previa para lectores de pantalla (el teléfono dibujado es decorativo). */
export function previewSummaryText(model: PersonasAnswersModel): string {
  const { name, role } = exampleIdentity(model);
  const shows = model.mostrar.map(m => PERSONAS_LABELS.mostrar[m]);
  const parts = [`Perfil de ejemplo de ${name}${role ? `, ${role}` : ""}.`];
  parts.push(shows.length ? `Mostraría: ${[...shows, "Guardar contacto", "Compartir"].join(", ")}.` : "Aún no eliges qué mostrar.");
  if (model.redes.length) parts.push(`Redes: ${model.redes.map(r => PERSONAS_LABELS.redes[r]).join(", ")}.`);
  if (model.estilo) parts.push(`Estilo ${PERSONAS_LABELS.estilo[model.estilo].toLowerCase()}${model.color ? `, color ${PERSONAS_LABELS.color[model.color].toLowerCase()}` : ""}.`);
  return parts.join(" ");
}
