import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { LocalEventType } from "@prisma/client";
import { hashIp } from "../../../../../lib/security";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const slug = body.slug as string;
    const touchpointCode = body.touchpointCode as string | undefined;
    const eventTypeInput = body.eventType as string | undefined;

    // 1. Validar slug
    if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
      return NextResponse.json({ error: "Slug inválido" }, { status: 400 });
    }

    // 2. Resolver campaña en servidor (Requisito H-2)
    const campaign = await prisma.localCampaign.findUnique({
      where: { slug }
    });

    // Exigir status PUBLISHED (Requisito H-3)
    if (!campaign || campaign.status !== "PUBLISHED") {
      return NextResponse.json({ error: "Campaña no disponible" }, { status: 404 });
    }

    // 3. Validar touchpoint si se provee (Requisito H-4)
    let touchpointId: string | null = null;
    let isNfcScan = false;
    
    if (touchpointCode) {
      const tp = await prisma.localTouchpoint.findUnique({
        where: { code: touchpointCode }
      });
      if (tp && tp.campaignId === campaign.id && tp.isActive) {
        touchpointId = tp.id;
      }
    }

    // 4. Determinar tipo de evento
    let finalEventType: LocalEventType = LocalEventType.VIEW;
    if (eventTypeInput === "WHATSAPP_REDIRECT") {
      finalEventType = LocalEventType.WHATSAPP_REDIRECT;
    } else if (touchpointId) {
      // Si hay un touchpoint válido y es una visita inicial, lo catalogamos como QR_SCAN (Requisito I-1)
      finalEventType = LocalEventType.QR_SCAN;
    }

    // 5. Capturar IP Hash, UA y Referer del proxy
    const ip = request.headers.get("x-forwarded-for") || "127.0.0.1";
    const ipHash = hashIp(ip.split(",")[0].trim());
    const userAgent = request.headers.get("user-agent") || undefined;
    const referer = request.headers.get("referer") || undefined;

    // Limitar longitud para evitar spam en DB
    const safeUserAgent = userAgent ? userAgent.substring(0, 255) : null;
    const safeReferer = referer ? referer.substring(0, 255) : null;

    // 6. Registrar evento (Requisito H-7)
    await prisma.localEvent.create({
      data: {
        campaignId: campaign.id,
        touchpointId,
        eventType: finalEventType,
        ipHash,
        userAgent: safeUserAgent,
        referer: safeReferer
      }
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("Error al registrar evento local:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
