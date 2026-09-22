import { hasCapability } from "../../../../lib/entitlements";
import { recordLocalAction } from "../../../../lib/local/tracking";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { checkRateLimit } from "../../../../lib/rateLimit";
import { generateSingleVcfString } from "../../../../lib/vcf";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; filename: string }> | { slug: string; filename: string } }
) {
  // Manejo seguro del parámetro asíncrono en Next.js 15+
  const resolvedParams = await params;
  const slug = resolvedParams.slug;
  const filename = resolvedParams.filename;

  try {
    // 0. Validar nombre de archivo
    if (filename !== "contacto.vcf") {
      return new NextResponse("Not Found", { status: 404 });
    }

    // 1. Validar slug
    if (!slug || !/^[a-z0-9-]+$/.test(slug)) {
      return new NextResponse("Campaña no disponible", {
        status: 404,
        headers: { "X-Content-Type-Options": "nosniff" }
      });
    }

    // 2. Buscar campaña y licencias de la empresa
    const campaign = await prisma.localCampaign.findUnique({
      where: { slug },
      include: {
        localLocation: true,
        company: {
          include: {
            productLicenses: {
              where: { product: "LOCAL" }
            }
          }
        }
      }
    });

    if (!campaign || campaign.status !== "PUBLISHED") {
      return new NextResponse("Campaña no disponible", {
        status: 404,
        headers: {
          "X-Content-Type-Options": "nosniff",
          "Cache-Control": "no-store"
        }
      });
    }

    // 3. Validar licencia Local activa y vigente
    if ((campaign.localLocation && !campaign.localLocation.isActive) || !(await hasCapability(campaign.companyId, "LOCAL_CLUB"))) return new Response("Punto Inteligente temporalmente inactivo", { status: 403, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
    // 4. Cargar snapshot publicado
    if (!campaign.publishedSnapshot) {
      return new NextResponse("Contacto no configurado", {
        status: 404,
        headers: {
          "X-Content-Type-Options": "nosniff",
          "Cache-Control": "no-store"
        }
      });
    }

    const snap = campaign.publishedSnapshot as any;
    const whatsapp = snap.whatsappNumber;
    const orgName = snap.businessName || campaign.name;
    const clubName = snap.clubName || orgName;
    const address = snap.address || "";
    // Obtener la URL pública de la landing del club
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://smartnfc.cl";
    const clubUrl = `${appUrl}/club/${slug}`;

    if (!whatsapp) {
      return new NextResponse("Número de contacto ausente", {
        status: 404,
        headers: {
          "X-Content-Type-Options": "nosniff",
          "Cache-Control": "no-store"
        }
      });
    }

    // 5. Rate Limiting persistente
    const ip = request.headers.get("x-forwarded-for") || "127.0.0.1";
    const clientIp = ip.split(",")[0].trim();
    const limitCheck = await checkRateLimit(clientIp, "LOCAL_VCF_DOWNLOAD", campaign.id);
    if (!limitCheck.allowed) {
      return new NextResponse("Límite de peticiones excedido", {
        status: 429,
        headers: {
          "X-Content-Type-Options": "nosniff",
          "Cache-Control": "no-store"
        }
      });
    }

    // 6. Generar vCard sanitizada
    const vcardContent = generateSingleVcfString({
      fullName: `Club ${clubName}`,
      orgName: orgName,
      phone: whatsapp,
      address: address,
      url: clubUrl
    });

    // 7. Fail-open tracking: registrar descarga en base de datos
    try {

      const visitId = request.nextUrl.searchParams.get("v");
      if (visitId) await recordLocalAction(visitId, campaign.id, "VCF_DOWNLOAD");
    } catch (trackErr) {
      console.error("Error silencioso (fail-open) al registrar evento VCF_DOWNLOAD:", trackErr);
    }

    // Sanitizar nombre de archivo contra inyecciones
    const safeFilename = slug.replace(/[^a-z0-9-]/g, "");

    return new NextResponse(vcardContent, {
      status: 200,
      headers: {
        "Content-Type": "text/vcard; charset=utf-8",
        "Content-Disposition": `attachment; filename="contacto-${safeFilename}.vcf"`,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff"
      }
    });
  } catch (err) {
    console.error("Error en contacto.vcf GET:", err);
    return new NextResponse("Error interno del servidor", {
      status: 500,
      headers: { "X-Content-Type-Options": "nosniff" }
    });
  }
}
