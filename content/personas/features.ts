// Prestaciones que muestra la landing de SmartNFC Personas.
// Fuente: PERSONAS_VERIFIED_FEATURES del motor comercial (cada texto respaldado por una capability BASE o la tarjeta).
// Solo cambia la redacción de PROFILE para el público de Personas (17-10-2026); el motor compartido no se modifica
// y las demás prestaciones conservan su texto. Sin Pro (D6) ni permanencia (D2).
import { PERSONAS_VERIFIED_FEATURES } from "../../lib/commercial/public-offers";

type Source = (typeof PERSONAS_VERIFIED_FEATURES)[number]["source"];

const PERSONAS_WORDING: Partial<Record<Source, string>> = {
  PROFILE: "Tu perfil digital personalizado: comparte tus datos de contacto, redes sociales y enlaces importantes desde un solo lugar",
};

export const PERSONAS_LANDING_FEATURES: readonly { source: Source; label: string }[] = PERSONAS_VERIFIED_FEATURES.map(f => ({
  source: f.source,
  label: PERSONAS_WORDING[f.source] ?? f.label,
}));
