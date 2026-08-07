import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { hashIp } from "../../../../lib/security";
import { EventType } from "@prisma/client";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const cardId = typeof body.cardId === "string" ? body.cardId.trim() : "";
    const eventTypeParam = typeof body.eventType === "string" ? body.eventType.trim() : "";
    const sourceParam = typeof body.contactSource === "string" ? body.contactSource.trim() : "";

    // Validación rigurosa de parámetros de entrada
    if (!cardId || (eventTypeParam !== "VIEW" && eventTypeParam !== "NFC_SCAN")) {
      return NextResponse.json({ error: "Invalid payload parameters" }, { status: 400 });
    }

    if (sourceParam !== "NFC" && sourceParam !== "QR" && sourceParam !== "DIRECT") {
      return NextResponse.json({ error: "Invalid contact source" }, { status: 400 });
    }

    // 1. Obtener datos analíticos seguros en el servidor
    const headersList = request.headers;
    const ip = headersList.get("x-forwarded-for")?.split(",")[0] ||
               headersList.get("x-real-ip") ||
               "unknown";
    const userAgent = headersList.get("user-agent") || "Desconocido";
    const referer = headersList.get("referer") || null;
    const ipHash = hashIp(ip);

    // 2. Operación transaccional con deduplicación de 5 segundos
    const result = await prisma.$transaction(async (tx) => {
      // Validar existencia de la tarjeta
      const card = await tx.card.findUnique({
        where: { id: cardId },
        select: { id: true, isActive: true },
      });

      if (!card || !card.isActive) {
        throw new Error("CARD_NOT_ACTIVE");
      }

      // Ventana de deduplicación de 5 segundos
      const dedupeWindow = new Date(Date.now() - 5000);

      // Buscar si existe un evento idéntico reciente
      // RIESGO RESIDUAL: Al no contar con un índice de restricción única temporal (unique constraint)
      // a nivel de base de datos PostgreSQL, persiste una probabilidad mínima de duplicación
      // si se ejecutan peticiones idénticas exactamente simultáneas en hilos o contenedores
      // serverless separados (condición de carrera).
      const existingEvent = await tx.event.findFirst({
        where: {
          cardId,
          ipHash,
          eventType: eventTypeParam as EventType,
          createdAt: { gte: dedupeWindow },
        },
      });

      if (existingEvent) {
        return { skipped: true };
      }

      // Si no hay duplicado reciente, registrar la visita
      const newEvent = await tx.event.create({
        data: {
          cardId,
          eventType: eventTypeParam as EventType,
          ipHash,
          userAgent,
          referer,
        },
      });

      return { skipped: false, id: newEvent.id };
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof Error && error.message === "CARD_NOT_ACTIVE") {
      return NextResponse.json({ error: "Card not found or inactive" }, { status: 404 });
    }
    console.error("Error creating event:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
