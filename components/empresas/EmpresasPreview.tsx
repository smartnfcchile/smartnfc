// Vista de ejemplo del panel de la empresa según las respuestas: capacidad del plan, política de edición y tarjetas.
// Datos ficticios, solo ilustrativos: no es una captura del panel real ni muestra métricas de clientes.
import type { EmpresasAnswersModel } from "../../lib/empresas/answers";
import type { EmpresasQuote } from "../../lib/empresas/quote";
import { EMPRESAS_LABELS } from "../../content/flows/empresas";
import styles from "./empresas.module.css";

export const EMPRESAS_EXAMPLE_TEAM = [
  { name: "Daniela Soto", role: "Ventas", initials: "DS" },
  { name: "Matías Rojas", role: "Terreno", initials: "MR" },
  { name: "Valentina Díaz", role: "Gerencia", initials: "VD" },
  { name: "Tomás Herrera", role: "Soporte", initials: "TH" },
] as const;

export const EMPRESAS_PREVIEW_NOTE = "Ejemplo ilustrativo con nombres ficticios. No es una captura del panel ni muestra datos de clientes.";

export default function EmpresasPreview({ model, quote }: { model: EmpresasAnswersModel; quote: EmpresasQuote }) {
  const people = model.personas ?? (model.cotizacionPersonas ? 26 : 10);
  const capacity = quote.plan.kind === "plan" ? quote.plan.identities : null;
  const shown = EMPRESAS_EXAMPLE_TEAM.slice(0, Math.min(4, people));
  const pct = capacity ? Math.round((Math.min(people, capacity) / capacity) * 100) : 100;
  const cards = model.tarjetas;
  return (
    <div className={styles.panel} role="group" aria-label="Ejemplo del panel de tu empresa">
      <div className={styles.panelBar}><span aria-hidden="true" /><span aria-hidden="true" /><span aria-hidden="true" /><b>Panel de tu empresa</b><em>Ejemplo</em></div>
      <div className={styles.panelBody}>
        <div className={styles.panelStat}>
          <p>Perfiles del equipo</p>
          <b>{model.cotizacionPersonas ? "Más de 25" : `${people}${capacity ? ` de ${capacity}` : ""}`}</b>
          <div className={styles.meter} aria-hidden="true"><i style={{ width: `${pct}%` }} /></div>
          <small>{quote.plan.kind === "plan" ? `Plan ${quote.plan.name}` : quote.plan.kind === "quote" ? `${quote.plan.name} · cotización` : "Plan según tu equipo"}</small>
        </div>
        <div className={styles.panelStat}>
          <p>Tarjetas físicas</p>
          <b>{cards === null ? (model.cotizacionPersonas ? "Por cotizar" : "—") : cards === 0 ? "Sin tarjetas" : String(cards)}</b>
          <small>Pago único, aparte del plan</small>
        </div>
        <div className={styles.panelPolicy}>
          <p>Edición de perfiles</p>
          <b>{model.control ? EMPRESAS_LABELS.control[model.control] : "Por definir"}</b>
        </div>
        <ul className={styles.panelList} aria-label="Integrantes de ejemplo">
          {shown.map(p => (
            <li key={p.name}><span className={styles.avatar} aria-hidden="true">{p.initials}</span><span><b>{p.name}</b><small>{p.role}</small></span><em>Activo</em></li>
          ))}
          {people > shown.length && <li className={styles.panelMore}>+ {model.cotizacionPersonas ? "más personas" : `${people - shown.length} ${people - shown.length === 1 ? "persona" : "personas"}`}</li>}
        </ul>
      </div>
    </div>
  );
}
