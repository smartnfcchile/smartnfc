// Árbol de preguntas de SmartNFC Empresas (E1). Solo contenido: el motor (lib/flow) decide el recorrido y el modelo
// de respuestas vive en lib/empresas/answers.ts.
// E1 personas → E2 tarjetas → E3 quién administra → E4 control de edición → E5 rotación → resultado.
// Reglas: planes y montos solo desde lib/commercial/public-offers.ts (teamPlanFor, cardOrderPrice). Altas de Equipo
// suspendidas (D16): el cierre es una solicitud. Equipo sin CRM ni captura de prospectos (D10, D6). Sin permanencia (D2).
import type { FlowDefinition } from "../../lib/flow/types";

export const EMPRESAS_LABELS = {
  administra: {
    personas: "Personas o administración",
    marketing: "Marketing o comunicaciones",
    comercial: "Gerencia o jefatura comercial",
    pendiente: "Aún no lo definimos",
  },
  // Políticas reales del panel (lib/profile-edit-policy-shared.ts), en lenguaje de la landing.
  control: {
    FLEXIBLE: "Cada persona edita su perfil completo",
    CORPORATE: "La empresa controla la imagen; cada persona actualiza sus datos",
    ADMIN_ONLY: "Solo los administradores editan los perfiles",
  },
  rotacion: {
    frecuente: "Frecuentes: varias veces al año",
    ocasional: "Ocasionales",
    baja: "Casi no hay cambios",
  },
} as const satisfies Record<string, Record<string, string>>;

const options = <K extends keyof typeof EMPRESAS_LABELS>(key: K) =>
  Object.entries(EMPRESAS_LABELS[key]).map(([value, label]) => ({ value, label }));

/** Identidades con plan Equipo publicado (teamPlanFor: sobre 25, cotización). */
export const PERSONAS_MIN = 1;
export const PERSONAS_MAX = 25;
export const PERSONAS_COTIZACION = "26+" as const;
/** Tarjetas con precio automático (cardOrderPrice: desde 50, cotización). */
export const TARJETAS_MIN = 0;
export const TARJETAS_MAX = 49;
export const TARJETAS_POR_PERSONA = "por-persona" as const;

export const EMPRESAS_FLOW: FlowDefinition = {
  id: "empresas",
  questions: [
    { id: "personas", kind: "number", title: "¿Cuántas personas de tu equipo tendrán perfil SmartNFC?",
      help: `Cada persona es una identidad digital administrada por la empresa. Entre ${PERSONAS_MIN} y ${PERSONAS_MAX}; sobre 25 preparamos una cotización.`,
      min: PERSONAS_MIN, max: PERSONAS_MAX, step: 1, unit: "personas", defaultValue: 10,
      alternative: { value: PERSONAS_COTIZACION, label: "Más de 25 personas: solicitar cotización" } },
    { id: "tarjetas", kind: "number", title: "¿Cuántas tarjetas físicas necesitan?",
      help: `Lo habitual es una por persona. Puede ser menos: el perfil también se comparte por QR o enlace (0 si por ahora no necesitan tarjetas). Hasta ${TARJETAS_MAX} con precio automático; para más, cotizamos.`,
      when: a => typeof a.personas === "number",
      min: TARJETAS_MIN, max: TARJETAS_MAX, step: 1, unit: "tarjetas", defaultValue: 0,
      alternative: { value: TARJETAS_POR_PERSONA, label: "Una tarjeta por persona" } },
    { id: "administra", kind: "single", title: "¿Quién administrará los perfiles del equipo?", options: options("administra"), autoAdvance: true },
    { id: "control", kind: "single", title: "¿Quién debería poder editar cada perfil?",
      help: "Es una configuración del panel y se puede cambiar después.", options: options("control"), autoAdvance: true },
    { id: "rotacion", kind: "single", title: "¿Con qué frecuencia entran o salen personas del equipo?", options: options("rotacion"), autoAdvance: true },
  ],
};
