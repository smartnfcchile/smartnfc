import { resolvePointAction } from "../../../../lib/local/point-resolver";
export const dynamic = "force-dynamic";
export async function GET(request: Request, { params }: { params: Promise<{ code: string }> }) {
  try { return await resolvePointAction((await params).code, new URL(request.url).searchParams); }
  catch { return new Response("No se pudo abrir la acción.", { status: 503, headers: { "Cache-Control": "no-store" } }); }
}
// Registro de clics en enlaces tel: mediante el atributo HTML `ping` (el navegador envía un POST y abre el teléfono).
export async function POST(request: Request, { params }: { params: Promise<{ code: string }> }) {
  try { return await resolvePointAction((await params).code, new URL(request.url).searchParams, { ping: true }); }
  catch { return new Response(null, { status: 503, headers: { "Cache-Control": "no-store" } }); }
}
