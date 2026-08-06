export type PhysicalCategory = "PROFESSIONAL" | "LOCAL";

export type CardSideDesign = {
  schemaVersion: 1;
  layout: string;
  background: string;
  primary: string;
  secondary: string;
  text: string;
  muted: string;
  name: string;
  position: string;
  company: string;
  tagline: string;
  phone: string;
  email: string;
  website: string;
  instagram: string;
  address: string;
  logoUrl: string;
  photoUrl: string;
  qrSizeMm: number;
  qrVisible: boolean;
  nfcVisible: boolean;
  nfcText: string;
  alignment: "left" | "center" | "right";
};

type TemplateSeed = {
  slug: string;
  name: string;
  category: PhysicalCategory;
  description: string;
  layout: string;
  colors: [string, string, string, string, string];
  premium?: boolean;
};

export const PHYSICAL_CARD_TEMPLATES: TemplateSeed[] = [
  { slug: "corporativa-oscura", name: "Corporativa oscura", category: "PROFESSIONAL", description: "Bloque editorial y acento diagonal.", layout: "diagonal", colors: ["#07101F", "#2563EB", "#D4AF37", "#F8FAFC", "#94A3B8"] },
  { slug: "corporativa-clara", name: "Corporativa clara", category: "PROFESSIONAL", description: "Espacios amplios y banda inferior.", layout: "bottom-band", colors: ["#F8FAFC", "#2563EB", "#D4AF37", "#0F172A", "#475569"] },
  { slug: "ejecutiva-fotografia", name: "Ejecutiva con fotografía", category: "PROFESSIONAL", description: "Retrato protagonista y datos compactos.", layout: "photo-split", colors: ["#0F172A", "#2563EB", "#D4AF37", "#F8FAFC", "#CBD5E1"] },
  { slug: "minimalista", name: "Minimalista", category: "PROFESSIONAL", description: "Tipografía limpia y máximo aire.", layout: "minimal", colors: ["#FFFFFF", "#0F172A", "#2563EB", "#0F172A", "#64748B"] },
  { slug: "franja-lateral", name: "Franja lateral corporativa", category: "PROFESSIONAL", description: "Identidad vertical de alto contraste.", layout: "side-stripe", colors: ["#162033", "#2563EB", "#D4AF37", "#F8FAFC", "#94A3B8"] },
  { slug: "premium-qr", name: "Premium con QR destacado", category: "PROFESSIONAL", description: "QR central y acabado premium.", layout: "qr-hero", colors: ["#07101F", "#D4AF37", "#2563EB", "#F8FAFC", "#CBD5E1"], premium: true },
  { slug: "club-clientes", name: "Club de clientes", category: "LOCAL", description: "Invitación cálida con sello de club.", layout: "club", colors: ["#172554", "#2563EB", "#F59E0B", "#F8FAFC", "#BFDBFE"] },
  { slug: "promociones", name: "Promociones", category: "LOCAL", description: "Oferta protagonista y QR inmediato.", layout: "promo", colors: ["#7C2D12", "#F97316", "#FDE047", "#FFF7ED", "#FED7AA"] },
  { slug: "menu-catalogo", name: "Menú o catálogo", category: "LOCAL", description: "Composición de menú con QR destacado.", layout: "menu", colors: ["#14532D", "#22C55E", "#FACC15", "#F0FDF4", "#BBF7D0"] },
  { slug: "contacto-rapido", name: "Contacto rápido", category: "LOCAL", description: "Teléfono y dirección de lectura rápida.", layout: "contact", colors: ["#0F172A", "#06B6D4", "#D4AF37", "#F8FAFC", "#A5F3FC"] },
  { slug: "redes-sociales", name: "Redes sociales", category: "LOCAL", description: "Identidad social y usuario protagonista.", layout: "social", colors: ["#4C1D95", "#A855F7", "#EC4899", "#FAF5FF", "#E9D5FF"] },
  { slug: "fidelizacion", name: "Fidelización", category: "LOCAL", description: "Mensaje de recompensa y retorno.", layout: "loyalty", colors: ["#1E3A8A", "#2563EB", "#D4AF37", "#EFF6FF", "#BFDBFE"] },
];

export function makeTemplateSide(template: TemplateSeed, back = false): CardSideDesign {
  const [background, primary, secondary, text, muted] = template.colors;
  return {
    schemaVersion: 1, layout: back ? `${template.layout}-back` : template.layout,
    background, primary, secondary, text, muted, name: "Nombre Apellido", position: "Cargo profesional",
    company: "Empresa", tagline: template.category === "LOCAL" ? "Conoce nuestras novedades" : "Conectemos",
    phone: "", email: "", website: "", instagram: "", address: "", logoUrl: "", photoUrl: "",
    qrSizeMm: 22, qrVisible: back, nfcVisible: !back, nfcText: "Acerca tu teléfono",
    alignment: back ? "center" : "left",
  };
}

export const TEMPLATE_EDITABLE_FIELDS = {
  content: ["name", "position", "company", "tagline", "phone", "email", "website", "instagram", "address", "nfcText"],
  identity: ["logoUrl", "photoUrl", "background", "primary", "secondary", "text", "muted"],
  elements: ["qrVisible", "nfcVisible"], distribution: ["alignment", "qrSizeMm"],
};
