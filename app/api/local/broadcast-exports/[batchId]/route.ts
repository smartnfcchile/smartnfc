import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../lib/auth";
import { generateMultiVcfString } from "../../../../../lib/vcf";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ batchId: string }> | { batchId: string } }
) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return new NextResponse("No autorizado. Inicie sesión.", {
      status: 401,
      headers: { "X-Content-Type-Options": "nosniff" }
    });
  }

  const resolvedParams = await params;
  const batchId = resolvedParams.batchId;
  const companyId = (session.user as any).companyId;

  try {
    // 1. Obtener y validar el lote con sus items
    const batch = await prisma.localBroadcastExportBatch.findUnique({
      where: { id: batchId },
      include: {
        campaign: true,
        items: {
          include: {
            subscriber: true,
            consentRecord: true
          }
        }
      }
    });

    if (!batch || batch.companyId !== companyId) {
      return new NextResponse("Lote no encontrado o acceso denegado.", {
        status: 404,
        headers: { "X-Content-Type-Options": "nosniff" }
      });
    }

    if (batch.status !== "EXPORTED" && batch.status !== "CONFIRMED") {
      return new NextResponse("El lote no está disponible para descarga en su estado actual.", {
        status: 400,
        headers: { "X-Content-Type-Options": "nosniff" }
      });
    }

    // 2. Validar licencia Local activa para la empresa
    const activeLicense = await prisma.companyProductLicense.findUnique({
      where: { companyId_product: { companyId, product: "LOCAL" } }
    });

    const now = new Date();
    const isExpired = activeLicense?.expiresAt && activeLicense.expiresAt <= now;
    const isFuture = activeLicense?.startsAt && activeLicense.startsAt > now;
    const isActive = activeLicense?.status === "ACTIVE" && !isExpired && !isFuture;

    if (!isActive) {
      return new NextResponse("Su licencia de Smart NFC Local no está activa.", {
        status: 403,
        headers: { "X-Content-Type-Options": "nosniff" }
      });
    }

    // 3. Formatear contactos exclusivamente a partir de los items guardados en el lote
    const contactsData = batch.items.map(item => {
      const sub = item.subscriber;
      const snap = batch.campaign?.publishedSnapshot as any;
      const campaignName = snap?.clubName || batch.campaign?.name || "Beneficios";
      
      return {
        fullName: `Club ${campaignName} - ${sub.name}`,
        phone: sub.whatsapp
      };
    });

    const vcfContent = generateMultiVcfString(contactsData);

    // 4. Devolver la respuesta de vCard inmutable con cabeceras seguras
    return new NextResponse(vcfContent, {
      status: 200,
      headers: {
        "Content-Type": "text/vcard; charset=utf-8",
        "Content-Disposition": `attachment; filename="contactos-lote-${batchId}.vcf"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff"
      }
    });
  } catch (err) {
    console.error("Error en descarga de lote:", err);
    return new NextResponse("Error interno del servidor", {
      status: 500,
      headers: { "X-Content-Type-Options": "nosniff" }
    });
  }
}
