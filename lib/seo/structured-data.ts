// Datos estructurados Schema.org de SmartNFC. Solo información verificable: datos del responsable (aviso de
// privacidad), redes oficiales (content/social.ts), contenido visible de cada página y precios del motor comercial.
import { PRIVACY_CONTROLLER } from "../../content/legal/privacy";
import { SOCIAL_URLS } from "../../content/social";
import { SALES_WHATSAPP_DIGITS } from "../../content/locales/contact";

export const SITE_URL = "https://www.smartnfc.cl";
export const ORG_ID = `${SITE_URL}/#organization`;

export function organizationSchema() {
  return {
    "@type": "Organization", "@id": ORG_ID, name: "SmartNFC", legalName: PRIVACY_CONTROLLER.legalName, url: `${SITE_URL}/`,
    email: PRIVACY_CONTROLLER.email, telephone: `+${SALES_WHATSAPP_DIGITS}`,
    address: { "@type": "PostalAddress", addressLocality: "Valdivia", addressCountry: "CL" },
    areaServed: "Chile", sameAs: [...SOCIAL_URLS],
  };
}

export function faqSchema(faq: readonly (readonly [string, string])[]) {
  return { "@type": "FAQPage", mainEntity: faq.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) };
}

type Offer = { name: string; price: number; unit?: string };
/** Servicio de una landing, con ofertas solo si la página muestra esos precios (CLP, IVA incluido). */
export function serviceSchema(input: { path: string; name: string; description: string; serviceType: string; offers?: Offer[]; aggregate?: { low: number; high: number } }) {
  const url = `${SITE_URL}${input.path}`;
  return {
    "@type": "Service", "@id": `${url}#service`, name: input.name, description: input.description, serviceType: input.serviceType, url,
    provider: { "@id": ORG_ID }, areaServed: { "@type": "Country", name: "Chile" },
    ...(input.aggregate ? { offers: { "@type": "AggregateOffer", priceCurrency: "CLP", lowPrice: input.aggregate.low, highPrice: input.aggregate.high } } : {}),
    ...(input.offers ? { offers: input.offers.map(o => ({ "@type": "Offer", name: o.name, price: o.price, priceCurrency: "CLP",
      ...(o.unit ? { priceSpecification: { "@type": "UnitPriceSpecification", price: o.price, priceCurrency: "CLP", unitText: o.unit } } : {}) })) } : {}),
  };
}

export function graph(...nodes: object[]) {
  return { "@context": "https://schema.org", "@graph": nodes };
}
