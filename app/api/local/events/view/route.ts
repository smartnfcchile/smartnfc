import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { LocalEventType } from "@prisma/client";
import { hashIp } from "../../../../../lib/security";
import { checkRateLimit } from "../../../../../lib/rateLimit";

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

    // 2. Resolver campaña en servidor con su licencia Local (Requisito H-2 y Parte 4)
    const campaign = await prisma.localCampaign.findUnique({
      where: { slug },
      include: {
        company: {
          include: {
            productLicenses: {
              where: { product: "LOCAL" }
            }
          }
        }
      }
    });

    if (!campaign || campaign.status !== "PUBLISHED") {
      return NextResponse.json({ error: "Campaña no disponible" }, { status: 404 });
    }

    // Verificar licencia Local activa
    const localLicense = campaign.company.productLicenses?.[0];
    const now = new Date();
    const isExpired = localLicense?.expiresAt && localLicense.expiresAt <= now;
    const isFuture = localLicense?.startsAt && localLicense.startsAt > now;
    const isActive = localLicense?.status === "ACTIVE" && !isExpired && !isFuture;

    if (!isActive) {
      return NextResponse.json({ error: "Esta experiencia no se encuentra disponible." }, { status: 403 });
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
    const clientIp = ip.split(",")[0].trim();

    // 5.5. Rate Limiting persistente (Requisito Parte C)
    const rateLimitAction = finalEventType === LocalEventType.WHATSAPP_REDIRECT
      ? "LOCAL_WHATSAPP_REDIRECT"
      : "LOCAL_VIEW";
    const limitCheck = await checkRateLimit(clientIp, rateLimitAction, campaign.id);
    if (!limitCheck.allowed) {
      return NextResponse.json({ error: "Límite de peticiones excedido" }, { status: 429 });
    }

    const ipHash = hashIp(clientIp);
    const userAgent = request.headers.get("user-agent") || undefined;
    const referer = request.headers.get("referer") || undefined;

    // Limitar longitud para evitar spam en DB
    const safeUserAgent = userAgent ? userAgent.substring(0, 255) : null;
    const safeReferer = referer ? referer.substring(0, 255) : null;

    // 6. Registrar evento (Requisito H-7) - Fail-Open
    try {
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
    } catch (trackErr) {
      console.error("Error silencioso (fail-open) al registrar evento de visita:", trackErr);
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("Error al procesar petición de evento local:", err);
    // Retornamos 200 OK para no romper la experiencia de usuario si falla el backend de tracking
    return NextResponse.json({ success: true });
  }
}
