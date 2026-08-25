// app/api/track/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { hashIp } from "../../../lib/security";
import { checkRateLimit } from "../../../lib/rateLimit";

const ALLOWED_EVENTS = new Set([
  "VIEW", "NFC_SCAN", "WHATSAPP_CLICK", "PHONE_CLICK", "EMAIL_CLICK",
  "LINK_CLICK", "VCARD_DOWNLOAD", "PROFILE_SHARED",
]);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const cardId = typeof body.cardId === "string" ? body.cardId.trim() : "";
    const eventType = typeof body.eventType === "string" ? body.eventType.trim() : "";

    if (!cardId || !ALLOWED_EVENTS.has(eventType)) {
      return NextResponse.json(
        { error: "cardId y eventType son requeridos" },
        { status: 400 }
      );
    }

    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0] ||
      request.headers.get("x-real-ip") ||
      "unknown";

    const userAgent = request.headers.get("user-agent") || "Desconocido";
    const referer = request.headers.get("referer") || null;

    const { allowed } = await checkRateLimit(ip, "PUBLIC_EVENT_TRACK", cardId);
    if (!allowed) {
      return NextResponse.json({ error: "Demasiadas solicitudes" }, { status: 429 });
    }

    const card = await prisma.card.findFirst({
      where: { id: cardId, isActive: true, company: { isActive: true } },
      select: { id: true },
    });
    if (!card) {
      return NextResponse.json({ error: "Tarjeta no disponible" }, { status: 404 });
    }

    await prisma.event.create({
      data: {
        cardId,
        eventType: eventType as "VIEW" | "NFC_SCAN" | "WHATSAPP_CLICK" | "PHONE_CLICK" | "EMAIL_CLICK" | "LINK_CLICK" | "VCARD_DOWNLOAD" | "PROFILE_SHARED",
        ipHash: hashIp(ip),
        userAgent,
        referer,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("TRACK_ERROR", error);

    return NextResponse.json(
      { error: "No se pudo registrar el evento" },
      { status: 500 }
    );
  }
}
