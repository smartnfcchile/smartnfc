import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { LocalEventType } from "@prisma/client";
import { hashIp } from "../../../lib/security";
import { checkRateLimit } from "../../../lib/rateLimit";

type Params = {
  params: Promise<{
    code: string;
  }>;
};

export async function GET(request: NextRequest, { params }: Params) {
  const { code } = await params;

  try {
    // 1. Resolver touchpoint por código público opaco (Requisito F-1)
    const tp = await prisma.localTouchpoint.findUnique({
      where: { code },
      include: {
        campaign: true
      }
    });

    if (!tp) {
      return new NextResponse("Punto de contacto no encontrado", { status: 404 });
    }

    // 2. Exigir touchpoint activo y campaña publicada con snapshot (Requisito F-2, F-3, F-4)
    if (!tp.isActive) {
      return new NextResponse("Punto de contacto inactivo", { status: 403 });
    }

    if (tp.campaign.status !== "PUBLISHED") {
      return new NextResponse("Campaña no disponible", { status: 403 });
    }

    if (!tp.campaign.publishedSnapshot) {
      return new NextResponse("Campaña no publicada", { status: 403 });
    }

    // 3. Capturar IP, UA, Referer y aplicar Rate Limiting (Requisito F-5)
    const userAgent = request.headers.get("user-agent");
    const referer = request.headers.get("referer");
    const ip = request.headers.get("x-forwarded-for") || "127.0.0.1";
    const clientIp = ip.split(",")[0].trim();

    const limitCheck = await checkRateLimit(clientIp, "LOCAL_VIEW", tp.campaign.id);
    if (!limitCheck.allowed) {
      return new NextResponse("Límite de peticiones excedido", { status: 429 });
    }

    // 4. Registrar LocalEvent QR_SCAN (Requisito F-6)
    await prisma.localEvent.create({
      data: {
        campaignId: tp.campaignId,
        touchpointId: tp.id,
        eventType: LocalEventType.QR_SCAN,
        ipHash: hashIp(clientIp),
        userAgent: userAgent ? userAgent.substring(0, 255) : null,
        referer: referer ? referer.substring(0, 255) : null
      }
    });

    // 5. Redirigir a la landing de la campaña con el ref (Requisito F-7)
    const redirectUrl = new URL(`/club/${tp.campaign.slug}?ref=${tp.code}`, request.url);
    return NextResponse.redirect(redirectUrl.toString(), 302);

  } catch (error: any) {
    console.error("Error en redirección QR:", error);
    return new NextResponse("Error interno del servidor", { status: 500 });
  }
}
