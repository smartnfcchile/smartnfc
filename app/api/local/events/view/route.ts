import { NextRequest, NextResponse } from "next/server";
import { getPublicLocalCampaign } from "../../../../../lib/local/access";
import { recordTrackingIncident, recordLocalArrival, recordLocalAction, findLocalVisit, visitIdValid } from "../../../../../lib/local/tracking";
import { prisma } from "../../../../../lib/prisma";

export async function POST(request: NextRequest) {
  let companyId:string|null=null;
  try {
    const body = await request.json();
    if (typeof body.slug !== "string" || typeof body.visitId !== "string" || !visitIdValid(body.visitId)) {
      return NextResponse.json({error:"Datos inválidos."},{status:400});
    }
    const campaign=await getPublicLocalCampaign(body.slug);
    if (!campaign) return NextResponse.json({error:"Campaña no disponible."},{status:404});
    companyId=campaign.companyId;
    const eventType=body.eventType || "VIEW";
    if (eventType !== "VIEW" && eventType !== "WHATSAPP_REDIRECT") return NextResponse.json({error:"Evento inválido."},{status:400});
    let visit=await findLocalVisit(body.visitId,campaign.id);
    if (!visit && eventType==="VIEW") {
      const tp=typeof body.touchpointCode==="string" ? await prisma.localTouchpoint.findFirst({
        where:{code:body.touchpointCode,campaignId:campaign.id,isActive:true}
      }) : null;
      // ref is attribution only. Source NFC/QR is assigned by the server resolver.
      await recordLocalArrival({id:body.visitId,companyId:campaign.companyId,campaignId:campaign.id,
        touchpointId:tp?.id,source:"DIRECT",headers:request.headers});
      visit=await findLocalVisit(body.visitId,campaign.id);
    }
    if (!visit) return NextResponse.json({error:"Visita no disponible."},{status:400});
    await recordLocalAction(visit.id,campaign.id,eventType);
    return NextResponse.json({success:true,visitId:visit.id},{headers:{"Cache-Control":"no-store"}});
  } catch {
    // The client can still use the club, but failures must not look like zero traffic.
    if (companyId) await recordTrackingIncident(companyId);
    return NextResponse.json({error:"No se pudo registrar la actividad."},{status:503});
  }
}
