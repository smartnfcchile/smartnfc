import { timingSafeEqual } from "node:crypto";
import { runReportWorker } from "../../../../lib/local/report-worker";
export const dynamic="force-dynamic";
export const maxDuration=60;
export async function GET(request:Request) {
  const secret=process.env.CRON_SECRET;
  const auth=request.headers.get("authorization") || "";
  const expected="Bearer "+secret;
  if (!secret || Buffer.byteLength(auth)!==Buffer.byteLength(expected) || !timingSafeEqual(Buffer.from(auth),Buffer.from(expected))) {
    return Response.json({error:"No autorizado."},{status:401});
  }
  try {return Response.json(await runReportWorker(),{headers:{"Cache-Control":"no-store"}});}
  catch {console.error("LOCAL_REPORT_WORKER_FAILED");return Response.json({error:"No se pudo completar el proceso."},{status:503});}
}
