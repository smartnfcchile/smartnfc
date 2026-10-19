// Portada de SmartNFC: tres soluciones comerciales (Personas, Locales, Empresas) como acción principal.
// Componente de servidor: sin estado, sin scripts propios, sin captura de datos.
import Image from "next/image";
import Link from "next/link";
import { Building2, Store, UserRound } from "lucide-react";
import SmartNFCLogo from "../brand/SmartNFCLogo";
import { HOME_FAQ, HOME_SOLUTIONS, HOME_STEPS, HOME_WHATSAPP } from "../../content/home";
import { PRIVACY_PATH } from "../../content/legal/privacy";
import styles from "./home.module.css";

const QUICK_ICONS = { personas: UserRound, locales: Store, empresas: Building2 } as const;

export default function HomeSolutions() {
  return (
    <div className={styles.page}>
      <a href="#soluciones" className={styles.skip}>Saltar a las soluciones</a>
      <header className={styles.header}>
        <div className={styles.headerRow}>
          <Link href="/" className={styles.logo} aria-label="SmartNFC, inicio"><SmartNFCLogo size={28} /></Link>
          <nav aria-label="Principal" className={styles.nav}>
            {HOME_SOLUTIONS.map(s => <Link key={s.id} href={s.href} className={styles.navSolution}>{s.label}</Link>)}
            <Link href="/login" className={styles.login}>Ingresar</Link>
          </nav>
        </div>
      </header>

      <main>
        <section className={styles.hero} aria-labelledby="home-title">
          <div className={styles.wrap}>
            <h1 id="home-title" className={styles.h1}>Conecta con un toque. <span>Crece con cada conexión.</span></h1>
            <p className={styles.lead}>Una forma más inteligente de conectar personas, negocios y empresas. Descubre la solución que necesitas.</p>
            {/* Solo en móvil: accesos directos a las tres soluciones en la primera pantalla. En escritorio, las tarjetas ya se ven completas. */}
            <nav aria-label="Elige tu solución" className={styles.quick}>
              {HOME_SOLUTIONS.map(s => {
                const Icon = QUICK_ICONS[s.id];
                return <Link key={s.id} href={s.href} className={styles.quickItem} data-solution={s.id}><Icon aria-hidden="true" size={22} strokeWidth={2.2} /><span>{s.label}</span></Link>;
              })}
            </nav>
          </div>
        </section>

        <section id="soluciones" className={styles.wrap} aria-label="Soluciones SmartNFC" tabIndex={-1}>
          <ul className={styles.solutions}>
            {HOME_SOLUTIONS.map((s, i) => (
              <li key={s.id} className={styles.solution} data-solution={s.id}>
                <div className={styles.media}>
                  <Image src={s.image.src} alt="" width={s.image.width} height={s.image.height} preload={i === 0}
                    sizes="(max-width: 719px) 100vw, (max-width: 1119px) 33vw, 360px" className={styles.mediaImg} />
                  <span className={styles.caption}>Imagen ilustrativa</span>
                </div>
                <div className={styles.body}>
                  <p className={styles.kicker}>{s.label}</p>
                  <h2 className={styles.h2}>{s.title}</h2>
                  <p className={styles.text}>{s.text}</p>
                  <Link href={s.href} className={styles.cta} aria-label={`${s.cta}: ${s.title}`}>{s.cta}<span aria-hidden="true" className={styles.arrow}>→</span></Link>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className={`${styles.section} ${styles.wrap}`} aria-labelledby="como-title">
          <h2 id="como-title" className={styles.h2Section}>Cómo funciona</h2>
          <ol className={styles.steps}>
            {HOME_STEPS.map(s => <li key={s.t}><h3>{s.t}</h3><p>{s.d}</p></li>)}
          </ol>
        </section>

        <section className={`${styles.section} ${styles.wrap}`} aria-labelledby="faq-title">
          <h2 id="faq-title" className={styles.h2Section}>Preguntas frecuentes</h2>
          <div className={styles.faq}>
            {HOME_FAQ.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}
          </div>
          <p className={styles.help}>¿No sabes cuál elegir? <a href={HOME_WHATSAPP} target="_blank" rel="noopener noreferrer">Escríbenos por WhatsApp</a>.</p>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={`${styles.wrap} ${styles.footerGrid}`}>
          <div>
            <SmartNFCLogo size={26} />
            <p>Conecta personas, negocios y empresas con un toque.</p>
          </div>
          <nav aria-label="Soluciones" className={styles.footerNav}>
            <b>Soluciones</b>
            {HOME_SOLUTIONS.map(s => <Link key={s.id} href={s.href}>{s.label}</Link>)}
          </nav>
          <nav aria-label="Recursos" className={styles.footerNav}>
            <b>Recursos</b>
            <Link href="/blog">Blog</Link>
            <Link href="/login">Ingresar</Link>
            <a href={HOME_WHATSAPP} target="_blank" rel="noopener noreferrer">Contacto por WhatsApp</a>
            <Link href={PRIVACY_PATH} prefetch={false}>Aviso de privacidad</Link>
          </nav>
        </div>
        <div className={`${styles.wrap} ${styles.footerBottom}`}><span>© 2026 SmartNFC · Valdivia, Chile</span></div>
      </footer>
    </div>
  );
}
