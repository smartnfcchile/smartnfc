// app/api/track/route.ts

                import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

function hashIp(ip: string) {
  return crypto.createHash("sha256").update(ip).digest("hex");
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const cardId = body.cardId as string;
    const eventType = body.eventType as
      | "VIEW"
      | "NFC_SCAN"
      | "WHATSAPP_CLICK"
      | "PHONE_CLICK"
      | "EMAIL_CLICK"
      | "LINK_CLICK"
      | "VCARD_DOWNLOAD";

    if (!cardId || !eventType) {
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

    await prisma.event.create({
      data: {
        cardId,
        eventType,
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