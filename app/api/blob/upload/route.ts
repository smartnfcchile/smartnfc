// app/api/blob/upload/route.ts

import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { getCurrentUserContext } from "../../../../lib/permissions";

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        const user = await getCurrentUserContext();
        if (!pathname || pathname.length > 240 || pathname.startsWith("/") || pathname.includes("..")) {
          throw new Error("Ruta de archivo inválida");
        }
        return {
          allowedContentTypes: ["image/jpeg", "image/png", "image/webp"],
          maximumSizeInBytes: 5_000_000,
          validUntil: Date.now() + 5 * 60 * 1000,
          addRandomSuffix: true,
          allowOverwrite: false,
          tokenPayload: JSON.stringify({
            userId: user.id,
            companyId: user.companyId,
          }),
        };
      },
      onUploadCompleted: async () => {},
    });

    return NextResponse.json(jsonResponse);
  } catch {
    return NextResponse.json(
      { error: "No fue posible autorizar la carga." },
      { status: 400 }
    );
  }
}
