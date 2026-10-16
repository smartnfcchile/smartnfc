// SmartNFC Locales (F2): capa pública indexable + experiencia conversacional.
// Todos los precios y condiciones salen de lib/commercial/public-offers.ts (F1). Sin Club (D9), sin captura de
// datos (D6) y sin contratación inmediata (D16). El resultado económico y la solicitud final (F3) viven en LocalesFlow.
import type { Metadata } from "next";
import Link from "next/link";
import SmartNFCLogo from "../../components/brand/SmartNFCLogo";
import LocalesFlow from "../../components/locales/LocalesFlow";
import SupportToken from "../../components/locales/SupportToken";
import { PACK_3_MINI_CLP, PACK_5_MINI_CLP, TAX_NOTE, formatCLP, getPublicOffer, priceOf } from "../../lib/commercial/public-offers";
import { MAX_POINT_ACTIONS } from "../../lib/local/public-actions";
import { SALES_WHATSAPP_DIGITS } from "../../content/locales/contact";
import styles from "./local.module.css";

const title = "SmartNFC Locales | Puntos NFC y QR para tu negocio";
const description = "Puntos NFC y QR con la marca de tu local: reseñas en Google, WhatsApp, redes, carta, promociones y ubicación en un solo toque. Arma tu propuesta en minutos.";

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  alternates: { canonical: "/local" },
  openGraph: { title, description, url: "/local", type: "website", locale: "es_CL", siteName: "SmartNFC" },
};

const WHATSAPP = `https://wa.me/${SALES_WHATSAPP_DIGITS}?text=${encodeURIComponent("Hola, quiero información sobre SmartNFC para mi local.")}`;

const FEATURES = [
  { t: "Tu marca en cada punto", d: "Una página con el logo, la portada y los colores de tu local." },
  { t: "Las acciones que tú eliges", d: `WhatsApp, reseñas en Google, redes sociales, carta, promociones, ubicación y teléfono. Hasta ${MAX_POINT_ACTIONS} acciones por punto, en el orden que quieras.` },
  { t: "Promociones con vigencia", d: "Cada promoción puede tener fecha de inicio y de término." },
  { t: "Cambia sin reimprimir", d: "El mismo NFC y QR sirven aunque cambies lo que abre el punto." },
  { t: "Visitas y clics por acción", d: "Métricas por período: hoy, esta semana, la semana pasada, este mes o un rango que elijas." },
] as const;

const STEPS = [
  { t: "Armamos tu propuesta", d: "Eliges qué quieres lograr y dónde irán los puntos. Los soportes llevan tu marca con personalización gráfica estándar." },
  { t: "Dejamos cada punto listo", d: "SmartNFC vincula el NFC y el QR de cada soporte antes de entregarlo." },
  { t: "Tus clientes acercan el teléfono", d: "Se abre tu página en el navegador, sin instalar nada. Tú cambias las acciones cuando quieras." },
] as const;

const FAQ = [
  ["¿Mis clientes necesitan una aplicación?", "No. La página se abre en el navegador del teléfono: por NFC en equipos compatibles y por código QR en el resto."],
  ["¿Puedo cambiar lo que abre el punto?", "Sí. Cambias las acciones desde tu panel y el soporte sigue siendo el mismo."],
  ["¿SmartNFC aloja mi carta o catálogo?", "No. El punto enlaza la carta o el catálogo que ya tengas publicado en internet: tu sitio web, un PDF en línea o una plataforma."],
  ["¿Qué pasa si pauso Local Pro?", "Tus locales, puntos y códigos se conservan. Mientras tanto, el punto muestra un aviso de «temporalmente inactivo» y, al reactivar, vuelve a abrir el mismo contenido."],
  ["¿Garantizan reseñas o seguidores?", "No. Medimos visitas y clics. No confirmamos reseñas publicadas, seguidores ni compras."],
] as const;

/** "A", "NFC", "QR", "B" → "a, NFC, QR y b" (las siglas conservan mayúsculas). */
function listText(items: readonly string[]) {
  const words = items.map(i => (/^[A-Z]{2,}$/.test(i) ? i : i[0].toLowerCase() + i.slice(1)));
  return words.length > 1 ? `${words.slice(0, -1).join(", ")} y ${words[words.length - 1]}` : words.join("");
}

export default function LocalPage() {
  const localPro = getPublicOffer("LOCAL_PRO");
  const monthly = priceOf("LOCAL_PRO", "monthly")!;
  const annual = priceOf("LOCAL_PRO", "annual");
  const supports = (["LOCAL_MINI", "LOCAL_STANDARD", "LOCAL_XL"] as const).map(id => ({ id, offer: getPublicOffer(id), price: priceOf(id, "one_time")! }));
  const includes = supports[0].offer.physical?.includes ?? [];

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.wrap}>
          <Link href="/" className={styles.logo} aria-label="SmartNFC, ir al inicio"><SmartNFCLogo size={26} /></Link>
          <nav aria-label="Principal" className={styles.nav}>
            <a href="#precios">Precios</a>
            <a href="#preguntas" className={styles.navOptional}>Preguntas</a>
            <Link href="/login">Ingresar</Link>
          </nav>
        </div>
      </header>

      <main>
        <section className={`${styles.hero} ${styles.wrap}`} aria-labelledby="local-title">
          <p className={styles.eyebrow}>SmartNFC Locales</p>
          <h1 id="local-title" className={styles.h1}>Convierte cada visita en una reseña, un seguidor o una conversación.</h1>
          <p className={styles.lead}>Un punto NFC y QR en tu mesón, tus mesas o tu entrada abre una página con tu marca y las acciones que tú eliges.</p>
          <div className={styles.heroActions}>
            <a className={styles.primary} href="#configurador">Arma tu propuesta</a>
            <a className={styles.secondary} href="#precios">Ver precios</a>
          </div>
          <p className={styles.note}>Toma unos minutos. No pedimos tus datos y nada se guarda mientras respondes.</p>
        </section>

        <section id="configurador" className={`fl-page ${styles.configurator}`} aria-label="Configurador de propuesta">
          <LocalesFlow exitHref="#precios" />
        </section>

        <section className={`${styles.section} ${styles.wrap}`} aria-labelledby="que-hace">
          <h2 id="que-hace" className={styles.h2}>Qué puede hacer tu punto</h2>
          <ul className={styles.features}>
            {FEATURES.map(f => <li key={f.t}><h3>{f.t}</h3><p>{f.d}</p></li>)}
          </ul>
        </section>

        <section className={`${styles.section} ${styles.wrap}`} aria-labelledby="como-funciona">
          <h2 id="como-funciona" className={styles.h2}>Cómo funciona</h2>
          <ol className={styles.steps}>
            {STEPS.map(s => <li key={s.t}><h3>{s.t}</h3><p>{s.d}</p></li>)}
          </ol>
        </section>

        <section id="precios" className={`${styles.section} ${styles.wrap}`} aria-labelledby="precios-title" tabIndex={-1}>
          <h2 id="precios-title" className={styles.h2}>Precios y condiciones</h2>
          <p className={styles.sectionLead}>Valores en pesos chilenos, {TAX_NOTE}. La licencia y los soportes se contratan por separado.</p>

          <div className={styles.priceGrid}>
            <article className={`${styles.card} ${styles.cardDark}`} aria-labelledby="price-local-pro">
              <p className={styles.cardKicker}>Licencia mensual</p>
              <h3 id="price-local-pro">{localPro.name}</h3>
              <p className={styles.price}>{formatCLP(monthly)}<span>/mes</span></p>
              {annual !== null && <p className={styles.altPrice}>Valor anual informado: {formatCLP(annual)}. Referencia comercial; esta página no ofrece contratación.</p>}
              <ul>
                <li>{localPro.limits?.locations} local y hasta {localPro.limits?.pointsPerLocation} puntos activos</li>
                <li>El cobro comienza desde la entrega operativa</li>
                <li>Más de {localPro.limits?.pointsPerLocation} puntos o varios locales: cotización</li>
              </ul>
            </article>

            <article className={styles.card} aria-labelledby="price-supports">
              <p className={styles.cardKicker}>Soportes · pago único</p>
              <h3 id="price-supports">Acrílico personalizado</h3>
              <ul className={styles.sizes}>
                {supports.map(s => (
                  <li key={s.id} className={styles.sizeRow}>
                    <span className={styles.sizeThumb}><SupportToken size={s.id} scale={2.2} /></span>
                    <span className={styles.sizeName}><b>{s.offer.name.replace("Soporte ", "")}</b> {s.offer.physical?.size}</span>
                    <b>{formatCLP(s.price)}</b>
                  </li>
                ))}
              </ul>
              <p className={styles.small}>Incluye {listText(includes)}.</p>
            </article>

            <article className={styles.card} aria-labelledby="price-packs">
              <p className={styles.cardKicker}>Packs Mini · pago único</p>
              <h3 id="price-packs">Para varias mesas</h3>
              <ul className={styles.sizes}>
                <li><span><b>Pack 3 Mini</b></span><b>{formatCLP(PACK_3_MINI_CLP)}</b></li>
                <li><span><b>Pack 5 Mini</b></span><b>{formatCLP(PACK_5_MINI_CLP)}</b></li>
              </ul>
              <p className={styles.small}>Solo soportes: no incluyen meses de licencia.</p>
            </article>
          </div>

          <ul className={styles.terms}>
            <li>Los soportes requieren una licencia {localPro.name} activa para funcionar.</li>
            <li>La instalación se cotiza aparte. El despacho se cobra según destino.</li>
            <li>La contratación se coordina directamente con nuestro equipo después de revisar tu propuesta.</li>
          </ul>
        </section>

        <section id="preguntas" className={`${styles.section} ${styles.wrap}`} aria-labelledby="faq-title">
          <h2 id="faq-title" className={styles.h2}>Preguntas frecuentes</h2>
          <div className={styles.faq}>
            {FAQ.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={styles.wrap}>
          <span>© 2026 SmartNFC · Valdivia, Chile</span>
          <a href={WHATSAPP} target="_blank" rel="noopener noreferrer">¿Prefieres conversar? Escríbenos por WhatsApp</a>
        </div>
      </footer>
    </div>
  );
}
