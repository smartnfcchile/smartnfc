import { resolveLocalPoint } from "../../../lib/local/point-resolver";
export const dynamic = "force-dynamic";
export async function GET(request: Request, { params }: { params: Promise<{ code: string }> }) {
  try { return await resolveLocalPoint((await params).code, "DIRECT", request.headers); }
  catch { return new Response("No se pudo abrir el punto.", { status: 503, headers: { "Cache-Control": "no-store" } }); }
}
