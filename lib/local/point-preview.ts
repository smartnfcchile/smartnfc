import type { LocalPointObjective, LocalPointPresentationMode } from "@prisma/client";
import { effectivePresentationMode } from "./point-config";
import { promotionStatus, readObjectiveConfig } from "./objective-config";

export type PreviewablePoint = { code: string; objective: LocalPointObjective; presentationMode: LocalPointPresentationMode; destinationUrl: string | null; objectiveConfig: unknown };

/**
 * Destino que un administrador puede abrir para revisar un punto SIN registrar analítica (decisión D7):
 * - CLUB: su página pública (/club) registra visitas al abrirse; se revisa desde el editor de la campaña.
 * - Página del local (o promoción fuera de vigencia): /l/<código> sin visita (?v) no registra visitas, vistas ni clics.
 * - Abrir directamente: el destino configurado tal cual, sin pasar por /p, /q ni /t (que sí registran un acceso).
 */
export type PointPreviewTarget =
  | { kind: "CLUB" }
  | { kind: "LANDING"; href: string }
  | { kind: "DIRECT"; href: string }
  | { kind: "UNCONFIGURED" };

export function pointPreviewTarget(point: PreviewablePoint): PointPreviewTarget {
  if (point.objective === "CLUB") return { kind: "CLUB" };
  const promo = point.objective === "PROMOTION" ? readObjectiveConfig(point.objectiveConfig).promotion : null;
  if (effectivePresentationMode(point.objective, point.presentationMode) === "LANDING" || (promo && promotionStatus(promo) !== "active")) return { kind: "LANDING", href: `/l/${point.code}` };
  if (!point.destinationUrl) return { kind: "UNCONFIGURED" };
  return { kind: "DIRECT", href: point.destinationUrl };
}
