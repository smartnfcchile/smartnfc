// Aviso de privacidad común de las solicitudes de SmartNFC Locales, Personas y Empresas.
// Texto pendiente de validación legal: la página queda fuera de buscadores y del sitemap hasta su aprobación.
import type { Metadata } from "next";
import Link from "next/link";
import SmartNFCLogo from "../../components/brand/SmartNFCLogo";
import { PRIVACY_CONTROLLER, PRIVACY_NOTICE, PRIVACY_SECTIONS } from "../../content/legal/privacy";
import styles from "./privacidad.module.css";

export const metadata: Metadata = {
  title: { absolute: "Aviso de privacidad de solicitudes | SmartNFC" },
  description: "Cómo trata SmartNFC SpA los datos de las solicitudes comerciales que envías por WhatsApp desde Locales, Personas y Empresas.",
  alternates: { canonical: "/privacidad" },
  robots: { index: false, follow: false }, // Hasta completar la validación legal.
};

export default function PrivacidadPage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.wrap}>
          <Link href="/" className={styles.logo} aria-label="SmartNFC, ir al inicio"><SmartNFCLogo size={26} /></Link>
        </div>
      </header>
      <main className={styles.wrap}>
        <article className={styles.article} aria-labelledby="privacidad-title">
          <p className={styles.eyebrow}>SmartNFC SpA</p>
          <h1 id="privacidad-title" className={styles.h1}>Aviso de privacidad de solicitudes</h1>
          <p className={styles.meta}>{PRIVACY_NOTICE.versionLabel} · <code>{PRIVACY_NOTICE.version}</code></p>
          <p className={styles.status} role="note">{PRIVACY_NOTICE.status} Este aviso describe cómo tratamos hoy los datos de las solicitudes y puede ajustarse tras esa revisión.</p>
          <nav aria-label="Contenido del aviso" className={styles.toc}>
            <ol>{PRIVACY_SECTIONS.map(s => <li key={s.id}><a href={`#${s.id}`}>{s.title.replace(/^\d+\.\s*/, "")}</a></li>)}</ol>
          </nav>
          {PRIVACY_SECTIONS.map(s => (
            <section key={s.id} id={s.id} aria-labelledby={`${s.id}-t`} className={styles.section}>
              <h2 id={`${s.id}-t`} className={styles.h2}>{s.title}</h2>
              {s.paragraphs?.map(p => <p key={p}>{p}</p>)}
              {s.items && <ul>{s.items.map(i => <li key={i}>{i}</li>)}</ul>}
            </section>
          ))}
          <p className={styles.contact}>
            Para cualquier consulta sobre tus datos: <a href={`mailto:${PRIVACY_CONTROLLER.email}`}>{PRIVACY_CONTROLLER.email}</a>.
          </p>
        </article>
      </main>
      <footer className={styles.footer}>
        <div className={styles.wrap}><span>© 2026 {PRIVACY_CONTROLLER.legalName} · RUT {PRIVACY_CONTROLLER.rut}</span></div>
      </footer>
    </div>
  );
}
