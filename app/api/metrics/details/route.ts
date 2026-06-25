// app/api/metrics/details/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";
import { EventType } from "@prisma/client";

function formatUserAgent(ua: string | null): string {
  if (!ua) return "Desconocido";
  if (ua.includes("server-render")) return "Visita antigua";
  if (ua.includes("Windows")) return "Windows / Chrome";
  if (ua.includes("Android")) return "Android";
  if (ua.includes("iPhone")) return "iPhone";
  if (ua.includes("Macintosh")) return "Mac / Safari";
  return "Dispositivo Móvil";
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const user = session.user as any;
  const isAdmin = user.role === "SUPERADMIN" || user.role === "CLIENT_ADMIN";

  const { searchParams } = new URL(request.url);
  const metricType = searchParams.get("type"); // view, nfc, whatsapp, vcard, email, phone

  if (!metricType) {
    return NextResponse.json({ error: "Tipo de métrica requerido" }, { status: 400 });
  }

  // Mapeamos el tipo visual al tipo de base de datos
  let dbEventType: EventType | null = null;
  switch (metricType) {
    case "view":
      dbEventType = EventType.VIEW;
      break;
    case "nfc":
      dbEventType = EventType.NFC_SCAN;
      break;
    case "whatsapp":
      dbEventType = EventType.WHATSAPP_CLICK;
      break;
    case "vcard":
      dbEventType = EventType.VCARD_DOWNLOAD;
      break;
    case "email":
      dbEventType = EventType.EMAIL_CLICK;
      break;
    case "phone":
      dbEventType = EventType.PHONE_CLICK;
      break;
  }

  if (!dbEventType) {
    return NextResponse.json({ error: "Tipo de métrica no soportado" }, { status: 400 });
  }

  const cardCondition = isAdmin ? { companyId: user.companyId } : { userId: user.id };

  try {
    // 1. Obtenemos los últimos 50 eventos de ese tipo
    const events = await prisma.event.findMany({
      where: {
        eventType: dbEventType,
        card: cardCondition,
      },
      include: {
        card: {
          select: {
            name: true,
            id: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    // 2. Obtenemos todos los leads de la empresa/usuario para cruzarlos
    const leads = await prisma.lead.findMany({
      where: { card: cardCondition },
      select: {
        name: true,
        email: true,
        phone: true,
        ipHash: true,
        cardId: true,
      },
    });

    // 3. Mapeamos y cruzamos por ipHash
    const results = events.map((event) => {
      // Un lead coincide si tiene el mismo ipHash y pertenece a la misma tarjeta
      const matchingLead = leads.find(
        (lead) => lead.ipHash === event.ipHash && lead.cardId === event.cardId
      );

      return {
        id: event.id,
        cardName: event.card.name,
        name: matchingLead ? matchingLead.name : "Visitante Anónimo",
        email: matchingLead ? matchingLead.email : null,
        phone: matchingLead ? matchingLead.phone : null,
        device: formatUserAgent(event.userAgent),
        date: event.createdAt,
      };
    });

    return NextResponse.json({ success: true, data: results });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Error al obtener detalles: " + error.message },
      { status: 500 }
    );
  }
}
