"use client";

// Ejemplo FICTICIO del motor (F0). Solo para revisión interna; no se enlaza desde el sitio.
import FlowShell from "../FlowShell";
import { DEMO_FLOW, DEMO_LABELS } from "../../../content/flows/demo";
import type { Answers } from "../../../lib/flow/types";

const label = (q: string, v: unknown) => (typeof v === "string" ? DEMO_LABELS[q]?.[v] ?? v : "");

function Summary({ a }: { a: Answers }) {
  const rows: [string, string][] = [];
  if (a.ocasion) rows.push(["Ocasión", label("ocasion", a.ocasion)]);
  if (a.motivo) rows.push(["Motivo", label("motivo", a.motivo)]);
  if (Array.isArray(a.ambiente)) rows.push(["Ambiente", a.ambiente.map(v => label("ambiente", v)).join(", ")]);
  if (a.musica) rows.push(["Música", label("musica", a.musica)]);
  if (typeof a.personas === "number") rows.push(["Personas", String(a.personas)]);
  if (typeof a.nota === "string") rows.push(["Nota", a.nota]);
  return rows.length
    ? <dl className="fl-demo-list">{rows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
    : <p className="fl-demo-empty">Tus respuestas aparecerán aquí.</p>;
}

export default function DemoFlow() {
  return (
    <FlowShell
      flow={DEMO_FLOW}
      label="Demostración del motor de preguntas"
      exitHref="/"
      exitLabel="Salir de la demo"
      renderPreview={a => (
        <div className="fl-demo-card">
          <span className="fl-demo-badge">Vista previa · ejemplo ficticio</span>
          <h3>{a.ocasion ? `Tu ${label("ocasion", a.ocasion).toLowerCase()}` : "Tu reunión"}</h3>
          <Summary a={a} />
        </div>
      )}
      renderResult={(a, flow) => (
        <div className="fl-demo-result">
          <p>Así quedó tu reunión de ejemplo. Nada de esto se guardó ni se envió.</p>
          <Summary a={a} />
          <div className="fl-demo-actions">
            <button type="button" className="fl-next" onClick={flow.goBack}>Cambiar respuestas</button>
            <button type="button" className="fl-secondary" onClick={flow.restart}>Empezar de nuevo</button>
          </div>
        </div>
      )}
    />
  );
}
