import { Prisma } from "@prisma/client";
import { prisma } from "../prisma";
import { hashIp } from "../security";
import { checkRateLimit } from "../rateLimit";
import { publicSubscriptionSchema } from "../validations/local";
import { getPublicLocalCampaign } from "./access";
import { verifyConsent } from "./consent";
import { findLocalVisit } from "./tracking";

export async function subscribeLocal(slug: string, payload: unknown, requestHeaders: Headers) {
  const parsed = publicSubscriptionSchema.safeParse(payload);
  if (!parsed.success) return { success:false, error:parsed.error.issues[0]?.message || "Datos inválidos." };
  const data=parsed.data;
  const campaign=await getPublicLocalCampaign(slug);
  if (!campaign) return {success:false,error:"El club no está disponible."};
  const snap=campaign.publishedSnapshot as Prisma.JsonObject;
  const consent={ campaignId:campaign.id,publishedVersion:campaign.publishedVersion,
    consentVersion:Number(snap.consentVersion),consentText:String(snap.consentText || "") };
  if (!consent.consentText || !verifyConsent(consent,data.consentToken)) {
    return {success:false,error:"El consentimiento cambió. Actualiza la página antes de registrarte."};
  }
  const ip=requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
  if (!(await checkRateLimit(ip,"LOCAL_SUBSCRIBE",campaign.id)).allowed) return {success:false,error:"Demasiados intentos. Inténtalo más tarde."};
  const candidateVisit=await findLocalVisit(data.visitId,campaign.id);
  const visit=candidateVisit?.objective==="CLUB"?candidateVisit:null;
  let touchpointId=visit?.touchpointId || null;
  if (!touchpointId && data.touchpointCode) {
    const tp=await prisma.localTouchpoint.findFirst({where:{code:data.touchpointCode,campaignId:campaign.id,isActive:true}});
    touchpointId=tp?.id || null;
  }
  const cleanNumber=String(snap.whatsappNumber || "").replace(/[^\d]/g,"");
  const message=String(snap.whatsappMessage || "").replace(/{nombre}|{name}/gi,data.name);
  const whatsappLink="https://wa.me/"+cleanNumber+"?text="+encodeURIComponent(message);
  await prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"local-sub:"+campaign.id+":"+data.whatsapp}))`;
    await tx.$queryRaw`SELECT id FROM "LocalCampaign" WHERE id=${campaign.id} FOR SHARE`;
    const current=await tx.localCampaign.findUniqueOrThrow({where:{id:campaign.id}});
    if (current.publishedVersion!==campaign.publishedVersion || current.status!=="PUBLISHED") throw new Error("La campaña cambió. Actualiza la página.");
    await tx.$queryRaw`SELECT id FROM "LocalSubscriber" WHERE "campaignId"=${campaign.id} AND whatsapp=${data.whatsapp} FOR UPDATE`;
    const existing=await tx.localSubscriber.findUnique({where:{campaignId_whatsapp:{campaignId:campaign.id,whatsapp:data.whatsapp}}});
    if (existing?.status==="BLOCKED") return;
    if (visit && await tx.localEvent.findUnique({where:{visitId_eventType:{visitId:visit.id,eventType:"SUBSCRIPTION"}}})) return;
    const subscriber=await tx.localSubscriber.upsert({
      where:{campaignId_whatsapp:{campaignId:campaign.id,whatsapp:data.whatsapp}},
      create:{campaignId:campaign.id,name:data.name.trim(),whatsapp:data.whatsapp},
      update:{name:data.name.trim(),status:"ACTIVE",lastInteractionAt:new Date(),
        ...(existing?.status==="OPTED_OUT"?{lastSubscribedAt:new Date()}:{})}
    });
    const latest=await tx.localConsentRecord.findFirst({where:{subscriberId:subscriber.id,revokedAt:null},orderBy:{acceptedAt:"desc"}});
    if (!latest || existing?.status==="OPTED_OUT" || latest.consentText!==consent.consentText || latest.consentVersion!==consent.consentVersion) {
      await tx.localConsentRecord.create({data:{
        subscriberId:subscriber.id,campaignId:campaign.id,consentText:consent.consentText,consentVersion:consent.consentVersion,
        ipHash:hashIp(ip),userAgent:requestHeaders.get("user-agent")?.slice(0,255),
        source:visit?.source || "DIRECT", metadata:{publishedVersion:consent.publishedVersion}
      }});
    }
    await tx.localEvent.create({data:{
      campaignId:campaign.id,touchpointId,subscriberId:subscriber.id,visitId:visit?.id,
      eventType:"SUBSCRIPTION",ipHash:hashIp(ip),userAgent:requestHeaders.get("user-agent")?.slice(0,255)
    }});
  });
  return {success:true,whatsappLink};
}
