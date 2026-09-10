import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "../prisma";
import { isLicenseValid } from "../product-access";
import { generateReportSnapshot, type ReportSnapshot } from "./report-data";
import { renderReportEmail, type MailPayload } from "./report-email";
import { nextPeriod, previousPeriod, periodStart, reportDueAt } from "./report-period";
import { deliveryMode, validateReportTransport, sendReportMail, type ReportTransport } from "./report-transport";

const hour=3600000;
const json=(value:unknown)=>JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
export function retryAt(attempts:number,now:Date) { return new Date(now.getTime()+Math.min(4,attempts)*hour); }
export function canRetryDelivery(first:Date|null,now:Date) { return !first || now.getTime()-first.getTime()<23*hour; }
export async function enqueueDueReports(now:Date,deadline=Infinity) {
  const cutoff=(frequency:"WEEKLY"|"MONTHLY")=>{
    const end=periodStart(now,frequency);
    return previousPeriod(reportDueAt(end)>now?previousPeriod(end,frequency):end,frequency);
  };
  const settings=await prisma.localReportSetting.findMany({
    where:{enabled:true,OR:[{frequency:"WEEKLY",nextPeriodStart:{lte:cutoff("WEEKLY")}},{frequency:"MONTHLY",nextPeriodStart:{lte:cutoff("MONTHLY")}}]},orderBy:{nextPeriodStart:"asc"},take:100,
    include:{company:{include:{productLicenses:{where:{product:"LOCAL"}}}}}
  });
  for (const setting of settings) {
    if (Date.now()>deadline) break;
    if (!setting.company.isActive || !isLicenseValid(setting.company.productLicenses[0]??null)) continue;
    const end=nextPeriod(setting.nextPeriodStart!,setting.frequency);
    if (reportDueAt(end)>now) continue;
    await prisma.$transaction(async tx=>{
      await tx.$queryRaw`SELECT "companyId" FROM "LocalReportSetting" WHERE "companyId"=${setting.companyId} FOR UPDATE`;
      const current=await tx.localReportSetting.findUniqueOrThrow({where:{companyId:setting.companyId}});
      if (!current.enabled || current.frequency!==setting.frequency || current.nextPeriodStart?.getTime()!==setting.nextPeriodStart?.getTime()) return;
      const recipients=await tx.user.findMany({where:{
        id:{in:current.recipientIds},companyId:current.companyId,isActive:true,status:"ACTIVE",
        role:{in:["COMPANY_OWNER","COMPANY_ADMIN"]}
      },select:{id:true,email:true}});
      const report=await tx.localReport.upsert({
        where:{companyId_frequency_periodStart:{companyId:current.companyId,frequency:current.frequency,periodStart:current.nextPeriodStart!}},
        create:{companyId:current.companyId,frequency:current.frequency,periodStart:current.nextPeriodStart!,periodEnd:end,
          deliveries:{create:recipients.map(r=>({recipientId:r.id,recipient:r.email}))}}, update:{}
      });
      if (!recipients.length) await tx.localReport.update({where:{id:report.id},data:{status:"FAILED",lastError:"No hay destinatarios autorizados."}});
      await tx.localReportSetting.update({where:{companyId:current.companyId},data:{nextPeriodStart:end}});
    });
  }
}
async function enqueueAlert(reportId:string,companyId:string) {
  const recipient=process.env.LOCAL_REPORT_SUPPORT_EMAIL;
  if (!recipient) return;
  await prisma.localReportDelivery.upsert({
    where:{reportId_recipientId_kind:{reportId,recipientId:"support",kind:"ALERT"}},
    create:{reportId,recipientId:"support",recipient,kind:"ALERT",
      payload:json({from:process.env.EMAIL_FROM || "preview@smartnfc.invalid",to:recipient,
        subject:"SmartNFC Local: un informe requiere atención",
        html:`<p>No se pudo completar un informe automático.</p><p><a href="${process.env.NEXT_PUBLIC_APP_URL}/superadmin/locales/${encodeURIComponent(companyId)}/reportes">Revisar el local</a></p>`})},update:{}
  });
}
export async function runReportWorker(now=new Date(),transport:ReportTransport=sendReportMail) {
  const mode=deliveryMode();
  if (mode==="disabled") return {mode,generated:0,processed:0};
  validateReportTransport();
  const deadline=Date.now()+40000;
  await enqueueDueReports(now,deadline);
  let generated=0,processed=0;
  const reports=await prisma.localReport.findMany({
    where:{status:"PENDING",nextAttemptAt:{lte:now},OR:[{lockedUntil:null},{lockedUntil:{lt:now}}]},
    orderBy:{nextAttemptAt:"asc"},take:5
  });
  for (const report of reports) {
    if(Date.now()>deadline) break;
    if (report.attempts>=3) {
      await prisma.localReport.updateMany({where:{id:report.id,status:"PENDING",OR:[{lockedUntil:null},{lockedUntil:{lt:now}}]},
        data:{status:"FAILED",lockedUntil:null,lockToken:null,lastError:"Se agotaron los intentos de generación."}});
      continue;
    }
    const token=randomUUID();
    const claim=await prisma.localReport.updateMany({where:{id:report.id,status:"PENDING",
      OR:[{lockedUntil:null},{lockedUntil:{lt:now}}]},data:{lockToken:token,lockedUntil:new Date(now.getTime()+5*60000),attempts:{increment:1}}});
    if (!claim.count) continue;
    try {
      const snapshot=await generateReportSnapshot(report.companyId,report.periodStart,report.periodEnd,report.frequency);
      await prisma.localReport.updateMany({where:{id:report.id,lockToken:token},data:{
        snapshot:json(snapshot),status:"READY",generatedAt:now,lockedUntil:null,lockToken:null,lastError:null}});
      generated++;
    } catch {
      const failed=report.attempts+1>=3;
      await prisma.localReport.updateMany({where:{id:report.id,lockToken:token},data:{
        status:failed?"FAILED":"PENDING",nextAttemptAt:retryAt(report.attempts+1,now),lockedUntil:null,lockToken:null,
        lastError:"No se pudo calcular el informe. No se sustituyeron datos por ceros."}});
    }
  }
  await prisma.localReportDelivery.updateMany({where:{kind:"REPORT",status:"PENDING",report:{status:"FAILED"}},
    data:{status:"CANCELLED",lastError:"No se pudo generar el informe; se requiere revisar la incidencia."}});
  const failures=await prisma.localReport.findMany({where:{AND:[{OR:[{status:"FAILED"},{deliveries:{some:{kind:"REPORT",status:{in:["FAILED","UNKNOWN"]}}}}]},{deliveries:{none:{kind:"ALERT"}}}]},take:50});
  for (const failure of failures) await enqueueAlert(failure.id,failure.companyId);
  const deliveries=await prisma.localReportDelivery.findMany({
    where:{status:"PENDING",nextAttemptAt:{lte:now},OR:[{lockedUntil:null},{lockedUntil:{lt:now}}],
      AND:[{OR:[{kind:"REPORT",report:{status:"READY"}},{kind:"ALERT"}]}]},
    include:{report:{include:{company:{include:{productLicenses:{where:{product:"LOCAL"}},localReportSetting:true}}}}},
    orderBy:{nextAttemptAt:"asc"},take:10
  });
  for (const delivery of deliveries) {
    if(Date.now()>deadline) break;
    if (delivery.kind==="REPORT" && delivery.report.status!=="READY") continue;
    const token=randomUUID();
    const claim=await prisma.localReportDelivery.updateMany({where:{id:delivery.id,status:"PENDING",
      OR:[{lockedUntil:null},{lockedUntil:{lt:now}}]},data:{lockToken:token,lockedUntil:new Date(now.getTime()+5*60000)}});
    if (!claim.count) continue;
    const update=async(data:Prisma.LocalReportDeliveryUpdateManyMutationInput)=>prisma.localReportDelivery.updateMany({
      where:{id:delivery.id,lockToken:token},data:{...data,lockToken:null,lockedUntil:null}
    });
    const company=delivery.report.company;
    if (delivery.kind==="REPORT") {
      const recipient=await prisma.user.findFirst({where:{id:delivery.recipientId,email:delivery.recipient,companyId:company.id,
        isActive:true,status:"ACTIVE",role:{in:["COMPANY_OWNER","COMPANY_ADMIN"]}}});
      if (!recipient || !company.isActive || !isLicenseValid(company.productLicenses[0]??null) ||
          !company.localReportSetting?.enabled || !company.localReportSetting.recipientIds.includes(delivery.recipientId)) {
        await update({status:"CANCELLED",lastError:"El destinatario o el local ya no está autorizado."});continue;
      }
    }
    // Resend retains idempotency keys for 24h. Never blindly retry an uncertain send beyond that window.
    if (!canRetryDelivery(delivery.firstAttemptAt,now)) {
      await update({status:"UNKNOWN",lastError:"Requiere conciliación con el proveedor antes de reenviar."});continue;
    }
    let payload=delivery.payload as MailPayload|null;
    if (!payload) {
      const snapshot=delivery.report.snapshot as unknown as ReportSnapshot;
      payload={from:process.env.EMAIL_FROM || "preview@smartnfc.invalid",to:delivery.recipient,
        subject:"Tu informe SmartNFC Local · "+snapshot.companyName,
        html:renderReportEmail(snapshot,(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000")+"/dashboard/local/reportes/"+delivery.reportId)};
      await prisma.localReportDelivery.updateMany({where:{id:delivery.id,lockToken:token},data:{payload:json(payload)}});
    }
    if (mode==="preview") {await update({status:"PREVIEW",lastError:null});processed++;continue;}
    await prisma.localReportDelivery.updateMany({where:{id:delivery.id,lockToken:token},
      data:{firstAttemptAt:delivery.firstAttemptAt || now,attempts:{increment:1}}});
    try {
      const result=await transport(payload,"local-report/"+delivery.id);
      await update({status:"SENT",providerId:result.id,acceptedAt:now,lastError:null});
      processed++;
    } catch {
      await update({status:delivery.attempts+1>=3?"FAILED":"PENDING",
        nextAttemptAt:retryAt(delivery.attempts+1,now),lastError:"El proveedor no confirmó la aceptación."});
    }
  }
  return {mode,generated,processed};
}
