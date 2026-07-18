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
    // 1. Resolver touchpoint con su campaña y licencias (Requisito F-1)
    const tp = await prisma.localTouchpoint.findUnique({
      where: { code },
      include: {
        campaign: {
          include: {
            company: {
              include: {
                productLicenses: {
                  where: { product: "LOCAL" }
                }
              }
            }
          }
        }
      }
    });

    if (!tp) {
      return new NextResponse("Punto de contacto no encontrado", { status: 404 });
    }

    // Verificar licencia Local activa (Requisito Parte G y Parte 5)
    const localLicense = tp.campaign.company.productLicenses?.[0];
    const now = new Date();
    const isExpired = localLicense?.expiresAt && localLicense.expiresAt <= now;
    const isFuture = localLicense?.startsAt && localLicense.startsAt > now;
    const isActive = localLicense?.status === "ACTIVE" && !isExpired && !isFuture;

    if (!isActive) {
      return new NextResponse(
        `<html>
          <head>
            <title>No Disponible</title>
            <meta name="robots" content="noindex, follow">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; text-align: center;">
            <div style="background: #1e293b; border: 1px solid #334155; padding: 40px; border-radius: 16px; max-width: 400px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);">
              <span style="font-size: 48px;">🏪</span>
              <h2 style="margin-top: 20px; font-weight: 900; color: #ffffff;">No Disponible</h2>
              <p style="color: #94a3b8; font-size: 14px; line-height: 1.6;">Esta experiencia no se encuentra disponible.</p>
            </div>
          </body>
        </html>`,
        { headers: { "content-type": "text/html; charset=utf-8" }, status: 403 }
      );
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
