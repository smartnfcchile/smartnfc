import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function escapeCsv(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const cardId = searchParams.get("cardId");

  if (!cardId) {
    return NextResponse.json(
      { error: "cardId es requerido" },
      { status: 400 }
    );
  }

  const leads = await prisma.lead.findMany({
    where: { cardId },
    orderBy: { createdAt: "desc" },
  });

  const headers = [
    "Nombre",
    "Empresa",
    "Cargo",
    "Telefono",
    "Email",
    "Mensaje",
    "Fecha",
  ];

  const rows = leads.map((lead: (typeof leads)[number]) => [
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