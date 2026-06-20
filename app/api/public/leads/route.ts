import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function clean(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim();
}

// Mapa en memoria para el Rate Limit por IP
const ipCache = new Map<string, number[]>();

export async function POST(request: Request) {
  try {
    // 1. Obtener dirección IP para el Rate Limit
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || 
               request.headers.get("x-real-ip") || 
               "unknown";

    const now = Date.now();
    const timestamps = ipCache.get(ip) || [];

    // Filtramos los envíos de los últimos 60 segundos
    const recentTimestamps = timestamps.filter(t => now - t < 60000);

    if (recentTimestamps.length >= 5) {
      console.warn(`[RATE_LIMIT] IP bloqueada temporalmente por exceso de peticiones: ${ip}`);
      return NextResponse.json(
        { error: "Límite de solicitudes excedido. Intente nuevamente en un minuto." },
        { status: 429 }
      );
    }

    // Registramos la nueva petición
    recentTimestamps.push(now);
    ipCache.set(ip, recentTimestamps);

    const body = await request.json();

    // 2. Comprobar campo trampa (Honeypot)
    const nickname = clean(body.nickname);
    if (nickname !== "") {
      console.warn(`[SPAM_BLOCKED] Intento de spam detectado y bloqueado por Honeypot. IP: ${ip}, nickname: ${nickname}`);
      // Retornamos éxito simulado (silent discard) para que el bot crea que tuvo éxito y no intente evadir la trampa
      return NextResponse.json({
        ok: true,
        leadId: "honeypot-discarded",
      });
    }

    const cardId = clean(body.cardId);
    const name = clean(body.name);
    const company = clean(body.company);
    const position = clean(body.position);
    const email = clean(body.email);
    const phone = clean(body.phone);
    const message = clean(body.message);

    if (!cardId || !name || !email) {
      return NextResponse.json(
        { error: "Nombre, email y tarjeta son obligatorios." },
        { status: 400 }
      );
    }

    const card = await prisma.card.findUnique({
      where: { id: cardId },
      select: { id: true, isActive: true },
    });

    if (!card || !card.isActive) {
      return NextResponse.json(
        { error: "La tarjeta no existe o no está activa." },
        { status: 404 }
      );
    }

    const lead = await prisma.lead.create({
      data: {
        cardId,
        name,
        company: company || null,
        position: position || null,
        email,
        phone: phone || null,
        message: message || null,
      },
    });

    return NextResponse.json({
      ok: true,
      leadId: lead.id,
    });
  } catch (error) {
    console.error("Error creando lead:", error);

    return NextResponse.json(
      { error: "No pudimos guardar tus datos." },
      { status: 500 }
    );
  }
}