import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserContext } from "@/lib/permissions";

function escapeCsv(value: unknown) {
  let text = String(value ?? "");
  // Evita ejecución de fórmulas al abrir el CSV en Excel o Google Sheets.
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export async function GET(request: NextRequest) {
  let user;
  try {
    user = await getCurrentUserContext();
  } catch {
    return NextResponse.json(
      { error: "No autorizado. Inicie sesión." },
      { status: 401 }
    );
  }

  const isAdmin = user.role === "SUPERADMIN" || user.role === "COMPANY_OWNER" || user.role === "COMPANY_ADMIN";
  const { searchParams } = new URL(request.url);
  const cardId = searchParams.get("cardId");

  let leads;

  if (cardId) {
    // 1. Si viene cardId, verificamos que la tarjeta exista y pertenezca al usuario
    const card = await prisma.card.findUnique({
      where: { id: cardId },
      select: { userId: true, companyId: true },
    });

    if (!card) {
      return NextResponse.json(
        { error: "Tarjeta no encontrada." },
        { status: 404 }
      );
    }

    if (isAdmin ? card.companyId !== user.companyId : card.userId !== user.id) {
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
          ...(isAdmin ? { companyId: user.companyId } : { userId: user.id }),
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
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
