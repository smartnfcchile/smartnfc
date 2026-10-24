// SmartNFC Personas: capa pública + configurador con vistas previas (P2) + resultado comercial y solicitud (P3).
// Precios: cardOrderPrice (tramos vigentes, IVA incluido). Sin biblioteca visual propia (P4; imágenes nuevas solo
// generadas y aprobadas en ChatGPT). Sin Pro ni captura de datos (D6), sin perfil permanente (D2), solicitud y no
// compra (D15). La página no está enlazada desde la portada ni en el sitemap, y sigue fuera de los buscadores
// hasta que se autorice su publicación.
import type { Metadata } from "next";
import Link from "next/link";
import SmartNFCLogo from "../../components/brand/SmartNFCLogo";
import PersonasFlow from "../../components/personas/PersonasFlow";
import PersonasFigure from "../../components/personas/PersonasFigure";
import { PERSONAS_HERO, PERSONAS_OG_ASSET, PERSONAS_PRODUCT_ASSET, PERSONAS_SEGMENT_ASSETS } from "../../content/personas/assets";
import { formatCLP } from "../../lib/commercial/public-offers";
import { PERSONAS_LANDING_FEATURES } from "../../content/personas/features";
import { personasConditions } from "../../lib/personas/quote";
import { PERSONAS_NOT_A_PURCHASE } from "../../content/personas/consent";
import { PRIVACY_PATH } from "../../content/legal/privacy";
import JsonLd from "../../components/seo/JsonLd";
import SocialLinks from "../../components/brand/SocialLinks";
import { faqSchema, graph, organizationSchema, serviceSchema } from "../../lib/seo/structured-data";
import styles from "./personas.module.css";

const title = "SmartNFC Personas | Tu contacto en una tarjeta NFC";
const description = "Una tarjeta con NFC y QR que abre tu perfil: WhatsApp, redes, tus trabajos y tus datos para guardarte. Sin aplicaciones.";

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  alternates: { canonical: "/personas" },
  openGraph: {
    title, description, url: "/personas", type: "website", locale: "es_CL", siteName: "SmartNFC",
    ...(PERSONAS_OG_ASSET ? { images: [{ url: PERSONAS_OG_ASSET.src, width: PERSONAS_OG_ASSET.width, height: PERSONAS_OG_ASSET.height, alt: PERSONAS_OG_ASSET.alt }] } : {}),
  },
  twitter: { card: "summary_large_image", title, description, ...(PERSONAS_OG_ASSET ? { images: [PERSONAS_OG_ASSET.src] } : {}) },
  robots: { index: true, follow: true }, // Indexación autorizada el 23-10-2026.
};

const AUDIENCES: readonly { uso: keyof typeof PERSONAS_SEGMENT_ASSETS; t: string; d: string }[] = [
  { uso: "personal", t: "Uso personal", d: "Comparte tu WhatsApp y tus redes sin dictar tu número ni deletrear tu usuario." },
  { uso: "oficio", t: "Oficios y trabajo independiente", d: "Que te guarden en el momento y puedan ver tus trabajos antes de llamarte." },
  { uso: "emprende", t: "Emprendimientos y creadores", d: "Tu catálogo, tu tienda o tus redes, a un toque del teléfono de tus clientes." },
  { uso: "profesional", t: "Profesionales", d: "Tu contacto, tu agenda o tu sitio en un perfil ordenado y fácil de guardar." },
];

const STEPS = [
  { t: "Acercas la tarjeta", d: "En teléfonos con NFC basta acercarla. En el resto, se escanea el código QR con la cámara." },
  { t: "Se abre tu perfil", d: "En el navegador, sin instalar aplicaciones: tus botones de contacto, redes y enlaces." },
  { t: "Te guardan o te escriben", d: "Con un toque te agregan a sus contactos o te escriben por WhatsApp." },
] as const;

const FAQ = [
  ["¿Necesito una aplicación?", "No. Tu perfil se abre en el navegador del teléfono: por NFC en equipos compatibles y por código QR en el resto."],
  ["¿Funciona con iPhone y Android?", "La mayoría de los teléfonos con NFC abren el perfil al acercar la tarjeta. Si el teléfono no tiene NFC o lo tiene desactivado, se escanea el QR impreso."],
  ["¿Puedo cambiar mis datos después?", "Sí. Editas tu perfil cuando lo necesites y la tarjeta sigue siendo la misma: no hay que reimprimirla."],
  ["¿Necesito tener una empresa?", "No. SmartNFC Personas es para cualquier persona. El campo de empresa es opcional."],
  ["¿Puedo mostrar mis trabajos o mi catálogo?", "Sí, con enlaces a donde ya estén publicados: redes sociales, un sitio, una carpeta o un PDF en línea. SmartNFC enlaza tu contenido; no lo aloja."],
] as const;

const CONDITIONS = personasConditions();
const PRICED = CONDITIONS.tiers.filter((t): t is typeof t & { unitClp: number } => t.unitClp !== null);
const range = (min: number, max: number | null) => (max === null ? `${min} o más` : `${min} a ${max}`);
const FAQ_ALL = [
  ...FAQ,
  ["¿Qué pasa si pierdo mi tarjeta?", `Puedes pedir una reposición por ${formatCLP(CONDITIONS.replacementClp)} (${CONDITIONS.taxNote}). Tu perfil sigue siendo el mismo.`],
] as const;

export default function PersonasPage() {
  const priceBody = (
    <>
      <ul className={styles.tiers}>
        {CONDITIONS.tiers.map(t => (
          <li key={t.min}><span>{range(t.min, t.max)} {t.min === 1 && t.max === 1 ? "tarjeta" : "tarjetas"}</span><b>{t.unitClp === null ? "Cotización" : `${formatCLP(t.unitClp)} c/u`}</b></li>
        ))}
      </ul>
      <ul className={styles.terms}>
        <li>{CONDITIONS.shippingNote}</li>
        <li>Reposición de una tarjeta: {formatCLP(CONDITIONS.replacementClp)}. Tarjeta adicional para tu mismo perfil: {formatCLP(CONDITIONS.additionalClp)}.</li>
        <li>{PERSONAS_NOT_A_PURCHASE}</li>
      </ul>
      <a className={styles.primary} href="#configurador">Arma tu tarjeta</a>
    </>
  );
  return (
    <div className={styles.page}>
      <JsonLd data={graph(organizationSchema(), serviceSchema({ path: "/personas", name: "SmartNFC Personas", description, serviceType: "Tarjeta NFC con perfil digital",
        aggregate: { low: Math.min(...PRICED.map(t => t.unitClp)), high: Math.max(...PRICED.map(t => t.unitClp)) } }), faqSchema(FAQ_ALL))} />
      <header className={styles.header}>
        <div className={styles.wrap}>
          <Link href="/" className={styles.logo} aria-label="SmartNFC, ir al inicio"><SmartNFCLogo size={26} /></Link>
          <nav aria-label="Principal" className={styles.nav}>
            <a href="#como-funciona" className={styles.navOptional}>Cómo funciona</a>
            <a href="#precio">Precio</a>
            <a href="#preguntas" className={styles.navOptional}>Preguntas</a>
            <Link href="/login">Ingresar</Link>
          </nav>
        </div>
      </header>

      <main>
        <section className={`${styles.hero} ${styles.wrap}`} aria-labelledby="personas-title">
          <div className={styles.heroText}>
            <p className={styles.eyebrow}>SmartNFC Personas</p>
            <h1 id="personas-title" className={styles.h1}>Tu contacto, en un toque.</h1>
            <p className={styles.lead}>Una tarjeta con NFC y QR que abre tu perfil: WhatsApp, redes, tus trabajos y tus datos para guardarte. Sin aplicaciones.</p>
            <div className={styles.heroActions}>
              <a className={styles.primary} href="#configurador">Arma tu tarjeta</a>
              <a className={styles.secondary} href="#precio">Ver precio</a>
            </div>
            <p className={styles.note}>Toma un par de minutos. No pedimos tus datos y nada se guarda mientras respondes.</p>
          </div>
          <PersonasFigure asset={PERSONAS_HERO} priority sizes="(max-width: 899px) 100vw, 50vw" className={styles.heroMedia} imageClassName={styles.heroImage} />
        </section>

        <section id="configurador" className={`fl-page ${styles.configurator}`} aria-label="Configurador de tu SmartNFC">
          <PersonasFlow exitHref="#precio" />
        </section>

        <section className={`${styles.section} ${styles.wrap}`} aria-labelledby="para-quien">
          <h2 id="para-quien" className={styles.h2}>Para quién es</h2>
          <p className={styles.sectionLead}>El mismo producto para todos: cambia lo que muestras en tu perfil.</p>
          <ul className={styles.cards}>
            {AUDIENCES.map(a => (
              <li key={a.t} className={PERSONAS_SEGMENT_ASSETS[a.uso] ? styles.cardWithMedia : undefined}>
                <PersonasFigure asset={PERSONAS_SEGMENT_ASSETS[a.uso]} sizes="(max-width: 719px) 100vw, (max-width: 899px) 50vw, 260px" className={styles.cardMedia} imageClassName={styles.cardImage} />
                <h3>{a.t}</h3><p>{a.d}</p>
              </li>
            ))}
          </ul>
        </section>

        <section id="como-funciona" className={`${styles.section} ${styles.wrap}`} aria-labelledby="como-funciona-title" tabIndex={-1}>
          <h2 id="como-funciona-title" className={styles.h2}>Cómo funciona</h2>
          <ol className={styles.steps}>
            {STEPS.map(s => <li key={s.t}><h3>{s.t}</h3><p>{s.d}</p></li>)}
          </ol>
          <p className={styles.sectionLead}>Cambias tus datos cuando quieras, sin reimprimir la tarjeta.</p>
        </section>

        <section className={`${styles.section} ${styles.wrap}`} aria-labelledby="que-incluye">
          <h2 id="que-incluye" className={styles.h2}>Qué puede mostrar tu perfil</h2>
          <ul className={styles.features}>
            {PERSONAS_LANDING_FEATURES.map(f => <li key={f.source}>{f.label}</li>)}
          </ul>
        </section>

        <section id="precio" className={`${styles.section} ${styles.wrap}`} aria-labelledby="precio-title" tabIndex={-1}>
          <h2 id="precio-title" className={styles.h2}>Precio y condiciones</h2>
          <p className={styles.sectionLead}>Pago único por tarjeta, {CONDITIONS.taxNote}. El precio del tramo se aplica a todas las tarjetas del pedido.</p>
          {PERSONAS_PRODUCT_ASSET ? (
            <div className={styles.priceLayout}>
              <PersonasFigure asset={PERSONAS_PRODUCT_ASSET} sizes="(max-width: 899px) 100vw, 480px" className={styles.productMedia} imageClassName={styles.productImage} />
              <div>{priceBody}</div>
            </div>
          ) : priceBody}
        </section>

        <section id="preguntas" className={`${styles.section} ${styles.wrap}`} aria-labelledby="faq-title">
          <h2 id="faq-title" className={styles.h2}>Preguntas frecuentes</h2>
          <div className={styles.faq}>
            {FAQ_ALL.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={`${styles.wrap} ${styles.footerRow}`}><span>© 2026 SmartNFC · Valdivia, Chile</span><Link href={PRIVACY_PATH} prefetch={false}>Aviso de privacidad</Link><SocialLinks /></div>
      </footer>
    </div>
  );
}
