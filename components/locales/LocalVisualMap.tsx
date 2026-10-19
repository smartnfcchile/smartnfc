"use client";

// Mapa del local (F3; escena por rubro en F4): una zona por ubicación elegida, con su soporte a escala y la cantidad (×N).
// No dibuja un soporte por mesa. Cada zona es un botón que muestra en el teléfono la acción sugerida para ese lugar.
import Image from "next/image";
import { SCENE_ASSETS } from "../../content/locales/assets";
import { SUPPORT_LABELS, type LocalesProposal, type SupportSelection, type Ubicacion } from "../../lib/locales/proposal";
import SupportToken from "./SupportToken";
import styles from "./locales.module.css";

const ORDER: Ubicacion[] = ["entrance", "counter", "tables", "waiting", "other"];

export default function LocalVisualMap({ proposal, selection, active, onSelect }: {
  proposal: LocalesProposal; selection: SupportSelection; active: Ubicacion | null; onSelect: (location: Ubicacion) => void;
}) {
  const points = [...proposal.points].sort((a, b) => ORDER.indexOf(a.location) - ORDER.indexOf(b.location));
  const scene = proposal.rubro ? SCENE_ASSETS[proposal.rubro] : null;
  return (
    <div className={styles.map}>
      {scene && (
        <figure className={styles.scene}>
          <Image src={scene.src} alt={scene.alt} fill sizes="(min-width: 1120px) 1064px, (min-width: 900px) calc(100vw - 56px), calc(100vw - 32px)" loading="lazy" className={styles.sceneImage} />
          {scene.caption && <figcaption className={styles.sceneCaption}>{scene.caption}</figcaption>}
        </figure>
      )}
      <div className={styles.mapHead}>
        <span className={styles.badge}>Tu local</span>
        <span className={styles.previewSummary}>{proposal.totalPoints} {proposal.totalPoints === 1 ? "punto" : "puntos"}</span>
      </div>
      <ul className={styles.zones} aria-label="Puntos por lugar. Elige un lugar para ver su acción sugerida.">
        {points.map(p => {
          const size = selection[p.location];
          return (
            <li key={p.location} className={p.location === "tables" ? styles.zoneWide : undefined}>
              <button type="button" className={`${styles.zone}${active === p.location ? ` ${styles.zoneActive}` : ""}`}
                aria-pressed={active === p.location} onClick={() => onSelect(p.location)}>
                <span className={styles.zoneVisual}>
                  {size ? <SupportToken size={size} stacked={p.quantity > 1} scale={3.1} /> : <span className={styles.tokenEmpty} aria-hidden="true">?</span>}
                </span>
                <span className={styles.zoneText}>
                  <b>{p.label}</b>
                  <span>{size ? SUPPORT_LABELS[size] : "Tamaño por definir"}</span>
                </span>
                <span className={styles.zoneCount} aria-label={`${p.quantity} ${p.quantity === 1 ? "punto" : "puntos"}`}>×{p.quantity}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
