// Soporte a escala relativa real por su alto (15, 20 y 30 cm). Con foto del registro (content/locales/assets.ts)
// se respeta la proporción del archivo (sin estirar); sin foto, ilustración CSS con la proporción del panel.
import Image from "next/image";
import { SUPPORT_ASSETS } from "../../content/locales/assets";
import { SUPPORT_LABELS, type SupportSize } from "../../lib/locales/proposal";
import styles from "./locales.module.css";

const SIZE_CM: Record<SupportSize, [number, number]> = { LOCAL_MINI: [10, 15], LOCAL_STANDARD: [15, 20], LOCAL_XL: [20, 30] };

/** `scale`: píxeles por centímetro de alto. */
export default function SupportToken({ size, stacked = false, scale = 3.2 }: { size: SupportSize; stacked?: boolean; scale?: number }) {
  const [wCm, hCm] = SIZE_CM[size];
  const asset = SUPPORT_ASSETS[size];
  if (asset) {
    const height = Math.round(hCm * scale * 1.12); // la foto incluye la base de sobremesa
    const width = Math.round(height * asset.width / asset.height);
    return (
      <span className={styles.tokenPhoto} style={{ width, height }} data-size={size} data-photo="" aria-hidden="true" title={`Soporte ${SUPPORT_LABELS[size]}`}>
        <Image src={asset.src} alt={asset.alt} width={width} height={height} sizes={`${width}px`} loading="lazy" />
      </span>
    );
  }
  return (
    <span className={`${styles.token}${stacked ? ` ${styles.tokenStacked}` : ""}`} style={{ width: Math.round(wCm * scale), height: Math.round(hCm * scale) }}
      data-size={size} aria-hidden="true" title={`Soporte ${SUPPORT_LABELS[size]}`}>
      <svg viewBox="0 0 24 24" className={styles.tokenNfc} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M8.5 8.5a5 5 0 0 1 0 7M12 6a8.5 8.5 0 0 1 0 12M15.5 3.5a12 12 0 0 1 0 17" />
      </svg>
      <span className={styles.tokenQr} />
    </span>
  );
}
