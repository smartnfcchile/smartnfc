import { randomUUID } from "node:crypto";
import { ContactSource, LocalEventType, LocalPointObjective, LocalPointPresentationMode, Prisma } from "@prisma/client";
import { prisma } from "../prisma";
import { hashIp } from "../security";
import { checkRateLimit } from "../rateLimit";

export const visitIdValid = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);

export async function recordLocalArrival(input: {
  companyId: string; campaignId: string; touchpointId?: string | null;
  source: ContactSource; headers: Headers; id?: string; objective?: LocalPointObjective;
}) {
  const id = input.id || randomUUID();
  if (!visitIdValid(id)) throw new Error("Visita inválida.");
  const ip = input.headers.get("x-forwarded-for")?.split(",")[0].trim() || "127.0.0.1";
  if (!(await checkRateLimit(ip, "LOCAL_VIEW", input.campaignId)).allowed) throw new Error("Límite de visitas.");
  const eventType = input.source === "NFC" ? LocalEventType.NFC_SCAN :
    input.source === "QR" ? LocalEventType.QR_SCAN : LocalEventType.VIEW;
  try {
    await prisma.$transaction(async tx => {
      await tx.localReportSetting.upsert({
        where: { companyId: input.companyId },
        create: { companyId: input.companyId }, update: {}
      });
      await tx.localVisit.create({ data: {
        id, companyId: input.companyId, campaignId: input.campaignId,
        touchpointId: input.touchpointId || null, source: input.source, objective: input.objective || "CLUB"
      } });
      await tx.localEvent.create({ data: {
        visitId: id, campaignId: input.campaignId, touchpointId: input.touchpointId || null,
        eventType, ipHash: hashIp(ip),
        userAgent: input.headers.get("user-agent")?.slice(0,255),
        referer: input.headers.get("referer")?.slice(0,255)
      } });
    });
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) throw error;
    const previous = await prisma.localVisit.findUnique({ where: { id } });
    if (!previous || previous.companyId !== input.companyId || previous.campaignId !== input.campaignId ||
        previous.source !== input.source || previous.objective !== (input.objective || "CLUB") || previous.touchpointId !== (input.touchpointId || null)) throw new Error("Visita inválida.");
  }
  return id;
}

export async function findLocalVisit(id: unknown, campaignId: string) {
  if (typeof id !== "string" || !visitIdValid(id)) return null;
  return prisma.localVisit.findFirst({ where: {
    id, campaignId, createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) }
  } });
}

export async function recordLocalAction(visitId: string, campaignId: string, eventType: "VIEW" | "WHATSAPP_REDIRECT" | "VCF_DOWNLOAD" | "DESTINATION_REDIRECT" | "LANDING_VIEW") {
  const visit = await findLocalVisit(visitId, campaignId);
  if (!visit) throw new Error("Visita no disponible.");
  await prisma.localEvent.upsert({
    where: { visitId_eventType: { visitId, eventType } },
    create: { campaignId, touchpointId: visit.touchpointId, visitId, eventType }, update: {}
  });
}

/**
 * Clic en una acción pública, atribuido a una visita ya registrada del mismo punto (una por visita y acción).
 * La visita llega validada por el llamador (findLocalVisit + touchpointId). Un clic NO confirma mensaje, reseña, seguimiento ni compra.
 */
export async function recordActionClick(input: {
  visit: { id: string; companyId: string; campaignId: string; touchpointId: string | null; source: ContactSource };
  point: { objective: LocalPointObjective; presentationMode: LocalPointPresentationMode };
  action: { id: string; type: string; role: string };
}) {
  const { visit, point, action } = input;
  try {
    await prisma.localActionClick.create({ data: {
      companyId: visit.companyId, campaignId: visit.campaignId, touchpointId: visit.touchpointId, visitId: visit.id,
      actionId: action.id, actionType: action.type, actionRole: action.role, source: visit.source,
      objective: point.objective, presentationMode: point.presentationMode,
    } });
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) throw error;
  }
}


// Best-effort incident recording. Total DB outages also require infrastructure
// log monitoring: an unavailable database cannot persist its own outage.
export async function recordTrackingIncident(companyId:string) {
  console.error("LOCAL_TRACKING_FAILED");
  try { await prisma.localTrackingIncident.create({data:{companyId}}); } catch {}
}
