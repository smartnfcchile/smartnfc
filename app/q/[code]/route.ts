import { recordLocalArrival, recordTrackingIncident } from "../../../lib/local/tracking";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { getPublicUrl } from "../../../lib/public-url";

type Params = {
  params: Promise<{
    code: string;
  }>;
};

export async function GET(request: NextRequest, { params }: Params) {
  const { code } = await params;

  try {
    // 1. Resolver touchpoint con su campaña y licencias (Fail-Closed)
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
      return new NextResponse(
        `<html>
          <head>
            <title>No Encontrado</title>
            <meta name="robots" content="noindex, follow">
          </head>
          <body style="font-family: sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; padding: 20px; text-align: center;">
            <div style="background: #1e293b; border: 1px solid #334155; padding: 40px; border-radius: 16px; max-width: 400px;">
              <span style="font-size: 48px;">🔍</span>
              <h2 style="margin-top: 20px; font-weight: 900; color: #ffffff;">Punto de Contacto No Encontrado</h2>
              <p style="color: #94a3b8; font-size: 14px;">El código QR ingresado no existe o no está registrado.</p>
            </div>
          </body>
        </html>`,
        { headers: { "content-type": "text/html; charset=utf-8" }, status: 404 }
      );
    }

    // Verificar licencia Local activa (Fail-Closed)
    const localLicense = tp.campaign.company.productLicenses?.[0];
    const now = new Date();
    const isExpired = localLicense?.expiresAt && localLicense.expiresAt <= now;
    const isFuture = localLicense?.startsAt && localLicense.startsAt > now;
    const isActive = tp.campaign.company.isActive && localLicense?.status === "ACTIVE" && !isExpired && !isFuture;

    if (!isActive) {
      return new NextResponse(
        `<html>
          <head>
            <title>No Disponible</title>
            <meta name="robots" content="noindex, follow">
          </head>
          <body style="font-family: sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; padding: 20px; text-align: center;">
            <div style="background: #1e293b; border: 1px solid #334155; padding: 40px; border-radius: 16px; max-width: 400px;">
              <span style="font-size: 48px;">🏪</span>
              <h2 style="margin-top: 20px; font-weight: 900; color: #ffffff;">No Disponible</h2>
              <p style="color: #94a3b8; font-size: 14px;">Esta experiencia no se encuentra disponible.</p>
            </div>
          </body>
        </html>`,
        { headers: { "content-type": "text/html; charset=utf-8" }, status: 403 }
      );
    }

    // 2. Exigir touchpoint activo y campaña publicada con snapshot (Fail-Closed)
    if (!tp.isActive || tp.campaign.status !== "PUBLISHED" || !tp.campaign.publishedSnapshot) {
      return new NextResponse(
        `<html>
          <head>
            <title>Campaña Inactiva</title>
            <meta name="robots" content="noindex, follow">
          </head>
          <body style="font-family: sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; padding: 20px; text-align: center;">
            <div style="background: #1e293b; border: 1px solid #334155; padding: 40px; border-radius: 16px; max-width: 400px;">
              <span style="font-size: 48px;">⚙️</span>
              <h2 style="margin-top: 20px; font-weight: 900; color: #ffffff;">Campaña no Disponible</h2>
              <p style="color: #94a3b8; font-size: 14px;">Esta campaña no se encuentra disponible en este momento.</p>
            </div>
          </body>
        </html>`,
        { headers: { "content-type": "text/html; charset=utf-8" }, status: 403 }
      );
    }

    let visitId = "";
    try {
      visitId = await recordLocalArrival({companyId: tp.campaign.companyId, campaignId:tp.campaignId,
        touchpointId:tp.id,source:"QR",headers:request.headers});
    } catch { await recordTrackingIncident(tp.campaign.companyId); }
    const target = getPublicUrl(`/club/${tp.campaign.slug}?ref=${tp.code}${visitId ? "&v="+visitId : ""}`);
    return NextResponse.redirect(target, 302);
  } catch (error: any) {
    console.error("Error en resolución QR:", error);
    return new NextResponse("Error interno del servidor", { status: 500 });
  }
}
