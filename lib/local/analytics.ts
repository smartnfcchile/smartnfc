// Analítica actual de SmartNFC Local para el dashboard. Solo lectura y SIEMPRE acotada a una empresa.
// Métricas honestas y separadas (docs/local-actions.md):
//   accesos (LocalVisit: toque NFC, escaneo QR o enlace) · vistas de la página del local (LANDING_VIEW)
//   · clics en acciones (LocalActionClick) · salidas directas (DIRECT: WHATSAPP_REDIRECT/DESTINATION_REDIRECT)
//   · Club: suscripciones nuevas, confirmaciones por WhatsApp y contactos guardados.
// Un clic no confirma un mensaje, una reseña, un seguidor ni una compra.
import { Prisma } from "@prisma/client";
import { prisma } from "../prisma";
import { effectivePresentationLabel, objectiveLabels } from "./point-config";
import { REPORT_TIMEZONE } from "./report-period";
import type { AnalyticsRange } from "./analytics-period";

export type AnalyticsTotals = {
  visits: number; nfc: number; qr: number; direct: number; landingViews: number; actionClicks: number;
  directExits: number; newSubscribers: number; clubWhatsapp: number; clubContacts: number;
};
export type LocalAnalytics = {
  totals: AnalyticsTotals;
  previous: AnalyticsTotals | null;
  incidents: number;
  daily: Array<{ day: string; visits: number; clicks: number }>;
  points: Array<{ id: string; name: string; location: string; objective: string; mode: string; visits: number; clicks: number }>;
  actions: Array<{ type: string; clicks: number }>;
  objectives: Array<{ objective: string; label: string; visits: number }>;
  locations: Array<{ id: string; name: string; visits: number }>;
};

type Db = Prisma.TransactionClient | typeof prisma;
const inRange = (r: AnalyticsRange) => ({ gte: r.start, lt: r.end });

async function totals(db: Db, companyId: string, r: AnalyticsRange): Promise<AnalyticsTotals> {
  const [sources, landingViews, actionClicks, exits, club, newSubscribers] = await Promise.all([
    db.localVisit.groupBy({ by: ["source"], where: { companyId, createdAt: inRange(r) }, _count: { _all: true } }),
    db.localEvent.count({ where: { campaign: { companyId }, eventType: "LANDING_VIEW", createdAt: inRange(r) } }),
    db.localActionClick.count({ where: { companyId, createdAt: inRange(r) } }),
    // Salidas automáticas de puntos DIRECT (no del Club: su WhatsApp es la confirmación de suscripción).
    db.localEvent.count({ where: { campaign: { companyId }, eventType: { in: ["WHATSAPP_REDIRECT", "DESTINATION_REDIRECT"] }, createdAt: inRange(r),
      visit: { is: { objective: { not: "CLUB" } } } } }),
    db.localEvent.groupBy({ by: ["eventType"], where: { campaign: { companyId }, eventType: { in: ["WHATSAPP_REDIRECT", "VCF_DOWNLOAD"] }, createdAt: inRange(r),
      visit: { is: { objective: "CLUB" } } }, _count: { _all: true } }),
    db.localSubscriber.count({ where: { campaign: { companyId }, firstSubscribedAt: inRange(r) } }),
  ]);
  const source = (s: string) => sources.find(x => x.source === s)?._count._all ?? 0;
  const clubEvent = (t: string) => club.find(x => x.eventType === t)?._count._all ?? 0;
  return {
    visits: sources.reduce((n, s) => n + s._count._all, 0), nfc: source("NFC"), qr: source("QR"), direct: source("DIRECT") + source("UNKNOWN"),
    landingViews, actionClicks, directExits: exits, newSubscribers, clubWhatsapp: clubEvent("WHATSAPP_REDIRECT"), clubContacts: clubEvent("VCF_DOWNLOAD"),
  };
}

export async function localAnalytics(companyId: string, range: AnalyticsRange, compare: AnalyticsRange | null, db: Db = prisma): Promise<LocalAnalytics> {
  const where = { companyId, createdAt: inRange(range) };
  const [current, previous, incidents, byPoint, byObjective, clicksByPoint, clicksByType, dailyVisits, dailyClicks] = await Promise.all([
    totals(db, companyId, range),
    compare ? totals(db, companyId, compare) : Promise.resolve(null),
    db.localTrackingIncident.count({ where }),
    db.localVisit.groupBy({ by: ["touchpointId"], where, _count: { _all: true } }),
    db.localVisit.groupBy({ by: ["objective"], where, _count: { _all: true } }),
    db.localActionClick.groupBy({ by: ["touchpointId"], where, _count: { _all: true } }),
    db.localActionClick.groupBy({ by: ["actionType"], where, _count: { _all: true } }),
    // Días calendario de Chile. createdAt se guarda en UTC sin zona: los límites se convierten a UTC
    // explícitamente para no depender de la zona horaria de la sesión. Consultas parametrizadas.
    db.$queryRaw<Array<{ day: string; n: bigint }>>`SELECT to_char(("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE ${REPORT_TIMEZONE}, 'YYYY-MM-DD') AS day, count(*) AS n
      FROM "LocalVisit" WHERE "companyId" = ${companyId} AND "createdAt" >= (${range.start}::timestamptz AT TIME ZONE 'UTC') AND "createdAt" < (${range.end}::timestamptz AT TIME ZONE 'UTC') GROUP BY 1`,
    db.$queryRaw<Array<{ day: string; n: bigint }>>`SELECT to_char(("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE ${REPORT_TIMEZONE}, 'YYYY-MM-DD') AS day, count(*) AS n
      FROM "LocalActionClick" WHERE "companyId" = ${companyId} AND "createdAt" >= (${range.start}::timestamptz AT TIME ZONE 'UTC') AND "createdAt" < (${range.end}::timestamptz AT TIME ZONE 'UTC') GROUP BY 1`,
  ]);

  const ids = [...new Set([...byPoint, ...clicksByPoint].flatMap(p => p.touchpointId ? [p.touchpointId] : []))];
  // Nombres internos solo para el dueño del dato (dashboard de la propia empresa), nunca en páginas públicas.
  const names = await db.localTouchpoint.findMany({ where: { id: { in: ids }, campaign: { companyId } },
    select: { id: true, name: true, objective: true, presentationMode: true, campaign: { select: { localLocation: { select: { id: true, name: true, displayName: true } } } } } });
  const info = new Map(names.map(n => [n.id, n]));
  const clicksOf = (id: string | null) => clicksByPoint.find(c => c.touchpointId === id)?._count._all ?? 0;
  const pointIds = [...new Set([...byPoint.map(p => p.touchpointId), ...clicksByPoint.map(p => p.touchpointId)])];
  const points = pointIds.map(id => {
    const n = id ? info.get(id) : undefined;
    const loc = n?.campaign.localLocation;
    return { id: id ?? "sin-punto", name: n?.name ?? "Sin punto asociado", location: loc?.displayName || loc?.name || "",
      objective: n ? objectiveLabels[n.objective] : "—", mode: n ? effectivePresentationLabel(n.objective, n.presentationMode) : "—",
      visits: byPoint.find(p => p.touchpointId === id)?._count._all ?? 0, clicks: clicksOf(id) };
  }).sort((a, b) => b.visits - a.visits || b.clicks - a.clicks);

  const locationVisits = new Map<string, { id: string; name: string; visits: number }>();
  for (const p of byPoint) {
    const loc = p.touchpointId ? info.get(p.touchpointId)?.campaign.localLocation : null;
    if (!loc) continue;
    const entry = locationVisits.get(loc.id) ?? { id: loc.id, name: loc.displayName || loc.name || "Local", visits: 0 };
    entry.visits += p._count._all; locationVisits.set(loc.id, entry);
  }
  const perDay = (rows: Array<{ day: string; n: bigint }>) => new Map(rows.map(r => [r.day, Number(r.n)]));
  const v = perDay(dailyVisits), c = perDay(dailyClicks);
  return {
    totals: current, previous, incidents,
    daily: [...new Set([...v.keys(), ...c.keys()])].sort().map(day => ({ day, visits: v.get(day) ?? 0, clicks: c.get(day) ?? 0 })),
    points,
    actions: clicksByType.map(a => ({ type: a.actionType, clicks: a._count._all })).sort((a, b) => b.clicks - a.clicks),
    objectives: byObjective.map(o => ({ objective: o.objective, label: objectiveLabels[o.objective], visits: o._count._all })).sort((a, b) => b.visits - a.visits),
    locations: [...locationVisits.values()].sort((a, b) => b.visits - a.visits),
  };
}
