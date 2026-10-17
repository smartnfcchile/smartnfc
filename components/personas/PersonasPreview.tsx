"use client";

// Vista previa de SmartNFC Personas (P2): el perfil real (CardProfileView en modo vista previa) y la tarjeta física
// real (CardPreview), con datos ficticios. El teléfono y la tarjeta son ilustrativos: se marcan `inert` (sin foco ni
// lectura) y un texto equivalente los describe. En vista previa el perfil no envía eventos ni navega (P0).
import { useMemo, useState, useSyncExternalStore } from "react";
import CardProfileView from "../card-profile/CardProfileView";
import CardPreview from "../physical-card/CardPreview";
import type { PersonasAnswersModel } from "../../lib/personas/answers";
import { demoQrUrl, previewCardSides, previewProfile, previewSummaryText } from "../../lib/personas/preview-data";
import styles from "./personas.module.css";

const noop = () => () => {};
/** true solo en el navegador: el perfil de ejemplo no va en el HTML del servidor (evita un segundo h1 y datos ficticios indexables). */
const useInBrowser = () => useSyncExternalStore(noop, () => true, () => false);

export function ProfileFrame({ model, size = "compact" }: { model: PersonasAnswersModel; size?: "compact" | "large" }) {
  const card = useMemo(() => previewProfile(model), [model]);
  const inBrowser = useInBrowser();
  const tone = card.template === "classic-light" || card.template === "neobrutalist" ? "light" : "dark";
  return (
    <div className={`${styles.phone} ${size === "large" ? styles.phoneLarge : ""}`} inert>
      <div className={styles.phoneScreen} data-tone={tone}>
        <div className={styles.phoneCanvas}>{inBrowser && <CardProfileView card={card} isPreview />}</div>
      </div>
    </div>
  );
}

export function CardFaces({ model }: { model: PersonasAnswersModel }) {
  const sides = useMemo(() => previewCardSides(model), [model]);
  return (
    <div className={styles.cardFaces} inert>
      <CardPreview side={sides.front} publicUrl={demoQrUrl()} label="Anverso" textSize="card" />
      <CardPreview side={sides.back} publicUrl={demoQrUrl()} label="Reverso" textSize="card" />
    </div>
  );
}

export const ILLUSTRATIVE_NOTE = "Ejemplo ilustrativo: nombre y datos ficticios.";
export const QR_NOTE = "El QR de ejemplo abre esta página de SmartNFC. En tu tarjeta, el NFC y el QR abrirán tu perfil.";

export default function PersonasPreview({ model }: { model: PersonasAnswersModel }) {
  const [view, setView] = useState<"perfil" | "tarjeta">("perfil");
  return (
    <div className={styles.preview} data-view={view}>
      <div className={styles.previewHead}>
        <span className={styles.badge}>Vista previa · ejemplo</span>
        <div className={styles.toggle} role="group" aria-label="Qué vista previa mostrar">
          <button type="button" aria-pressed={view === "perfil"} onClick={() => setView("perfil")}>Perfil</button>
          <button type="button" aria-pressed={view === "tarjeta"} onClick={() => setView("tarjeta")}>Tarjeta</button>
        </div>
      </div>
      <p className={styles.srOnly} aria-live="polite">{previewSummaryText(model)}</p>
      <div className={styles.panelProfile}><ProfileFrame model={model} /></div>
      <div className={styles.panelCard}><CardFaces model={model} /><p className={styles.note}>{QR_NOTE}</p></div>
      <p className={styles.note}>{ILLUSTRATIVE_NOTE}</p>
    </div>
  );
}
