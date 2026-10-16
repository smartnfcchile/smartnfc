"use client";

// Vista previa progresiva: la página que abriría el punto, dibujada con el mismo componente que usa
// la landing pública real (LocalLandingView), con datos de ejemplo y acciones no navegables.
import LocalLandingView from "../local/public/LocalLandingView";
import { brandInitials, readableTextColor, BRAND_DEFAULT_PRIMARY, BRAND_DEFAULT_SECONDARY, type ResolvedLocalBrand } from "../../lib/local/brand";
import type { PublicAction } from "../../lib/local/public-actions";
import type { LocalesProposal, Rubro } from "../../lib/locales/proposal";
import styles from "./locales.module.css";

const EXAMPLE_NAME: Record<Rubro, string> = {
  cafe: "Tu cafetería", bar: "Tu bar", gym: "Tu gimnasio", beauty: "Tu salón", clinic: "Tu consulta",
  store: "Tu tienda", lodging: "Tu alojamiento", other: "Tu negocio",
};
const CONTACT_TYPES = new Set(["LOCATION", "PHONE"]);

export function exampleBrand(proposal: LocalesProposal): ResolvedLocalBrand {
  const displayName = proposal.rubro ? EXAMPLE_NAME[proposal.rubro] : "Tu negocio";
  return {
    displayName, shortDescription: "Así verán tus clientes tu página al acercar el teléfono.",
    logoUrl: null, coverImageUrl: null, primaryColor: BRAND_DEFAULT_PRIMARY, secondaryColor: BRAND_DEFAULT_SECONDARY,
    onPrimary: readableTextColor(BRAND_DEFAULT_PRIMARY), address: null, phone: null, websiteUrl: null, mapsUrl: null,
    initials: brandInitials(displayName.replace(/^Tu\s+/, "")),
    sources: { displayName: "default", logoUrl: "default", coverImageUrl: "default", primaryColor: "default", secondaryColor: "default", address: "default" },
  };
}

/** Acciones de ejemplo: la primera es la principal; ubicación y teléfono van en contacto. Sin href (no navegables). */
export function exampleActions(proposal: LocalesProposal): PublicAction[] {
  let primaryTaken = false;
  return proposal.actions.map((action, order) => {
    const contact = CONTACT_TYPES.has(action.type);
    const group = contact ? "contact" : !primaryTaken ? "primary" : "secondary";
    if (group === "primary") primaryTaken = true;
    return { key: `${action.type}-${order}`, type: action.type, label: action.label, order, enabled: true, external: false, group };
  });
}

export function PhoneFrame({ proposal, compact = false }: { proposal: LocalesProposal; compact?: boolean }) {
  return (
    <div className={`${styles.phone}${compact ? ` ${styles.phoneCompact}` : ""}`} aria-hidden="true">
      <div className={styles.phoneScreen}>
        <LocalLandingView brand={exampleBrand(proposal)} actions={exampleActions(proposal)} framed
          emptyHint="Elige qué quieres lograr y aquí aparecerán las acciones de tu punto." />
      </div>
    </div>
  );
}

export default function LocalesPreview({ proposal }: { proposal: LocalesProposal }) {
  const summary = [
    proposal.actions.length ? `${proposal.actions.length} ${proposal.actions.length === 1 ? "acción" : "acciones"}` : null,
    proposal.totalPoints ? `${proposal.totalPoints} ${proposal.totalPoints === 1 ? "punto" : "puntos"}` : null,
  ].filter(Boolean).join(" · ");
  return (
    <div className={styles.preview}>
      <div className={styles.previewHead}>
        <span className={styles.badge}>Vista previa · ejemplo</span>
        {summary && <span className={styles.previewSummary}>{summary}</span>}
      </div>
      {/* Texto equivalente para lectores de pantalla: el teléfono es decorativo. */}
      <p className={styles.srOnly}>
        {proposal.actions.length ? `La página del punto mostraría: ${proposal.actions.map(a => a.label).join(", ")}.` : "Aún no hay acciones elegidas."}
      </p>
      <PhoneFrame proposal={proposal} compact />
      {proposal.points.length > 0 && (
        <ul className={styles.chips} aria-label="Lugares elegidos para los puntos">
          {proposal.points.map(p => <li key={p.location}>{p.label}{p.quantity > 1 ? ` × ${p.quantity}` : ""}</li>)}
        </ul>
      )}
    </div>
  );
}
