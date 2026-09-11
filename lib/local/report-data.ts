import { Prisma } from "@prisma/client";
import { prisma } from "../prisma";
import { objectiveLabels } from "./point-config";
import { previousPeriod, type Frequency } from "./report-period";

export type ReportMetrics = {
  visits:number;nfc:number;qr:number;direct:number;conversions:number;conversionRate:number;
  newSubscribers:number;whatsapp:number;vcf:number;
  clubVisits?:number;destinationRedirects?:number;objectives?:Array<{objective:string;label:string;visits:number}>;
  points:Array<{id:string;name:string;visits:number;conversions:number;whatsapp:number}>;
};
export type ReportSnapshot = {
  version:1;companyName:string;periodStart:string;periodEnd:string;frequency:Frequency;
  measurementSince:string;measurementIssues:number;partial:boolean;comparisonAvailable:boolean;
  current:ReportMetrics;previous:ReportMetrics;
};
async function metrics(tx:Prisma.TransactionClient,companyId:string,start:Date,end:Date):Promise<ReportMetrics> {
  const where={companyId,createdAt:{gte:start,lt:end}};
  const eventWhere={visit:{is:where},createdAt:{lt:end}};
  const [sources,points,conversions,newSubscribers,events,converted,clicks,objectives] = await Promise.all([
    tx.localVisit.groupBy({by:["source"],where,_count:{_all:true}}),
    tx.localVisit.groupBy({by:["touchpointId"],where,_count:{_all:true}}),
    tx.localVisit.count({where:{...where,objective:"CLUB",events:{some:{eventType:"SUBSCRIPTION",createdAt:{lt:end}}}}}),
    tx.localSubscriber.count({where:{campaign:{companyId},firstSubscribedAt:{gte:start,lt:end}}}),
    tx.localEvent.groupBy({by:["eventType"],where:eventWhere,_count:{_all:true}}),
    tx.localVisit.groupBy({by:["touchpointId"],where:{...where,objective:"CLUB",events:{some:{eventType:"SUBSCRIPTION",createdAt:{lt:end}}}},_count:{_all:true}}),
    tx.localEvent.groupBy({by:["touchpointId"],where:{...eventWhere,eventType:"WHATSAPP_REDIRECT"},_count:{_all:true}}),
    tx.localVisit.groupBy({by:["objective"],where,_count:{_all:true}})
  ]);
  const names=await tx.localTouchpoint.findMany({where:{id:{in:points.flatMap(p=>p.touchpointId?[p.touchpointId]:[])},campaign:{companyId}},select:{id:true,name:true}});
  const count=(source:string)=>sources.find(s=>s.source===source)?._count._all || 0;
  const event=(type:string)=>events.find(e=>e.eventType===type)?._count._all || 0;
  const visits=sources.reduce((n,s)=>n+s._count._all,0);
  const clubVisits=objectives.find(item=>item.objective==="CLUB")?._count._all || 0;
  return {visits,clubVisits,destinationRedirects:event("DESTINATION_REDIRECT"),
    objectives:objectives.map(item=>({objective:item.objective,label:objectiveLabels[item.objective],visits:item._count._all})),nfc:count("NFC"),qr:count("QR"),direct:count("DIRECT")+count("UNKNOWN"),
    conversions,conversionRate:clubVisits?100*conversions/clubVisits:0,newSubscribers,
    whatsapp:event("WHATSAPP_REDIRECT"),vcf:event("VCF_DOWNLOAD"),
    points:points.map(p=>({id:p.touchpointId||"direct",name:names.find(n=>n.id===p.touchpointId)?.name || "Sin punto",
      visits:p._count._all,conversions:converted.find(c=>c.touchpointId===p.touchpointId)?._count._all||0,
      whatsapp:clicks.find(c=>c.touchpointId===p.touchpointId)?._count._all||0})).sort((a,b)=>b.visits-a.visits)};
}
export async function generateReportSnapshot(companyId:string,start:Date,end:Date,frequency:Frequency):Promise<ReportSnapshot> {
  return prisma.$transaction(async tx=>{
    const company=await tx.company.findUniqueOrThrow({where:{id:companyId},select:{name:true}});
    const setting=await tx.localReportSetting.findUniqueOrThrow({where:{companyId}});
    const previousStart=previousPeriod(start,frequency);
    const [issues,priorIssues]=await Promise.all([
      tx.localTrackingIncident.count({where:{companyId,createdAt:{gte:start,lt:end}}}),
      tx.localTrackingIncident.count({where:{companyId,createdAt:{gte:previousStart,lt:start}}})
    ]);
    const [current,previous]=await Promise.all([metrics(tx,companyId,start,end),metrics(tx,companyId,previousStart,start)]);
    return {version:1,companyName:company.name,frequency,periodStart:start.toISOString(),periodEnd:end.toISOString(),
      measurementSince:setting.measurementSince.toISOString(),measurementIssues:issues,partial:start<setting.measurementSince,
      comparisonAvailable:previousStart>=setting.measurementSince && !issues && !priorIssues,current,previous};
  },{isolationLevel:Prisma.TransactionIsolationLevel.RepeatableRead,timeout:15000});
}
