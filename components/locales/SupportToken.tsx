// Representación de un soporte a escala relativa real (10×15, 15×20 y 20×30 cm).
// Si el registro de imágenes (content/locales/assets.ts) tiene una foto original, se usa; si no, ilustración CSS.
import Image from "next/image";
import { SUPPORT_ASSETS } from "../../content/locales/assets";
import { SUPPORT_LABELS, type SupportSize } from "../../lib/locales/proposal";
import styles from "./locales.module.css";

/** Píxeles por centímetro de la ilustración. */
const SCALE = 3.2;
const SIZE_CM: Record<SupportSize, [number, number]> = { LOCAL_MINI: [10, 15], LOCAL_STANDARD: [15, 20], LOCAL_XL: [20, 30] };

export default function SupportToken({ size, stacked = false }: { size: SupportSize; stacked?: boolean }) {
  const [w, h] = SIZE_CM[size].map(cm => Math.round(cm * SCALE));
  const asset = SUPPORT_ASSETS[size];
  return (
    <span className={`${styles.token}${stacked ? ` ${styles.tokenStacked}` : ""}`} style={{ width: w, height: h }}
      data-size={size} aria-hidden="true" title={`Soporte ${SUPPORT_LABELS[size]}`}>
      {asset ? (
        <Image src={asset.src} alt="" width={asset.width} height={asset.height} className={styles.tokenImage} />
      ) : (
        <>
          <svg viewBox="0 0 24 24" className={styles.tokenNfc} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M8.5 8.5a5 5 0 0 1 0 7M12 6a8.5 8.5 0 0 1 0 12M15.5 3.5a12 12 0 0 1 0 17" />
          </svg>
          <span className={styles.tokenQr} />
        </>
      )}
    </span>
  );
}
