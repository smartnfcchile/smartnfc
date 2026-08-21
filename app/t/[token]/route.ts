import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { EventType, LocalEventType } from "@prisma/client";
import { hashIp } from "../../../lib/security";
import { checkRateLimit } from "../../../lib/rateLimit";
import { getPublicUrl } from "../../../lib/public-url";

type Params = {
  params: Promise<{
    token: string;
  }>;
};

export async function GET(request: Request, { params }: Params) {
  const { token } = await params;

  try {
    // 1. Validar que la tarjeta física exista (Fail-Closed)
    const physicalCard = await prisma.physicalNfcCard.findUnique({
      where: { token },
      include: {
        card: {
          select: {
            slug: true,
          },
        },
        company: {
          include: {
            productLicenses: true,
          },
        },
        localTouchpoint: {
          include: {
            campaign: true
          }
        }
      },
    });

    if (!physicalCard) {
      return new NextResponse(
        `<html>
          <head>
            <title>No Encontrada</title>
            <meta name="robots" content="noindex, follow">
          </head>
          <body style="font-family: sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; padding: 20px; text-align: center;">
            <div style="background: #1e293b; border: 1px solid #334155; padding: 40px; border-radius: 16px; max-width: 400px;">
              <span style="font-size: 48px;">🎴</span>
              <h2 style="margin-top: 20px; font-weight: 900; color: #ffffff;">Tarjeta No Encontrada</h2>
              <p style="color: #94a3b8; font-size: 14px;">La tarjeta física no se encuentra registrada en el sistema.</p>
            </div>
          </body>
        </html>`,
        { headers: { "content-type": "text/html; charset=utf-8" }, status: 404 }
      );
    }

    // 2. Bloquear o mostrar pantalla si la tarjeta física está suspendida (Fail-Closed)
    if (physicalCard.status === "SUSPENDIDA") {
      return new NextResponse(
        `<html>
          <head>
            <meta charset="utf-8">
            <meta name="robots" content="noindex, follow">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Tarjeta Inhabilitada | SmartNFC</title>
            <style>
              body {
                background: #090d16;
                color: #ffffff;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                display: flex;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                margin: 0;
                padding: 20px;
                box-sizing: border-box;
              }
              .card-container {
                max-width: 440px;
                width: 100%;
                background: rgba(15, 23, 42, 0.6);
                border: 1px solid rgba(239, 68, 68, 0.2);
                border-radius: 24px;
                padding: 40px;
                text-align: center;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1);
                backdrop-filter: blur(16px);
              }
              .icon {
                font-size: 48px;
                margin-bottom: 24px;
                display: inline-block;
              }
              h1 {
                font-size: 22px;
                font-weight: 800;
                margin: 0 0 12px 0;
                letter-spacing: -0.02em;
                color: #ef4444;
              }
              p {
                color: #94a3b8;
                font-size: 14px;
                line-height: 1.6;
                margin: 0 0 24px 0;
              }
              .logo {
                font-size: 13px;
                font-weight: 900;
                letter-spacing: 0.1em;
                text-transform: uppercase;
                background: linear-gradient(to right, #3b82f6, #6366f1);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                margin-top: 32px;
              }
            </style>
          </head>
          <body>
            <div class="card-container">
              <span class="icon">⚠️</span>
              <h1>Tarjeta Suspendida</h1>
              <p>Esta tarjeta física SmartNFC ha sido inhabilitada temporalmente por pérdida, robo o suspensión administrativa.</p>
              <div class="logo">SmartNFC</div>
            </div>
          </body>
        </html>`,
        {
          headers: { "Content-Type": "text/html; charset=utf-8" },
          status: 403,
        }
      );
    }

    // 3. Validar que esté ACTIVA o ENTREGADA (y que la empresa asociada esté activa) (Fail-Closed)
    const isValidStatus = physicalCard.status === "ACTIVA" || physicalCard.status === "ENTREGADA";
    const isCompanyActive = physicalCard.company.isActive;

    if (!isValidStatus || !isCompanyActive) {
      return new NextResponse(
        `<html>
          <head>
            <meta charset="utf-8">
            <meta name="robots" content="noindex, follow">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Tarjeta No Activa | SmartNFC</title>
            <style>
              body {
                background: #090d16;
                color: #ffffff;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                display: flex;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                margin: 0;
                padding: 20px;
                box-sizing: border-box;
              }
              .card-container {
                max-width: 440px;
                width: 100%;
                background: rgba(15, 23, 42, 0.6);
                border: 1px solid rgba(255, 255, 255, 0.05);
                border-radius: 24px;
                padding: 40px;
                text-align: center;
              }
              .icon { font-size: 48px; margin-bottom: 24px; }
              h1 { font-size: 22px; font-weight: 800; margin: 0 0 12px 0; color: #f59e0b; }
              p { color: #94a3b8; font-size: 14px; line-height: 1.6; margin: 0; }
            </style>
          </head>
          <body>
            <div class="card-container">
              <span class="icon">⏳</span>
              <h1>Tarjeta No Activada</h1>
              <p>Esta tarjeta física SmartNFC aún no ha sido activada o su empresa asociada se encuentra inhabilitada.</p>
            </div>
          </body>
        </html>`,
        {
          headers: { "Content-Type": "text/html; charset=utf-8" },
          status: 403,
        }
      );
    }

    // 4. Si la tarjeta física está entregada por primera vez, la activamos automáticamente
    if (physicalCard.status === "ENTREGADA") {
      await prisma.physicalNfcCard.update({
        where: { id: physicalCard.id },
        data: {
          status: "ACTIVA",
          activatedAt: new Date(),
        },
      });
    }

    // 5. Verificar anomalía de doble asignación (Fail-Closed)
    if (physicalCard.cardId && physicalCard.localTouchpointId) {
      console.error(`Anomalía de asignación en tarjeta física ${physicalCard.id}: Tiene B2B y Local asignados simultáneamente.`);
      return new NextResponse("Error de asignación de tarjeta: destino ambiguo.", { status: 400 });
    }

    // 6. Ruta Local
    if (physicalCard.localTouchpointId) {
      const tp = physicalCard.localTouchpoint;
      if (!tp || !tp.isActive) {
        return new NextResponse("Punto de contacto inactivo", { status: 403 });
      }

      // Validar licencia Local activa (Fail-Closed)
      const localLicense = physicalCard.company.productLicenses.find(l => l.product === "LOCAL");
      const now = new Date();
      const isLocalExpired = localLicense?.expiresAt && localLicense.expiresAt <= now;
      const isLocalFuture = localLicense?.startsAt && localLicense.startsAt > now;
      const isLocalActive = localLicense?.status === "ACTIVE" && !isLocalExpired && !isLocalFuture;

      if (!isLocalActive) {
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
      if (tp.campaign.status !== "PUBLISHED" || !tp.campaign.publishedSnapshot) {
        return new NextResponse("Campaña no disponible", { status: 403 });
      }

      const userAgent = request.headers.get("user-agent");
      const referer = request.headers.get("referer");
      const ip = request.headers.get("x-forwarded-for") || "127.0.0.1";
      const clientIp = ip.split(",")[0].trim();

      // Registro analítico Local NFC_SCAN (Fail-Open)
      try {
        const limitCheck = await checkRateLimit(clientIp, "LOCAL_VIEW", tp.campaign.id);
        if (limitCheck.allowed) {
          await prisma.localEvent.create({
            data: {
              campaignId: tp.campaignId,
              touchpointId: tp.id,
              eventType: LocalEventType.NFC_SCAN,
              ipHash: hashIp(clientIp),
              userAgent: userAgent ? userAgent.substring(0, 255) : null,
              referer: referer ? referer.substring(0, 255) : null
            }
          });
        }
      } catch (trackErr) {
        console.error("Error silencioso (fail-open) en registro de evento NFC Local:", trackErr);
      }

      return NextResponse.redirect(getPublicUrl(`/club/${tp.campaign.slug}?ref=${tp.code}`), 302);
    }

    // 7. Ruta B2B
    if (physicalCard.cardId && physicalCard.card?.slug) {
      // Validar licencia Empresas activa (Fail-Closed)
      const empresasLicense = physicalCard.company.productLicenses.find(l => l.product === "EMPRESAS");
      const now = new Date();
      const isEmpresasExpired = empresasLicense?.expiresAt && empresasLicense.expiresAt <= now;
      const isEmpresasFuture = empresasLicense?.startsAt && empresasLicense.startsAt > now;
      const isEmpresasActive = empresasLicense?.status === "ACTIVE" && !isEmpresasExpired && !isEmpresasFuture;

      if (!isEmpresasActive) {
        return new NextResponse(
          `<html>
            <head>
              <title>No Disponible</title>
              <meta name="robots" content="noindex, follow">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="font-family: sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; padding: 20px; box-sizing: border-box; text-align: center;">
              <div style="background: #1e293b; border: 1px solid #334155; padding: 40px; border-radius: 16px; max-width: 400px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);">
                <span style="font-size: 48px;">🎴</span>
                <h2 style="margin-top: 20px; font-weight: 900; color: #ffffff;">No Disponible</h2>
                <p style="color: #94a3b8; font-size: 14px; line-height: 1.6;">Esta experiencia no se encuentra disponible.</p>
              </div>
            </body>
          </html>`,
          { headers: { "content-type": "text/html; charset=utf-8" }, status: 403 }
        );
      }

      const userAgent = request.headers.get("user-agent");
      const referer = request.headers.get("referer");
      const ip = request.headers.get("x-forwarded-for") || "127.0.0.1";
      const ipHash = ip.split(",")[0].trim();

      // Registro analítico B2B NFC_SCAN (Fail-Open)
      try {
        await prisma.event.create({
          data: {
            eventType: EventType.NFC_SCAN,
            cardId: physicalCard.cardId,
            physicalCardId: physicalCard.id,
            ipHash,
            userAgent,
            referer,
          },
        });
      } catch (trackErr) {
        console.error("Error silencioso (fail-open) en registro de evento NFC B2B:", trackErr);
      }

      return NextResponse.redirect(getPublicUrl(`/c/${physicalCard.card.slug}`), 302);
    }

    // 8. Tarjeta no asignada
    return new NextResponse("Esta tarjeta física no tiene un destino asignado.", { status: 400 });

  } catch (error: any) {
    console.error("Error en redirección NFC:", error);
    return new NextResponse("Error interno del servidor", { status: 500 });
  }
}
