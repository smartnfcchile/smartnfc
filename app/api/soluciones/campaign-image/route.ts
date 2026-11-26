import { NextResponse } from "next/server";
import { requireSolutionsOperator } from "../../../../lib/soluciones/access";
import { CampaignImageError, campaignImageMaxBytes, optimizeCampaignImage, storeCampaignImage } from "../../../../lib/soluciones/campaign-image";
import { checkRateLimit } from "../../../../lib/rateLimit";
import { prisma } from "../../../../lib/prisma";

export const runtime = "nodejs";

function respond(body: { error: string } | { url: string; bytes: number }, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  if (request.headers.get("origin") !== url.origin) return respond({ error: "Origen no autorizado." }, 403);
  const length = Number(request.headers.get("content-length"));
  if (length > campaignImageMaxBytes + 64 * 1024) return respond({ error: "Selecciona una imagen de hasta 4 MB." }, 413);
  if (!Number.isSafeInteger(length) || length <= 0 || !request.headers.get("content-type")?.startsWith("multipart/form-data;")) {
    return respond({ error: "Solicitud de imagen inválida." }, 400);
  }
  const companyId = url.searchParams.get("companyId") ?? "";
  const projectId = url.searchParams.get("projectId") ?? "";
  const kind = url.searchParams.get("kind");
  if (![companyId, projectId].every(id => /^[A-Za-z0-9_-]{1,128}$/.test(id)) || (kind !== "image" && kind !== "logo")) {
    return respond({ error: "Campaña o tipo de imagen inválidos." }, 400);
  }
  const access = await requireSolutionsOperator(companyId).catch(() => null);
  if (!access) return respond({ error: "Acceso no autorizado." }, 403);
  const project = await prisma.solutionProject.findFirst({
    where: { id: projectId, companyId, mode: "CAMPAIGN", company: { isActive: true } }, select: { id: true },
  });
  if (!project) return respond({ error: "Campaña no disponible para esta organización." }, 404);
  if (!(await checkRateLimit("user:" + access.actor.id, "CAMPAIGN_IMAGE_UPLOAD")).allowed) {
    return respond({ error: "Límite de cargas alcanzado. Intenta más tarde." }, 429);
  }
  try {
    const file = (await request.formData().catch(() => null))?.get("file");
    if (!(file instanceof Blob)) return respond({ error: "Selecciona una imagen." }, 400);
    const image = await optimizeCampaignImage(file, kind);
    return respond({ url: await storeCampaignImage({ companyId, projectId }, image), bytes: image.length });
  } catch (error) {
    if (error instanceof CampaignImageError) return respond({ error: error.message }, 422);
    return respond({ error: "No se pudo almacenar la imagen. Intenta nuevamente." }, 503);
  }
}
