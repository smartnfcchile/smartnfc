// Vinculación de tarjetas NFC físicas (inventario SmartNFC) con Puntos Inteligentes de SmartNFC Local.
// Operación EXCLUSIVA de SuperAdmin: el cliente Local no vincula ni desvincula NFC.
// Reglas reutilizadas de la antigua acción del panel Local: misma empresa, sin destino B2B, sin otro punto,
// punto que admite NFC y un único NFC por punto (PhysicalNfcCard.localTouchpointId es @unique).
// Nada de este módulo registra analítica: no llama a /t, /p, /q ni /club; publicPoint() es solo lectura.
import { Prisma, type NfcStatus } from "@prisma/client";
import { prisma } from "../prisma";
import { publicPoint } from "./point-resolver";
import { pointPreviewTarget } from "./point-preview";
import { objectiveLabels } from "./point-config";

export const LOCAL_NFC_LINKED = "LOCAL_NFC_LINKED";
export const LOCAL_NFC_UNLINKED = "LOCAL_NFC_UNLINKED";

/** Error de validación con mensaje apto para mostrar al administrador. */
export class NfcLinkError extends Error {}

export type NfcActor = { id: string; role: string };
type Db = Prisma.TransactionClient;

const ID = /^[A-Za-z0-9_-]{1,64}$/;
const TOKEN = /^[A-Za-z0-9_-]{1,128}$/;

export const nfcStatusLabels: Record<NfcStatus, string> = {
  PENDIENTE_GRABACION: "Pendiente de grabación", GRABADA: "Grabada", ENVIADA: "Enviada",
  ENTREGADA: "Entregada", ACTIVA: "Activa", SUSPENDIDA: "Suspendida",
};
/** Últimos caracteres del token: identificador administrativo seguro (nunca el token completo). */
export const tokenHint = (token: string) => "…" + token.slice(-4);

/** Acepta el token o la URL grabada en el chip (…/t/<token>). No inventa formato: es el token de PhysicalNfcCard. */
export function normalizeNfcToken(input: unknown): string | null {
  if (typeof input !== "string") return null;
  let value = input.trim();
  const fromUrl = value.match(/\/t\/([^/?#\s]+)\/?(?:[?#].*)?$/);
  if (fromUrl) value = fromUrl[1];
  return TOKEN.test(value) ? value : null;
}

/** /t/[token] solo abre el destino con la tarjeta ENTREGADA o ACTIVA (y activa una ENTREGADA en el primer toque). */
export function nfcReadiness(status: NfcStatus): { ready: boolean; message: string } {
  if (status === "ACTIVA") return { ready: true, message: "El NFC está activo: al acercarlo abrirá este destino." };
  if (status === "ENTREGADA") return { ready: true, message: "El NFC está entregado: abrirá este destino y quedará Activo en su primer uso." };
  if (status === "SUSPENDIDA") return { ready: false, message: "El NFC está suspendido: al acercarlo mostrará que la tarjeta está inhabilitada." };
  return { ready: false, message: `El NFC está en estado «${nfcStatusLabels[status]}»: no abrirá el destino hasta que esté Entregado o Activo.` };
}

function assertSuperAdmin(actor: NfcActor) {
  if (actor.role !== "SUPERADMIN") throw new NfcLinkError("No autorizado.");
}

async function loadCompanyPoint(db: Db, companyId: string, pointId: string) {
  if (!ID.test(companyId) || !ID.test(pointId)) throw new NfcLinkError("Punto Inteligente no encontrado.");
  const point = await db.localTouchpoint.findUnique({ where: { id: pointId }, include: {
    campaign: { select: { id: true, companyId: true, name: true, slug: true, status: true, publishedSnapshot: true,
      company: { select: { name: true } }, localLocation: { select: { name: true, displayName: true } } } },
    physicalNfcCard: { select: { id: true, token: true, status: true, companyId: true } },
  } });
  // Mismo mensaje si no existe o es de otra empresa: un id manipulado no revela nada.
  if (!point || point.campaign.companyId !== companyId) throw new NfcLinkError("Punto Inteligente no encontrado para este cliente.");
  return point;
}
type CompanyPoint = Awaited<ReturnType<typeof loadCompanyPoint>>;

async function findCardByToken(db: Db, token: string) {
  const exact = await db.physicalNfcCard.findUnique({ where: { token } });
  // El registro manual de Superadmin guarda los tokens en minúsculas.
  return exact ?? (token !== token.toLowerCase() ? db.physicalNfcCard.findUnique({ where: { token: token.toLowerCase() } }) : null);
}

/** Valida punto + NFC sin escribir. Devuelve la tarjeta y el punto para confirmar o vincular. */
async function validateLink(db: Db, companyId: string, pointId: string, rawToken: unknown) {
  const point = await loadCompanyPoint(db, companyId, pointId);
  if (point.campaign.status === "ARCHIVED") throw new NfcLinkError("La campaña de este punto está archivada: sus puntos no funcionan. No se puede vincular un NFC.");
  if (point.medium === "QR") throw new NfcLinkError("Este punto está configurado solo para QR. Su soporte debe ser NFC o NFC + QR antes de vincular un NFC.");
  if (point.physicalNfcCard) throw new NfcLinkError(`Este punto ya tiene un NFC vinculado (${tokenHint(point.physicalNfcCard.token)}). Desvincúlalo antes de vincular otro.`);
  const token = normalizeNfcToken(rawToken);
  if (!token) throw new NfcLinkError("Ingresa el token del NFC o la URL completa grabada en el chip (…/t/token).");
  const card = await findCardByToken(db, token);
  if (!card) throw new NfcLinkError("No existe un NFC registrado con ese token. Regístralo primero en Tarjetas NFC.");
  if (card.companyId !== companyId) throw new NfcLinkError("Este NFC está registrado para otra empresa. Las tarjetas físicas no se reasignan entre empresas.");
  if (card.cardId) throw new NfcLinkError("Este NFC ya dirige a una identidad digital de SmartNFC Empresas. Desvincúlalo primero en Tarjetas NFC.");
  if (card.localTouchpointId) throw new NfcLinkError("Este NFC ya está vinculado a otro Punto Inteligente. Desvincúlalo primero.");
  return { point, card };
}

export type DestinationCheck = {
  objective: string;
  summary: string;
  /** Enlace que no registra analítica, o null cuando no existe uno seguro. */
  preview: { href: string; label: string } | null;
  note: string | null;
  publiclyAvailable: boolean;
  unavailableReason: string | null;
};

/** Destino efectivo del punto y si hoy se mostraría públicamente. Solo lectura: no registra visitas. */
async function describeDestination(point: CompanyPoint): Promise<DestinationCheck> {
  const target = pointPreviewTarget(point);
  const objective = objectiveLabels[point.objective];
  let summary: string, preview: DestinationCheck["preview"] = null, note: string | null = null;
  if (target.kind === "CLUB") {
    const snapshot = point.campaign.publishedSnapshot as { clubName?: string } | null;
    summary = `Página del Club «${snapshot?.clubName || point.campaign.name}» (/club/${point.campaign.slug})`;
    note = "Sin enlace de prueba: abrir la página del Club registra una visita en la analítica del cliente.";
  } else if (target.kind === "LANDING") {
    summary = "Página del local con sus acciones";
    preview = { href: target.href, label: "Abrir vista previa (no registra visitas)" };
  } else if (target.kind === "DIRECT") {
    let host = target.href;
    try { host = new URL(target.href).hostname.replace(/^www\./, ""); } catch { /* destino guardado inválido */ }
    summary = `Abre directamente ${host}`;
    preview = { href: target.href, label: "Abrir el destino configurado (no pasa por SmartNFC)" };
  } else {
    summary = "Destino sin configurar";
  }
  const available = !!(await publicPoint(point.code));
  let unavailableReason: string | null = null;
  if (!available) {
    unavailableReason = !point.isActive ? "El punto está pausado."
      : point.campaign.status === "ARCHIVED" ? "La campaña del punto está archivada."
      : point.objective === "CLUB" && point.campaign.status !== "PUBLISHED" ? "El Club de la campaña no está publicado."
      : "La licencia, el local o la configuración del punto no permiten mostrarlo.";
  }
  return { objective, summary, preview, note, publiclyAvailable: available, unavailableReason };
}

export type NfcLinkPreview = {
  client: string; local: string | null; campaign: string; point: string; location: string | null;
  destination: DestinationCheck;
  nfc: { hint: string; status: string; ready: boolean; readiness: string };
  warnings: string[];
};

function warningsFor(destination: DestinationCheck, status: NfcStatus) {
  const warnings: string[] = [];
  const readiness = nfcReadiness(status);
  if (!readiness.ready) warnings.push(readiness.message);
  if (!destination.publiclyAvailable) warnings.push(`Hoy el NFC mostraría «Punto Inteligente temporalmente inactivo». ${destination.unavailableReason}`);
  return warnings;
}

/** Datos para la confirmación de "Vincular NFC". Aplica todas las validaciones de la vinculación sin escribir. */
export async function previewNfcLink(actor: NfcActor, input: { companyId: string; pointId: string; token: unknown }): Promise<NfcLinkPreview> {
  assertSuperAdmin(actor);
  const { point, card } = await validateLink(prisma, input.companyId, input.pointId, input.token);
  const destination = await describeDestination(point);
  const location = point.campaign.localLocation;
  return {
    client: point.campaign.company.name, local: location ? (location.displayName || location.name) : null,
    campaign: point.campaign.name, point: point.name, location: point.location, destination,
    nfc: { hint: tokenHint(card.token), status: nfcStatusLabels[card.status], ready: nfcReadiness(card.status).ready, readiness: nfcReadiness(card.status).message },
    warnings: warningsFor(destination, card.status),
  };
}

/** Vincula el NFC al punto. Transaccional y condicional: nunca reemplaza un vínculo existente. */
export async function linkNfcToPoint(actor: NfcActor, input: { companyId: string; pointId: string; token: unknown }) {
  assertSuperAdmin(actor);
  try {
    return await prisma.$transaction(async tx => {
      const { point, card } = await validateLink(tx, input.companyId, input.pointId, input.token);
      const changed = await tx.physicalNfcCard.updateMany({
        where: { id: card.id, companyId: input.companyId, cardId: null, localTouchpointId: null },
        data: { localTouchpointId: point.id },
      });
      if (changed.count !== 1) throw new NfcLinkError("El NFC cambió mientras se procesaba la vinculación. Revisa su estado e inténtalo nuevamente.");
      await tx.adminAuditLog.create({ data: { actorUserId: actor.id, companyId: input.companyId, action: LOCAL_NFC_LINKED,
        entityType: "PHYSICAL_CARD", entityId: card.id,
        metadata: JSON.stringify({ physicalCardId: card.id, touchpointId: point.id, pointCode: point.code, tokenHint: tokenHint(card.token) }) } });
      return { physicalCardId: card.id, hint: tokenHint(card.token) };
    });
  } catch (error) {
    // Unicidad de localTouchpointId: otro NFC se vinculó al mismo punto en paralelo.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw new NfcLinkError("Este punto ya tiene un NFC vinculado. Recarga la página para ver su estado.");
    throw error;
  }
}

/**
 * Quita únicamente la asociación NFC → punto. No borra el punto, su QR, la campaña, el local, suscriptores
 * ni analítica (las visitas pertenecen al punto, no a la tarjeta), ni la tarjeta física: queda libre en el
 * inventario de la misma empresa, con su estado sin cambios, para volver a vincularse.
 */
export async function unlinkNfcFromPoint(actor: NfcActor, input: { companyId: string; pointId: string; physicalCardId: string }) {
  assertSuperAdmin(actor);
  return prisma.$transaction(async tx => {
    const point = await loadCompanyPoint(tx, input.companyId, input.pointId);
    const card = point.physicalNfcCard;
    if (!card) throw new NfcLinkError("Este punto ya no tiene un NFC vinculado. Recarga la página para ver su estado.");
    if (card.id !== input.physicalCardId) throw new NfcLinkError("El NFC vinculado a este punto cambió. Recarga la página antes de desvincular.");
    if (card.companyId !== input.companyId) throw new NfcLinkError("El NFC vinculado no pertenece a este cliente. Revísalo en Tarjetas NFC.");
    const changed = await tx.physicalNfcCard.updateMany({ where: { id: card.id, companyId: input.companyId, localTouchpointId: point.id }, data: { localTouchpointId: null } });
    if (changed.count !== 1) throw new NfcLinkError("El NFC cambió mientras se procesaba la desvinculación. Recarga la página.");
    await tx.adminAuditLog.create({ data: { actorUserId: actor.id, companyId: input.companyId, action: LOCAL_NFC_UNLINKED,
      entityType: "PHYSICAL_CARD", entityId: card.id,
      metadata: JSON.stringify({ physicalCardId: card.id, touchpointId: point.id, pointCode: point.code, tokenHint: tokenHint(card.token) }) } });
    return { hint: tokenHint(card.token) };
  });
}

export type PointNfcCheck = { point: string; medium: string; destination: DestinationCheck; nfc: { hint: string; status: string; ready: boolean; readiness: string } | null; warnings: string[] };

/** "Comprobar destino": hacia dónde resolverá el NFC del punto, sin pasar por /t ni registrar analítica. */
export async function checkPointNfcDestination(actor: NfcActor, input: { companyId: string; pointId: string }): Promise<PointNfcCheck> {
  assertSuperAdmin(actor);
  const point = await loadCompanyPoint(prisma, input.companyId, input.pointId);
  const destination = await describeDestination(point);
  const card = point.physicalNfcCard && point.physicalNfcCard.companyId === input.companyId ? point.physicalNfcCard : null;
  return {
    point: point.name, medium: point.medium, destination,
    nfc: card ? { hint: tokenHint(card.token), status: nfcStatusLabels[card.status], ready: nfcReadiness(card.status).ready, readiness: nfcReadiness(card.status).message } : null,
    warnings: card ? warningsFor(destination, card.status) : [],
  };
}
