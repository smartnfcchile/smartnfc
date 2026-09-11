import QRCode from "qrcode";
import { requireLocalAdmin } from "../../../../../../lib/local/access";
import { prisma } from "../../../../../../lib/prisma";
import { getPublicUrl } from "../../../../../../lib/public-url";
export async function GET(_request: Request, { params }: { params: Promise<{ pointId: string }> }) {
  try {
    const { company } = await requireLocalAdmin();
    const point = await prisma.localTouchpoint.findFirst({ where: { id: (await params).pointId, campaign: { companyId: company.id, status: { not: "ARCHIVED" } } } });
    if (!point || point.medium === "NFC") return new Response("QR no disponible.", { status: 404 });
    const png = await QRCode.toBuffer(getPublicUrl(`/q/${point.code}`), { width: 1024, margin: 4, errorCorrectionLevel: "M" });
    return new Response(new Uint8Array(png), { headers: { "Content-Type": "image/png", "Content-Disposition": `attachment; filename="punto-${point.code}.png"`, "Cache-Control": "private, no-store" } });
  } catch { return new Response("No autorizado.", { status: 403 }); }
}
