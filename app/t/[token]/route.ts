import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { EventType } from "@prisma/client";

type Params = {
  params: Promise<{
    token: string;
  }>;
};

export async function GET(request: Request, { params }: Params) {
  const { token } = await params;

  try {
    // 1. Validar que la tarjeta física exista
    const physicalCard = await prisma.physicalNfcCard.findUnique({
      where: { token },
      include: {
        card: {
          select: {
            slug: true,
          },
        },
        company: {
          select: {
            isActive: true,
          },
        },
      },
    });

    if (!physicalCard) {
      return new NextResponse("Tarjeta física no encontrada", { status: 404 });
    }

    // 2. Bloquear o mostrar pantalla si la tarjeta física está suspendida
    if (physicalCard.status === "SUSPENDIDA") {
      return new NextResponse(
        `<html>
          <head>
            <meta charset="utf-8">
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
                animation: pulse 2s infinite;
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
              @keyframes pulse {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.1); }
              }
            </style>
          </head>
          <body>
            <div class="card-container">
              <span class="icon">⚠️</span>
              <h1>Tarjeta Suspendida</h1>
              <p>Esta tarjeta física SmartNFC ha sido inhabilitada temporalmente por pérdida, robo o suspensión administrativa. Si eres el dueño de esta tarjeta, por favor ponte en contacto con el administrador de tu cuenta.</p>
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

    // 3. Validar que esté ACTIVA o ENTREGADA (y que la empresa asociada esté activa)
    const isValidStatus = physicalCard.status === "ACTIVA" || physicalCard.status === "ENTREGADA";
    const isCompanyActive = physicalCard.company.isActive;

    if (!isValidStatus || !isCompanyActive) {
      return new NextResponse(
        `<html>
          <head>
            <meta charset="utf-8">
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
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05);
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
                color: #f59e0b;
              }
              p {
                color: #94a3b8;
                font-size: 14px;
                line-height: 1.6;
                margin: 0;
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
              <span class="icon">⏳</span>
              <h1>Tarjeta No Activada</h1>
              <p>Esta tarjeta física SmartNFC está en proceso de entrega o grabación y aún no ha sido activada o su empresa asociada se encuentra inhabilitada.</p>
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

    // 5. Si no tiene tarjeta virtual asignada, no podemos redirigir
    if (!physicalCard.cardId || !physicalCard.card?.slug) {
      return new NextResponse("Esta tarjeta física no tiene una tarjeta virtual asignada.", { status: 400 });
    }

    // 6. Registrar evento NFC_SCAN
    const userAgent = request.headers.get("user-agent");
    const referer = request.headers.get("referer");
    
    // Obtenemos ipHash de los headers de proxy si existen
    const ip = request.headers.get("x-forwarded-for") || "127.0.0.1";
    const ipHash = ip.split(",")[0].trim();

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

    // 7. Redirigir a /c/[slug]
    const redirectUrl = new URL(`/c/${physicalCard.card.slug}`, request.url);
    return NextResponse.redirect(redirectUrl.toString(), 302);

  } catch (error: any) {
    console.error("Error en redirección NFC:", error);
    return new NextResponse("Error interno del servidor", { status: 500 });
  }
}
