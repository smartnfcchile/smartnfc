import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { prisma } from "../../../../../../lib/prisma";
import { requireSuperAdmin } from "../../../../../../lib/permissions";
import { getPublicUrl } from "../../../../../../lib/public-url";

export async function GET(request: Request, { params }: { params: Promise<{ physicalCardId: string }> }) {
  const session = await requireSuperAdmin().catch(() => null);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { physicalCardId } = await params;
  const physicalCard = await prisma.physicalNfcCard.findUnique({
    where: { id: physicalCardId },
    select: { token: true }
  });
  if (!physicalCard) return NextResponse.json({ error: "Tarjeta física no encontrada" }, { status: 404 });

  const url = new URL(request.url);
  const target = getPublicUrl(`/t/${physicalCard.token}`);
  const format = url.searchParams.get("format") === "svg" ? "svg" : "png";
  const disposition = url.searchParams.get("download") === "1" ? "attachment" : "inline";
  const filename = `qr-nfc-${physicalCard.token}`;

  if (format === "svg") {
    const svg = await QRCode.toString(target, { type: "svg", width: 1200, margin: 4, errorCorrectionLevel: "M" });
    return new NextResponse(svg, { headers: { "Content-Type": "image/svg+xml; charset=utf-8", "Content-Disposition": `${disposition}; filename="${filename}.svg"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
  }

  const png = await QRCode.toBuffer(target, { type: "png", width: 1200, margin: 4, errorCorrectionLevel: "M" });
  return new NextResponse(new Uint8Array(png), { headers: { "Content-Type": "image/png", "Content-Disposition": `${disposition}; filename="${filename}.png"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
}
