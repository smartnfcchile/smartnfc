import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function clean(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim();
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

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