import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";

// This suite only runs against an explicitly approved disposable, loopback database.
const url=process.env.LOCAL_TEST_DATABASE_URL;
const allowed=url && ["127.0.0.1","localhost"].includes(new URL(url).hostname);
test("Reportes Local: aislamiento, atribución, consentimiento y entregas", {skip:!allowed},async t=>{
  process.env.DATABASE_URL=url!;
  process.env.NEXTAUTH_SECRET="local-test-secret-only";
  process.env.NEXT_PUBLIC_APP_URL="https://reports.example.test";
  process.env.EMAIL_FROM="SmartNFC Test <reports@example.test>";
  process.env.RESEND_API_KEY="test-placeholder-never-sent";
  process.env.LOCAL_REPORT_SUPPORT_EMAIL="support@example.test";
  process.env.LOCAL_REPORT_EMAIL_MODE="preview";
  let session:{user:{id:string;companyId:string;role:string}}|null=null;
  require("next-auth");
  require.cache[require.resolve("next-auth")]!.exports={getServerSession:async()=>session};
  const {prisma}=require("../../lib/prisma") as {prisma:PrismaClient};
  const {requireLocalAdmin}=require("../../lib/local/access");
  const {recordLocalArrival,recordLocalAction}=require("../../lib/local/tracking");
  const {subscribeLocal}=require("../../lib/local/subscription");
  const {signConsent}=require("../../lib/local/consent");
  const {generateReportSnapshot}=require("../../lib/local/report-data");
  const {enqueueDueReports,runReportWorker}=require("../../lib/local/report-worker");
  const {periodStart,nextPeriod,previousPeriod,reportDueAt}=require("../../lib/local/report-period");
  const {GET:qrGet}=require("../../app/q/[code]/route");
  const {GET:nfcGet}=require("../../app/t/[token]/route");
  const {POST:viewPost}=require("../../app/api/local/events/view/route");
  const {GET:exportGet}=require("../../app/api/local/broadcast-exports/[batchId]/route");
  const {GET:cronGet}=require("../../app/api/cron/local-reports/route");
  const {NextRequest}=require("next/server");
  const suffix=randomUUID().slice(0,8);
  const companies=[];
  const now=new Date(),start=periodStart(now,"WEEKLY"),end=nextPeriod(start,"WEEKLY"),due=reportDueAt(end);
  const headers=new Headers({"x-forwarded-for":"127.0.0.1","user-agent":"local-integration"});
  try {
    for (const label of ["A","B"]) {
      const company=await prisma.company.create({data:{name:"Local ficticio "+label+" "+suffix,slug:"test-"+label.toLowerCase()+"-"+suffix}});
      const owner=await prisma.user.create({data:{companyId:company.id,email:label+"-"+suffix+"@example.test",name:"Dueño "+label,role:"COMPANY_OWNER"}});
      const collaborator=await prisma.user.create({data:{companyId:company.id,email:"collab-"+label+"-"+suffix+"@example.test",role:"COLLABORATOR"}});
      const suspended=await prisma.user.create({data:{companyId:company.id,email:"suspended-"+label+"-"+suffix+"@example.test",role:"COMPANY_OWNER",status:"SUSPENDED",isActive:false}});
      await prisma.companyProductLicense.create({data:{companyId:company.id,product:"LOCAL",planCode:"LOCAL_PERSONALIZADO",includedCampaigns:5,includedTouchpoints:20}});
      const snapshot={businessName:company.name,clubName:"Club "+label,benefitTitle:"Oferta",benefitDescription:"Beneficio de prueba",
        whatsappNumber:"+56911112222",whatsappMessage:"Hola {nombre}",consentText:"Acepto recibir ofertas de este local.",consentVersion:1,primaryColor:"#2563eb",secondaryColor:"#d4af37"};
      const campaign=await prisma.localCampaign.create({data:{companyId:company.id,name:"Club "+label,slug:"club-"+label.toLowerCase()+"-"+suffix,
        status:"PUBLISHED",publishedSnapshot:snapshot,publishedVersion:1,consentText:"Borrador diferente",consentVersion:1}});
      const tp=await prisma.localTouchpoint.create({data:{campaignId:campaign.id,name:"Caja "+label,code:"point-"+label+"-"+suffix}});
      const physical=await prisma.physicalNfcCard.create({data:{companyId:company.id,token:"chip-"+label+"-"+suffix,localTouchpointId:tp.id,status:"ACTIVA"}});
      await prisma.localReportSetting.create({data:{companyId:company.id,enabled:true,frequency:"WEEKLY",recipientIds:[owner.id],nextPeriodStart:start,
        measurementSince:previousPeriod(previousPeriod(start,"WEEKLY"),"WEEKLY")}});
      companies.push({company,owner,collaborator,suspended,campaign,tp,physical,snapshot});
    }
    const [a,b]=companies;
    await t.test("Usuario revalidado y consulta explícita del tenant",async()=>{
      session={user:{id:a.owner.id,companyId:a.company.id,role:"COMPANY_OWNER"}};
      assert.equal((await requireLocalAdmin()).company.id,a.company.id);
      await assert.rejects(()=>requireLocalAdmin(b.company.id));
      session={user:{id:a.collaborator.id,companyId:a.company.id,role:"COMPANY_OWNER"}};
      await assert.rejects(()=>requireLocalAdmin());
      assert.equal((await exportGet(new NextRequest("https://example.test"),{params:Promise.resolve({batchId:"guess"})})).status,403);
      session={user:{id:a.suspended.id,companyId:a.company.id,role:"COMPANY_OWNER"}};
      await assert.rejects(()=>requireLocalAdmin());
      const superadmin=await prisma.user.create({data:{companyId:a.company.id,email:"super-"+suffix+"@example.test",role:"SUPERADMIN"}});
      session={user:{id:superadmin.id,companyId:a.company.id,role:"SUPERADMIN"}};
      assert.equal((await requireLocalAdmin(b.company.id)).company.id,b.company.id);
    });
    let qrVisit="",nfcVisit="";
    await t.test("QR y NFC: un acceso, sin duplicarlo al montar la landing",async()=>{
      const qr=await qrGet(new NextRequest("https://example.test/q/"+a.tp.code,{headers}),{params:Promise.resolve({code:a.tp.code})});
      assert.equal(qr.status,302);qrVisit=new URL(qr.headers.get("location")!).searchParams.get("v")!;
      const nfc=await nfcGet(new Request("https://example.test/t/"+a.physical.token,{headers}),{params:Promise.resolve({token:a.physical.token})});
      assert.equal(nfc.status,302);nfcVisit=new URL(nfc.headers.get("location")!).searchParams.get("v")!;
      assert.ok(qrVisit && nfcVisit);
      for (const visitId of [qrVisit,nfcVisit]) for(let i=0;i<2;i++) {
        const response=await viewPost(new NextRequest("https://example.test/api/local/events/view",{
          method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({slug:a.campaign.slug,touchpointCode:a.tp.code,visitId})}));
        assert.equal(response.status,200);
      }
      assert.equal(await prisma.localVisit.count({where:{companyId:a.company.id}}),2);
      assert.equal(await prisma.localEvent.count({where:{campaignId:a.campaign.id,eventType:"QR_SCAN"}}),1);
      assert.equal(await prisma.localEvent.count({where:{campaignId:a.campaign.id,eventType:"NFC_SCAN"}}),1);
      assert.equal(await prisma.localEvent.count({where:{campaignId:a.campaign.id,eventType:"VIEW"}}),2);
      await assert.rejects(()=>prisma.localVisit.create({data:{id:randomUUID(),companyId:b.company.id,campaignId:a.campaign.id,source:"DIRECT"}}));
    });
    await t.test("Consentimiento publicado e inscripción idempotente bajo concurrencia",async()=>{
      const consentToken=signConsent({campaignId:a.campaign.id,publishedVersion:1,consentVersion:1,consentText:a.snapshot.consentText});
      const payload={name:"Cliente Prueba",whatsapp:"911112222",consentAccepted:true,consentToken,visitId:qrVisit,touchpointCode:a.tp.code};
      const results=await Promise.all([subscribeLocal(a.campaign.slug,payload,headers),subscribeLocal(a.campaign.slug,payload,headers)]);
      assert.ok(results.every(r=>r.success));
      const sub=await prisma.localSubscriber.findFirstOrThrow({where:{campaignId:a.campaign.id}});
      const consent=await prisma.localConsentRecord.findFirstOrThrow({where:{subscriberId:sub.id}});
      assert.equal(consent.consentText,a.snapshot.consentText);
      assert.equal(await prisma.localSubscriber.count({where:{campaignId:a.campaign.id}}),1);
      assert.equal(await prisma.localEvent.count({where:{visitId:qrVisit,eventType:"SUBSCRIPTION"}}),1);
      const rejected=await subscribeLocal(b.campaign.slug,payload,headers);assert.equal(rejected.success,false);
      await prisma.localSubscriber.update({where:{id:sub.id},data:{status:"BLOCKED"}});
      assert.equal((await subscribeLocal(a.campaign.slug,{...payload,visitId:nfcVisit},headers)).success,true);
      assert.equal((await prisma.localSubscriber.findUniqueOrThrow({where:{id:sub.id}})).status,"BLOCKED");
      await prisma.localSubscriber.update({where:{id:sub.id},data:{status:"ACTIVE"}});
    });
    await t.test("Revocación pública de licencia y empresa bloquea el acceso",async()=>{
      await prisma.company.update({where:{id:b.company.id},data:{isActive:false}});
      assert.equal((await qrGet(new NextRequest("https://example.test/q/"+b.tp.code),{params:Promise.resolve({code:b.tp.code})})).status,403);
      await prisma.company.update({where:{id:b.company.id},data:{isActive:true}});
      await prisma.companyProductLicense.update({where:{companyId_product:{companyId:b.company.id,product:"LOCAL"}},data:{expiresAt:new Date(0)}});
      assert.equal((await qrGet(new NextRequest("https://example.test/q/"+b.tp.code),{params:Promise.resolve({code:b.tp.code})})).status,403);
      await prisma.companyProductLicense.update({where:{companyId_product:{companyId:b.company.id,product:"LOCAL"}},data:{expiresAt:null}});
    });
    await t.test("Los datos e informes no se mezclan entre locales",async()=>{
      await recordLocalAction(qrVisit,a.campaign.id,"WHATSAPP_REDIRECT");
      await recordLocalAction(qrVisit,a.campaign.id,"WHATSAPP_REDIRECT");
      const id=await recordLocalArrival({companyId:b.company.id,campaignId:b.campaign.id,touchpointId:b.tp.id,source:"QR",headers});
      assert.ok(id);
      const [ra,rb]=await Promise.all([generateReportSnapshot(a.company.id,start,end,"WEEKLY"),generateReportSnapshot(b.company.id,start,end,"WEEKLY")]);
      assert.equal(ra.current.visits,2);assert.equal(ra.current.conversionRate,50);assert.equal(ra.current.whatsapp,1);
      assert.equal(rb.current.visits,1);assert.equal(rb.current.newSubscribers,0);
      assert.ok(ra.current.points.every((p:{name:string})=>p.name==="Caja A"));
      assert.ok(rb.current.points.every((p:{name:string})=>p.name==="Caja B"));
    });
    await t.test("Cron protegido y sin envíos en modo de prueba",async()=>{
      process.env.CRON_SECRET="test-cron";
      assert.equal((await cronGet(new Request("https://example.test/api/cron/local-reports"))).status,401);
      await Promise.all([enqueueDueReports(due),enqueueDueReports(due)]);
      assert.equal(await prisma.localReport.count({where:{companyId:{in:[a.company.id,b.company.id]}}}),2);
      const fake=async()=>{throw new Error("No se debe enviar en preview");};
      await runReportWorker(due,fake);
      assert.equal(await prisma.localReportDelivery.count({where:{report:{companyId:{in:[a.company.id,b.company.id]}},status:"PREVIEW"}}),2);
    });
    await t.test("Reintentos conservan clave/payload y no duplican bajo concurrencia",async()=>{
      process.env.LOCAL_REPORT_EMAIL_MODE="live";
      const report=await prisma.localReport.findFirstOrThrow({where:{companyId:a.company.id}});
      const delivery=await prisma.localReportDelivery.findFirstOrThrow({where:{reportId:report.id,kind:"REPORT"}});
      await prisma.localReportDelivery.update({where:{id:delivery.id},data:{status:"PENDING",nextAttemptAt:due}});
      const keys:string[]=[];let attempts=0;
      const fake=async(payload:unknown,key:string)=>{keys.push(key);attempts++;if(attempts===1)throw new Error("transient");return {id:"test-provider-1"};};
      await runReportWorker(due,fake);
      const retry=new Date(due.getTime()+3600001);
      await Promise.all([runReportWorker(retry,fake),runReportWorker(retry,fake)]);
      const sent=await prisma.localReportDelivery.findUniqueOrThrow({where:{id:delivery.id}});
      assert.equal(sent.status,"SENT");assert.equal(attempts,2);assert.equal(new Set(keys).size,1);
      await runReportWorker(retry,fake);assert.equal(attempts,2);
    });
    await t.test("Resultado incierto fuera de ventana no reenvía; alerta persistente",async()=>{
      const report=await prisma.localReport.findFirstOrThrow({where:{companyId:b.company.id}});
      const delivery=await prisma.localReportDelivery.findFirstOrThrow({where:{reportId:report.id}});
      await prisma.localReportDelivery.update({where:{id:delivery.id},data:{status:"PENDING",firstAttemptAt:new Date(due.getTime()-24*3600000),nextAttemptAt:due}});
      let calls=0;const fake=async()=>{calls++;return {id:"alert-test"};};
      await runReportWorker(due,fake);
      assert.equal((await prisma.localReportDelivery.findUniqueOrThrow({where:{id:delivery.id}})).status,"UNKNOWN");
      assert.equal(calls,0);
      await runReportWorker(due,fake);
      assert.equal(await prisma.localReportDelivery.count({where:{reportId:report.id,kind:"ALERT"}}),1);
      assert.equal(calls,1);
    });
    await t.test("Incidencias de medición impiden interpretar ausencia de accesos como cero real",async()=>{
      await prisma.localTrackingIncident.create({data:{companyId:a.company.id,createdAt:now}});
      const snapshot=await generateReportSnapshot(a.company.id,start,end,"WEEKLY");
      assert.equal(snapshot.measurementIssues,1);
      assert.equal(snapshot.comparisonAvailable,false);
      const {renderReportEmail}=require("../../lib/local/report-email");
      const html=renderReportEmail({...snapshot,current:{...snapshot.current,visits:0}},"https://example.test/report");
      assert.match(html,/Actividad no concluyente/);
      assert.ok(!html.includes("No se registró actividad"));
    });
    await t.test("Destinatario revocado cancela el envío sin invocar al proveedor",async()=>{
      const report=await prisma.localReport.findFirstOrThrow({where:{companyId:a.company.id}});
      const delivery=await prisma.localReportDelivery.findFirstOrThrow({where:{reportId:report.id,kind:"REPORT"}});
      await prisma.localReportDelivery.update({where:{id:delivery.id},data:{status:"PENDING",nextAttemptAt:due}});
      await prisma.localReportSetting.update({where:{companyId:a.company.id},data:{recipientIds:[]}});
      let calls=0;
      await runReportWorker(due,async()=>{calls++;return {id:"must-not-send"};});
      assert.equal(calls,0);
      assert.equal((await prisma.localReportDelivery.findUniqueOrThrow({where:{id:delivery.id}})).status,"CANCELLED");
    });
    await t.test("Generación agotada queda fallida y genera una sola alerta sin correo vacío",async()=>{
      const report=await prisma.localReport.create({data:{companyId:a.company.id,frequency:"MONTHLY",periodStart:start,periodEnd:end,
        attempts:3,nextAttemptAt:due,deliveries:{create:{recipientId:a.owner.id,recipient:a.owner.email}}}});
      const sent:string[]=[];
      await runReportWorker(due,async(payload:{subject:string})=>{sent.push(payload.subject);return {id:"failure-alert"};});
      assert.equal((await prisma.localReport.findUniqueOrThrow({where:{id:report.id}})).status,"FAILED");
      assert.equal(sent.length,1);assert.match(sent[0],/requiere atención/);
      await runReportWorker(due,async()=>{throw new Error("No debe repetir alerta");});
      assert.equal(await prisma.localReportDelivery.count({where:{reportId:report.id,kind:"ALERT"}}),1);
    });
    await t.test("Reglas Empresas conservadas",async()=>{
      await assert.rejects(()=>prisma.user.update({where:{id:a.owner.id},data:{companyId:b.company.id}}));
      await assert.rejects(()=>prisma.physicalNfcCard.update({where:{id:a.physical.id},data:{companyId:b.company.id}}));
      assert.equal((await prisma.company.findUniqueOrThrow({where:{id:a.company.id}})).maxIdentities,5);
    });
  } finally {
    // Only rows with this run's random company IDs are removed from the disposable DB.
    const ids=companies.map(x=>x.company.id);
    await prisma.localReportDelivery.deleteMany({where:{report:{companyId:{in:ids}}}});
    await prisma.localTrackingIncident.deleteMany({where:{companyId:{in:ids}}});
    await prisma.localReport.deleteMany({where:{companyId:{in:ids}}});
    await prisma.localEvent.deleteMany({where:{campaign:{companyId:{in:ids}}}});
    await prisma.localVisit.deleteMany({where:{companyId:{in:ids}}});
    await prisma.localConsentRecord.deleteMany({where:{campaign:{companyId:{in:ids}}}});
    await prisma.localSubscriber.deleteMany({where:{campaign:{companyId:{in:ids}}}});
    await prisma.physicalNfcCard.deleteMany({where:{companyId:{in:ids}}});
    await prisma.localTouchpoint.deleteMany({where:{campaign:{companyId:{in:ids}}}});
    await prisma.localCampaign.deleteMany({where:{companyId:{in:ids}}});
    await prisma.localReportSetting.deleteMany({where:{companyId:{in:ids}}});
    await prisma.user.deleteMany({where:{companyId:{in:ids}}});
    await prisma.companyProductLicense.deleteMany({where:{companyId:{in:ids}}});
    await prisma.company.deleteMany({where:{id:{in:ids}}});
    await prisma.$disconnect();
  }
});
