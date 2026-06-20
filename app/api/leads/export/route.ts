import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

function escapeCsv(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json(
      { error: "No autorizado. Inicie sesión." },
      { status: 401 }
    );
  }

  const userId = (session.user as any).id;
  const { searchParams } = new URL(request.url);
  const cardId = searchParams.get("cardId");

  let leads;

  if (cardId) {
    // 1. Si viene cardId, verificamos que la tarjeta exista y pertenezca al usuario
    const card = await prisma.card.findUnique({
      where: { id: cardId },
      select: { userId: true },
    });

    if (!card) {
      return NextResponse.json(
        { error: "Tarjeta no encontrada." },
        { status: 404 }
      );
    }

    if (card.userId !== userId) {
      return NextResponse.json(
        { error: "No tiene permisos para ver estos prospectos." },
        { status: 403 }
      );
    }

    leads = await prisma.lead.findMany({
      where: { cardId },
      orderBy: { createdAt: "desc" },
    });
  } else {
    // 2. Si no viene cardId, exportamos todos los leads de todas las tarjetas del usuario
    leads = await prisma.lead.findMany({
      where: {
        card: {
          userId: userId,
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  const headers = [
    "Nombre",
    "Empresa",
    "Cargo",
    "Telefono",
    "Email",
    "Mensaje",
    "Fecha",
  ];

  const rows = leads.map((lead: any) => [
    lead.name,
    lead.company,
    lead.position,
    lead.phone,
    lead.email,
    lead.message,
    lead.createdAt.toLocaleDateString("es-CL"),
  ]);

  const csv = [
    headers.map(escapeCsv).join(","),
    ...rows.map((row: unknown[]) => row.map(escapeCsv).join(",")),
  ].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition":
        'attachment; filename="prospectos-smartnfc.csv"',
    },
  });
}