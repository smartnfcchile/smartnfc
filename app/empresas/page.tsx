// SmartNFC Empresas: landing para responsables comerciales, gerencias y administración de equipos.
// Modelo comercial (19-10-2026): dos componentes independientes. 1) Suscripción mensual de la plataforma (Equipo 5,
// 10 y 25 desde teamPlanFor; sobre 25, «Empresa 26+» por cotización). 2) Tarjetas físicas, pago único por volumen
// (cardOrderPrice; desde 50, cotización). Ningún plan incluye tarjetas. Montos solo desde el motor comercial.
// Altas de Equipo suspendidas (D16): cierre por solicitud. Sin CRM ni captura de prospectos (D10, D6). Sin
// permanencia (D2). Fuera de buscadores y del sitemap hasta autorizar el lanzamiento (EMPRESAS_PUBLISHED).
import type { Metadata } from "next";
import Link from "next/link";
import SmartNFCLogo from "../../components/brand/SmartNFCLogo";
import EmpresasFlow from "../../components/empresas/EmpresasFlow";
import EmpresasFigure from "../../components/empresas/EmpresasFigure";
import { EMPRESAS_SLOTS } from "../../content/empresas/assets";
import { EMPRESAS_FEATURES, EMPRESAS_PROFILE_FEATURES } from "../../content/empresas/features";
import { EMPRESAS_NOT_A_PURCHASE } from "../../content/empresas/consent";
import { EMPRESAS_PUBLISHED } from "../../content/empresas/launch";
import { PRIVACY_PATH } from "../../content/legal/privacy";
import { SALES_WHATSAPP_DIGITS } from "../../content/locales/contact";
import { formatCLP } from "../../lib/commercial/public-offers";
import { empresasConditions } from "../../lib/empresas/quote";
import JsonLd from "../../components/seo/JsonLd";
import SocialLinks from "../../components/brand/SocialLinks";
import { faqSchema, graph, organizationSchema, serviceSchema } from "../../lib/seo/structured-data";
import styles from "./empresas.module.css";

const title = "SmartNFC Empresas | Identidad digital y tarjetas NFC para tu equipo";
const description = "Administra los perfiles digitales y las tarjetas NFC de tu equipo desde un solo panel: altas, bajas, imagen corporativa y métricas del equipo.";
const OG = EMPRESAS_SLOTS.og.asset;

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  alternates: { canonical: "/empresas" },
  openGraph: {
    title, description, url: "/empresas", type: "website", locale: "es_CL", siteName: "SmartNFC",
    ...(OG ? { images: [{ url: OG.src, width: OG.width, height: OG.height, alt: OG.alt }] } : {}),
  },
  twitter: { card: "summary_large_image", title, description, ...(OG ? { images: [OG.src] } : {}) },
  robots: EMPRESAS_PUBLISHED ? { index: true, follow: true } : { index: false, follow: false },
};

const C = empresasConditions();
const WHATSAPP = `https://wa.me/${SALES_WHATSAPP_DIGITS}?text=${encodeURIComponent("Hola, quiero conversar sobre SmartNFC Empresas para mi equipo.")}`;
const range = (min: number, max: number | null) => (max === null ? `${min} o más` : `${min} a ${max}`);

const PROBLEMS = [
  { t: "Se desactualizan", d: "Un cambio de cargo, de teléfono o de sitio deja cajas completas de tarjetas con datos antiguos." },
  { t: "Cada cambio es reimprimir", d: "Corregir un dato significa encargar, esperar y repartir tarjetas otra vez." },
  { t: "Imagen dispareja", d: "Cada persona termina con su propia versión de la marca, el cargo o los enlaces." },
  { t: "Siguen circulando", d: "Cuando alguien deja el equipo, sus tarjetas siguen entregando un contacto que ya no responde." },
] as const;

const STEPS = [
  { t: "Das de alta al equipo", d: "Un administrador invita a cada persona desde el panel. Cada una recibe su acceso y su perfil." },
  { t: "Defines la imagen", d: "Eliges quién edita qué y preparas las tarjetas con plantillas para impresión CR80." },
  { t: "Comparten en un toque", d: "Al acercar la tarjeta al teléfono, o con su código QR, se abre el perfil: sin aplicaciones." },
  { t: "Mantienes todo al día", d: "Los cambios se hacen en el perfil y la tarjeta sigue siendo la misma." },
] as const;

const COMPARISON: readonly [string, string, string][] = [
  ["Cambiar un dato", "Reimprimir las tarjetas", "Editar el perfil; la tarjeta no cambia"],
  ["Imagen de la marca", "Depende de cada impresión", "Política de edición definida por la empresa"],
  ["Cuando alguien deja el equipo", "Sus tarjetas siguen circulando", "Se suspende su acceso y su perfil deja de funcionar"],
  ["Guardar el contacto", "Se transcribe a mano", "Un toque en «guardar contacto»"],
  ["Saber si se usan", "No hay forma de saberlo", "Métricas de visitas y toques del equipo"],
];

const FAQ: readonly [string, string][] = [
  ["¿El plan incluye las tarjetas?", "No. La suscripción mensual cubre la plataforma y la administración de perfiles. Las tarjetas físicas se compran aparte, con pago único y precio por volumen."],
  ["¿Una identidad digital es lo mismo que una tarjeta?", "No. Cada persona del plan tiene una identidad digital (su perfil). Puede usarla con una tarjeta física, con su código QR o con su enlace."],
  ["¿Qué pasa si necesitamos más de 25 perfiles?", "Preparamos una cotización personalizada para tu equipo."],
  ["¿Puedo cambiar de plan?", "Sí. Los cambios de plan rigen al término del período, sin prorrateo."],
  ["¿Qué pasa si alguien pierde su tarjeta?", `Se pide una reposición por ${formatCLP(C.replacementClp)} (${C.taxNote}). El perfil de la persona sigue siendo el mismo.`],
  ["¿Necesitan instalar una aplicación?", "No. El perfil se abre en el navegador del teléfono: por NFC en equipos compatibles y por código QR en el resto."],
  ["¿Puedo contratar en línea?", "Por ahora no. Las altas de los planes Equipo se coordinan con nuestro equipo comercial: envías una solicitud y te respondemos con una propuesta."],
];

export default function EmpresasPage() {
  return (
    <div className={styles.page}>
      <JsonLd data={graph(organizationSchema(), serviceSchema({ path: "/empresas", name: "SmartNFC Empresas", description, serviceType: "Administración de perfiles digitales y tarjetas NFC para equipos",
        offers: C.plans.filter(p => p.monthlyClp !== null).map(p => ({ name: p.name, price: p.monthlyClp!, unit: "mes" })) }), faqSchema(FAQ))} />
      <a href="#contenido" className={styles.skip}>Saltar al contenido</a>
      <header className={styles.header}>
        <div className={styles.wrap}>
          <Link href="/" className={styles.logo} aria-label="SmartNFC, ir al inicio"><SmartNFCLogo size={26} /></Link>
          <nav aria-label="Principal" className={styles.nav}>
            <a href="#como-funciona" className={styles.navOptional}>Cómo funciona</a>
            <a href="#planes">Planes</a>
            <a href="#preguntas" className={styles.navOptional}>Preguntas</a>
            <Link href="/login">Ingresar</Link>
          </nav>
        </div>
      </header>

      <main id="contenido">
        <section className={`${styles.hero} ${styles.wrap}`} aria-labelledby="empresas-title">
          <div className={styles.heroText}>
            <p className={styles.eyebrow}>SmartNFC Empresas</p>
            <h1 id="empresas-title" className={styles.h1}>La identidad de tu equipo, administrada desde un solo lugar.</h1>
            <p className={styles.lead}>Perfiles digitales y tarjetas NFC para cada persona, con altas, bajas, imagen corporativa y métricas del equipo en un panel central.</p>
            <div className={styles.heroActions}>
              <a className={styles.primary} href="#configurador">Arma tu propuesta</a>
              <a className={styles.secondary} href="#planes">Ver planes</a>
            </div>
            <ul className={styles.model} aria-label="Cómo se cobra">
              <li data-kind="suscripcion"><b>Suscripción mensual</b><span>Plataforma y administración</span></li>
              <li data-kind="pago-unico"><b>Pago único</b><span>Tarjetas físicas por volumen</span></li>
              <li data-kind="cotizacion"><b>Cotización</b><span>Equipos de más de 25 personas</span></li>
            </ul>
          </div>
          <EmpresasFigure slot={EMPRESAS_SLOTS.hero} priority sizes="(max-width: 899px) 100vw, 50vw" className={styles.heroMedia} />
        </section>

        <section className={`${styles.section} ${styles.wrap}`} aria-labelledby="problema-title">
          <div className={styles.split}>
            <div>
              <h2 id="problema-title" className={styles.h2}>Las tarjetas de papel no siguen el ritmo de tu equipo</h2>
              <p className={styles.sectionLead}>Cada cambio en el equipo se convierte en una nueva impresión, y la información que entregan deja de estar bajo tu control.</p>
              <ul className={styles.problems}>{PROBLEMS.map(p => <li key={p.t}><h3>{p.t}</h3><p>{p.d}</p></li>)}</ul>
            </div>
            <EmpresasFigure slot={EMPRESAS_SLOTS.problema} sizes="(max-width: 899px) 100vw, 480px" className={styles.sideMedia} />
          </div>
        </section>

        <section id="como-funciona" className={`${styles.section} ${styles.wrap}`} aria-labelledby="solucion-title" tabIndex={-1}>
          <h2 id="solucion-title" className={styles.h2}>Una tarjeta por persona. Un panel para todo el equipo.</h2>
          <p className={styles.sectionLead}>Cada persona tiene su perfil digital y, si lo necesita, su tarjeta NFC. La empresa los administra en conjunto.</p>
          <ol className={styles.steps}>{STEPS.map(s => <li key={s.t}><h3>{s.t}</h3><p>{s.d}</p></li>)}</ol>
        </section>

        <section className={`${styles.section} ${styles.wrap}`} aria-labelledby="beneficios-title">
          <h2 id="beneficios-title" className={styles.h2}>Lo que administras desde el panel</h2>
          <ul className={styles.features}>{EMPRESAS_FEATURES.map(f => <li key={f.title}><h3>{f.title}</h3><p>{f.text}</p></li>)}</ul>
          <div className={styles.profileRow}>
            <EmpresasFigure slot={EMPRESAS_SLOTS.equipo} sizes="(max-width: 899px) 100vw, 480px" className={styles.sideMedia} />
            <div>
              <h3 className={styles.h3}>El perfil de cada persona incluye</h3>
              <ul className={styles.included}>{EMPRESAS_PROFILE_FEATURES.map(f => <li key={f.source}>{f.label}</li>)}</ul>
            </div>
          </div>
        </section>

        <section id="configurador" className={`fl-page ${styles.configurator}`} aria-label="Configurador de SmartNFC Empresas">
          <EmpresasFlow exitHref="#planes" />
        </section>

        <section id="planes" className={styles.plansBand} aria-labelledby="planes-title" tabIndex={-1}>
          <div className={styles.wrap}>
            <h2 id="planes-title" className={styles.h2}>Planes y precios</h2>
            <p className={styles.sectionLeadLight}>Dos componentes independientes: la suscripción de la plataforma y la compra de tarjetas. Ningún plan incluye tarjetas físicas. Valores {C.taxNote}.</p>

            <p className={styles.kindLabel} data-kind="suscripcion">Suscripción mensual · plataforma y administración</p>
            <ul className={styles.plans}>
              {C.plans.map(p => (
                <li key={p.id} className={p.monthlyClp === null ? styles.planQuote : undefined}>
                  <h3>{p.name}</h3>
                  <p className={styles.planCap}>{p.identities ? `Hasta ${p.identities} personas` : "Más de 25 personas"}</p>
                  {p.monthlyClp !== null ? <>
                    <p className={styles.planPrice}>{formatCLP(p.monthlyClp)}<small>/mes</small></p>
                    <p className={styles.planNet}>{C.netLabel}: {formatCLP(p.monthlyNetClp!)}</p>
                  </> : <p className={styles.planPriceQuote}>Cotización personalizada</p>}
                </li>
              ))}
            </ul>
            <ul className={styles.planTerms}>
              {C.planConditions.map(c => <li key={c}>{c}</li>)}
              <li>Los cambios de plan rigen al término del período, sin prorrateo.</li>
              <li>{C.teamSignupSuspended ? "Las altas se coordinan con nuestro equipo comercial: hoy recibimos solicitudes, no contrataciones en línea." : EMPRESAS_NOT_A_PURCHASE}</li>
            </ul>

            <div className={styles.cardsBlock}>
              <div>
                <p className={styles.kindLabel} data-kind="pago-unico">Pago único · tarjetas físicas</p>
                <p className={styles.cardsLead}>El precio del tramo se aplica a todas las tarjetas del pedido.</p>
                <table className={styles.tiers}>
                  <caption className={styles.srOnly}>Precio por tarjeta según la cantidad, {C.taxNote}</caption>
                  <thead><tr><th scope="col">Cantidad</th><th scope="col">Por tarjeta</th></tr></thead>
                  <tbody>{C.tiers.map(t => <tr key={t.min}><td>{range(t.min, t.max)}</td><td>{t.unitClp === null ? "Cotización" : formatCLP(t.unitClp)}</td></tr>)}</tbody>
                </table>
              </div>
              <ul className={styles.planTerms}>
                <li>Reposición de una tarjeta: {formatCLP(C.replacementClp)}.</li>
                <li>Tarjeta adicional para un perfil existente: {formatCLP(C.additionalClp)}. No crea un perfil nuevo.</li>
                <li>{C.shippingNote}</li>
              </ul>
            </div>
            <a className={styles.primaryLight} href="#configurador">Calcular para mi equipo</a>
          </div>
        </section>

        <section className={`${styles.section} ${styles.wrap}`} aria-labelledby="comparacion-title">
          <h2 id="comparacion-title" className={styles.h2}>Tarjetas de papel y SmartNFC Empresas</h2>
          <p className={styles.sectionLead}>Una comparación de cómo se trabaja con cada una, sin cifras de ahorro: depende de cada equipo.</p>
          <div className={styles.tableWrap}>
            <table className={styles.compare}>
              <caption className={styles.srOnly}>Comparación entre tarjetas de papel y SmartNFC Empresas</caption>
              <thead><tr><th scope="col">Situación</th><th scope="col">Tarjeta de papel</th><th scope="col">SmartNFC Empresas</th></tr></thead>
              <tbody>{COMPARISON.map(([s, p, n]) => <tr key={s}><th scope="row">{s}</th><td data-label="Tarjeta de papel">{p}</td><td data-label="SmartNFC Empresas">{n}</td></tr>)}</tbody>
            </table>
          </div>
        </section>

        <section id="preguntas" className={`${styles.section} ${styles.wrap}`} aria-labelledby="faq-title">
          <h2 id="faq-title" className={styles.h2}>Preguntas frecuentes</h2>
          <div className={styles.faq}>{FAQ.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}</div>
        </section>

        <section className={`${styles.section} ${styles.wrap}`} aria-labelledby="contacto-title">
          <div className={styles.closing}>
            <h2 id="contacto-title" className={styles.h2}>Conversemos sobre tu equipo</h2>
            <p>Arma tu propuesta en un par de minutos o escríbenos directamente. {EMPRESAS_NOT_A_PURCHASE}</p>
            <div className={styles.heroActions}>
              <a className={styles.primary} href="#configurador">Arma tu propuesta</a>
              <a className={styles.secondary} href={WHATSAPP} target="_blank" rel="noopener noreferrer">Escríbenos por WhatsApp</a>
            </div>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={`${styles.wrap} ${styles.footerRow}`}><span>© 2026 SmartNFC · Valdivia, Chile</span><Link href={PRIVACY_PATH} prefetch={false}>Aviso de privacidad</Link><SocialLinks /></div>
      </footer>
    </div>
  );
}
