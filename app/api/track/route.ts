// app/api/track/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma"; // Conectamos nuestra base de datos
import { createHash } from "crypto";

// Función de seguridad: Hashear la IP para no guardar datos personales en texto plano
function hashIp(ip: string | null) {
  if (!ip) return null;
  const salt = process.env.TRACK_IP_SALT || "nfc-smart-cards-seguridad-2026";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }

    // Recibimos el "slug" (el identificador único de la tarjeta en la URL)
    const { slug, eventType, referer } = body;

    if (!slug || !eventType) {
      return NextResponse.json({ error: "Faltan parámetros requeridos" }, { status: 400 });
    }

    // 1. EL TRUCO DEL SAAS: Buscamos la tarjeta en la base de datos
    const card = await prisma.card.findUnique({
      where: { slug }
    });

    // Si la tarjeta no existe o está desactivada, bloqueamos el registro
    if (!card || !card.isActive) {
      return NextResponse.json({ error: "Tarjeta no encontrada o inactiva" }, { status: 404 });
    }

    // 2. Extraer huellas del dispositivo del visitante
    const userAgent = request.headers.get("user-agent")?.slice(0, 500) || "Desconocido";
    
    // Extraer la IP real (incluso si pasan por un proxy o Vercel)
    const forwarded = request.headers.get("x-forwarded-for");
    const realIp = request.headers.get("x-real-ip");
    const ip = forwarded ? forwarded.split(",")[0]?.trim() : realIp?.trim();
    
    const ipHash = hashIp(ip ?? null);

    // 3. Guardar el evento amarrado al ID exacto de la tarjeta (card.id)
    await prisma.event.create({
      data: {
        eventType,
        ipHash,
        userAgent,
        referer: referer?.slice(0, 500),
        cardId: card.id, // ¡Aquí conectamos la métrica con su dueño real!
      }
    });

    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error("[TRACKING_ERROR]", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}