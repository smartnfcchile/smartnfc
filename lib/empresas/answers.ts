// Modelo de respuestas de SmartNFC Empresas (E1): de las respuestas EFECTIVAS del flujo a un modelo tipado.
// Módulo puro: sin React, red, almacenamiento ni montos.
import type { Answers } from "../flow/types";
import { EMPRESAS_LABELS, PERSONAS_COTIZACION, PERSONAS_MAX, PERSONAS_MIN, TARJETAS_MAX, TARJETAS_MIN, TARJETAS_POR_PERSONA } from "../../content/flows/empresas";

export type Administra = keyof typeof EMPRESAS_LABELS.administra;
export type Control = keyof typeof EMPRESAS_LABELS.control;
export type Rotacion = keyof typeof EMPRESAS_LABELS.rotacion;

export type EmpresasNoticeId = "rotation" | "admin-pending" | "no-cards";
export type EmpresasNotice = { id: EmpresasNoticeId; text: string };

export type EmpresasAnswersModel = {
  /** Identidades digitales (1–25). null si no se respondió o si se pidió cotización. */
  personas: number | null;
  /** «Más de 25 personas»: plan por cotización. */
  cotizacionPersonas: boolean;
  /** Tarjetas físicas (0–49). null si no se respondió o si el plan se cotiza. */
  tarjetas: number | null;
  /** Eligió «una tarjeta por persona». */
  tarjetasPorPersona: boolean;
  administra: Administra | null;
  control: Control | null;
  rotacion: Rotacion | null;
  notices: EmpresasNotice[];
};

const str = (a: Answers, id: string) => (typeof a[id] === "string" ? (a[id] as string) : null);
const oneOf = <K extends string>(labels: Record<K, string>, value: string | null) =>
  value !== null && Object.prototype.hasOwnProperty.call(labels, value) ? (value as K) : null;
const intIn = (v: unknown, min: number, max: number) => (typeof v === "number" && Number.isInteger(v) && v >= min && v <= max ? v : null);

export function readEmpresasAnswers(a: Answers): EmpresasAnswersModel {
  const personas = intIn(a.personas, PERSONAS_MIN, PERSONAS_MAX);
  const cotizacionPersonas = a.personas === PERSONAS_COTIZACION;
  const tarjetasPorPersona = personas !== null && a.tarjetas === TARJETAS_POR_PERSONA;
  const tarjetas = personas === null ? null : tarjetasPorPersona ? personas : intIn(a.tarjetas, TARJETAS_MIN, TARJETAS_MAX);
  const administra = oneOf(EMPRESAS_LABELS.administra, str(a, "administra"));
  const control = oneOf(EMPRESAS_LABELS.control, str(a, "control"));
  const rotacion = oneOf(EMPRESAS_LABELS.rotacion, str(a, "rotacion"));

  const notices: EmpresasNotice[] = [];
  if (rotacion === "frecuente" || rotacion === "ocasional")
    notices.push({ id: "rotation", text: "Cuando alguien deja el equipo, un administrador suspende su acceso desde el panel y su perfil y su tarjeta dejan de funcionar. Para quien llega, se invita a una persona nueva con su propio perfil." });
  if (administra === "pendiente")
    notices.push({ id: "admin-pending", text: "Conviene definir al menos una persona administradora: es quien invita al equipo, aplica la política de edición y desactiva perfiles." });
  if (tarjetas === 0)
    notices.push({ id: "no-cards", text: "Sin tarjetas físicas, cada perfil se comparte con su código QR o su enlace. Puedes sumar tarjetas más adelante." });

  return { personas, cotizacionPersonas, tarjetas, tarjetasPorPersona, administra, control, rotacion, notices };
}
