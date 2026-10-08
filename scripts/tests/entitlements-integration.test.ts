import "./helpers/test-database";
import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
const url=process.env.BLOCK2_TEST_DATABASE_URL;
const allowed=!!url && ["127.0.0.1","localhost"].includes(new URL(url).hostname) && new URL(url).pathname.includes("block2_disposable");
test("Block 2: real PostgreSQL authorization, retention and concurrency",{skip:!allowed},async t=>{
  process.env.DATABASE_URL=url!;
  let session: { user: { id: string; companyId: string; role: string } } | null=null;
  require("next-auth");require.cache[require.resolve("next-auth")]!.exports={getServerSession:async()=>session};
  require("next/cache");require.cache[require.resolve("next/cache")]!.exports={revalidatePath:()=>{}};
  const {prisma:db}=require("../../lib/prisma") as {prisma:PrismaClient};
  const {getCompanyEntitlements,getCurrentCompanyEntitlements,hasCardProfileRight}=require("../../lib/entitlements");
  const {saveLocalPoint}=require("../../lib/local/point-management");
  const {saveLocation,moveCampaignLocation}=require("../../lib/local/locations");
  const {createVirtualCard,toggleCardActive}=require("../../app/dashboard/cards/actions");
  const {resolveLocalPoint}=require("../../lib/local/point-resolver");
  const {addLink}=require("../../app/dashboard/editor/[cardId]/actions");
  const {updateLeadCRM}=require("../../app/dashboard/leads/actions");
  const {createEntitlementOverride,revokeEntitlementOverride}=require("../../lib/entitlements/overrides");
  const suffix=randomUUID().slice(0,8);
  const a=await db.company.create({data:{name:"Block2 A "+suffix}}),b=await db.company.create({data:{name:"Block2 B "+suffix}});
  const owner=await db.user.create({data:{companyId:a.id,email:suffix+"@example.test",role:"COMPANY_OWNER"}});
  const other=await db.user.create({data:{companyId:b.id,email:"b"+suffix+"@example.test",role:"COMPANY_OWNER"}});
  session={user:{id:owner.id,companyId:a.id,role:owner.role}};
  const empresas=await db.companyProductLicense.create({data:{companyId:a.id,product:"EMPRESAS",planCode:"EMPRESAS_TEAM_5"}});
  const local=await db.companyProductLicense.create({data:{companyId:a.id,product:"LOCAL",planCode:"LOCAL_PRO"}});
  const foreign=await db.card.create({data:{companyId:b.id,userId:other.id,name:"Foreign",slug:"foreign-"+suffix}});
  try {
    await t.test("Identity creation serializes at 5; reactivation cannot exceed capacity",async()=>{
      const results=await Promise.allSettled(Array.from({length:7},(_,i)=>createVirtualCard("Person "+i,"person-"+suffix+"-"+i,owner.id)));
      assert.equal(results.filter(r=>r.status==="fulfilled").length,5);assert.equal(await db.card.count({where:{companyId:a.id,isActive:true}}),5);
      // H-1: creating an identity is not itself a profile right; it relies on the active license.
      assert.equal(await db.cardProfileRight.count({where:{companyId:a.id}}),0);
      const inactive=await db.card.create({data:{companyId:a.id,userId:owner.id,name:"Inactive",slug:"inactive-"+suffix,isActive:false}});
      await assert.rejects(()=>toggleCardActive(inactive.id,true));
      const active=await db.card.findFirstOrThrow({where:{companyId:a.id,isActive:true}});
      await toggleCardActive(active.id,false);
      const reactivations=await Promise.allSettled([toggleCardActive(active.id,true),toggleCardActive(inactive.id,true)]);
      assert.equal(reactivations.filter(r=>r.status==="fulfilled").length,1);
      assert.equal(await db.card.count({where:{companyId:a.id,isActive:true}}),5);
    });
    const card=await db.card.findFirstOrThrow({where:{companyId:a.id,isActive:true}});
    const lead=await db.lead.create({data:{companyId:a.id,cardId:card.id,name:"Historical lead"}});
    await db.event.create({data:{cardId:card.id,eventType:"VIEW"}});
    await t.test("H-1: PURCHASE preserves profile, lead and events across an Empresas suspension; reactivation restores CRM",async()=>{
      await db.companyProductLicense.update({where:{id:empresas.id},data:{planCode:"EMPRESAS_PRO",status:"ACTIVE"}});
      await updateLeadCRM(lead.id,"CONTACTADO","Before suspension");
      // This identity was created via Teams (no automatic right, per H-1); a confirmed sale is what
      // must make its profile survive the Empresas suspension below — not merely having been created.
      await db.cardProfileRight.create({data:{cardId:card.id,companyId:a.id,origin:"PURCHASE",reason:"Test: confirmed sale"}});
      await db.companyProductLicense.update({where:{id:empresas.id},data:{status:"SUSPENDED"}});
      assert.equal(await hasCardProfileRight(card.id,a.id),true);
      const linkForm=new FormData();linkForm.set("cardId",card.id);linkForm.set("title","Base link");linkForm.set("url","https://example.test/profile");await addLink(linkForm);
      assert.equal(await db.cardLink.count({where:{cardId:card.id}}),1);
      await db.card.update({where:{id:card.id},data:{primaryActionType:"CRM_FORM",secondaryActionType:"SAVE_CONTACT",shareContactEnabled:true}});
      const {updateCard}=require("../../app/dashboard/editor/[cardId]/actions");
      const edit=new FormData();
      for(const [key,value] of Object.entries({cardId:card.id,profileName:"Base edited",role:"Role",companyName:"Company",bio:"Bio",themeColor:"#000000",themeMode:"light",primaryActionType:"NONE",secondaryActionType:"CRM_FORM"}))edit.set(key,value);
      const edited=await updateCard(edit);assert.equal(edited.success,true,edited.error);
      const retained=await db.card.findUniqueOrThrow({where:{id:card.id}});
      assert.equal(retained.primaryActionType,"CRM_FORM");assert.equal(retained.secondaryActionType,"SAVE_CONTACT");assert.equal(retained.shareContactEnabled,true);
      await assert.rejects(()=>updateLeadCRM(lead.id,"GANADO",null));
      const {GET:metrics}=require("../../app/api/metrics/details/route");
      const {GET:exportLeads}=require("../../app/api/leads/export/route");
      const {NextRequest}=require("next/server");
      assert.equal((await metrics(new Request("https://example.test/api/metrics/details?type=view"))).status,403);
      assert.equal((await exportLeads(new NextRequest("https://example.test/api/leads/export"))).status,403);
      assert.equal(await db.lead.count({where:{id:lead.id}}),1);assert.equal(await db.event.count({where:{cardId:card.id}}),1);
      await db.companyProductLicense.update({where:{id:empresas.id},data:{status:"ACTIVE"}});
      await updateLeadCRM(lead.id,"GANADO","Restored");
    });
    await t.test("Tenant scope and database composite foreign keys reject cross-company access",async()=>{
      await assert.rejects(()=>getCurrentCompanyEntitlements(b.id));assert.equal(await hasCardProfileRight(foreign.id,a.id),false);
      await assert.rejects(()=>db.cardProfileRight.create({data:{cardId:foreign.id,companyId:a.id,origin:"PURCHASE",reason:"invalid tenant"}}));
    });
    let locationId="";
    await t.test("Concurrent Local creation respects MAX_LOCATIONS",async()=>{
      const results=await Promise.allSettled([saveLocation({name:"Location One"}),saveLocation({name:"Location Two"})]);
      assert.equal(results.filter(r=>r.status==="fulfilled").length,1);
      locationId=(await db.localLocation.findFirstOrThrow({where:{companyId:a.id}})).id;
    });
    const campaign=await db.localCampaign.create({data:{companyId:a.id,locationId,name:"Points",slug:"points-"+suffix}});
    const config={name:"Point",location:"Counter",objective:"WHATSAPP",medium:"NFC_QR",isActive:true,destinationUrl:"https://wa.me/56911112222",smartLinks:[]};
    await t.test("Concurrent points stop at ten ACTIVE per location; inactive points do not consume slots",async()=>{
      const results=await Promise.allSettled(Array.from({length:12},()=>saveLocalPoint(config,undefined,undefined,campaign.id)));
      assert.equal(results.filter(r=>r.status==="fulfilled").length,10);
      const inactive=await saveLocalPoint({...config,isActive:false},undefined,undefined,campaign.id);
      await assert.rejects(()=>saveLocalPoint(config,inactive,1));
      assert.equal(await db.localTouchpoint.count({where:{campaignId:campaign.id,isActive:true}}),10);
      const point=await db.localTouchpoint.findFirstOrThrow({where:{campaignId:campaign.id,isActive:true}});
      await saveLocalPoint({...config,isActive:false},point.id,1);
      await saveLocalPoint(config,inactive,1);
      assert.equal(await db.localTouchpoint.count({where:{campaignId:campaign.id,isActive:true}}),10);
    });
    await t.test("Local suspension returns neutral public state, preserves codes and resumes",async()=>{
      const point=await db.localTouchpoint.findFirstOrThrow({where:{campaignId:campaign.id,isActive:true}});
      const before=await db.localTouchpoint.count({where:{campaignId:campaign.id}});
      await db.companyProductLicense.update({where:{id:local.id},data:{status:"CANCELLED"}});
      assert.equal((await getCompanyEntitlements(a.id)).localOperational,false);
      const response=await resolveLocalPoint(point.code,"QR",new Headers());assert.equal(response.status,403);assert.match(await response.text(),/Punto Inteligente temporalmente inactivo/);
      await assert.rejects(()=>saveLocation({name:"Blocked"}));
      assert.equal(await db.localTouchpoint.count({where:{campaignId:campaign.id}}),before);
      await db.companyProductLicense.update({where:{id:local.id},data:{status:"ACTIVE"}});
      assert.equal((await resolveLocalPoint(point.code,"QR",new Headers())).status,302);
      await db.localCampaign.update({where:{id:campaign.id},data:{status:"PUBLISHED",publishedSnapshot:{}}});
      await db.localLocation.update({where:{id:locationId},data:{isActive:false}});
      const {GET:contact}=require("../../app/club/[slug]/[filename]/route");
      const responseContact=await contact(new Request("https://example.test/club/"+campaign.slug+"/contacto.vcf"),{params:Promise.resolve({slug:campaign.slug,filename:"contacto.vcf"})});
      assert.equal(responseContact.status,403);assert.equal(responseContact.headers.get("Cache-Control"),"no-store");
      await db.localLocation.update({where:{id:locationId},data:{isActive:true}});
    });
    await t.test("Pack locations have independent active point capacity; moving campaigns cannot overfill",async()=>{
      await db.companyProductLicense.update({where:{id:local.id},data:{planCode:"LOCAL_PACK_3"}});
      const second=await saveLocation({name:"Second location"});
      const secondCampaign=await db.localCampaign.create({data:{companyId:a.id,locationId:second,name:"Second campaign",slug:"second-"+suffix}});
      for(let i=0;i<10;i++)await saveLocalPoint(config,undefined,undefined,secondCampaign.id);
      assert.equal(await db.localTouchpoint.count({where:{isActive:true,campaign:{companyId:a.id}}}),20);
      await assert.rejects(()=>moveCampaignLocation(campaign.id,second));
      assert.equal((await db.localCampaign.findUniqueOrThrow({where:{id:campaign.id}})).locationId,locationId);
    });
    await t.test("Campaign creation stores location and serializes its initial active point",async()=>{
      const {createLocalCampaignAction}=require("../../app/dashboard/local/actions");
      const third=await saveLocation({name:"Third location"});
      const results=await Promise.allSettled(Array.from({length:12},(_,i)=>createLocalCampaignAction({name:"Campaign "+i,slug:"campaign-"+suffix+"-"+i,locationId:third})));
      assert.equal(results.filter(r=>r.status==="fulfilled").length,10,results.filter(r=>r.status==="rejected").map(r=>String(r.reason)).join("; "));
      assert.equal(await db.localCampaign.count({where:{companyId:a.id,locationId:third}}),10);
      assert.equal(await db.localTouchpoint.count({where:{isActive:true,campaign:{companyId:a.id,locationId:third}}}),10);
      assert.equal(await db.localCampaign.count({where:{companyId:a.id,locationId:null}}),0);
    });
    await t.test("Cross-tenant campaigns and locations are rejected",async()=>{
      const foreignLocation=await db.localLocation.create({data:{companyId:b.id,key:"foreign",name:"Other"}});
      await assert.rejects(()=>db.localCampaign.create({data:{companyId:a.id,locationId:foreignLocation.id,name:"Invalid",slug:"invalid-"+suffix}}));
      await assert.rejects(()=>saveLocation({id:foreignLocation.id,name:"Attack"}));
      const foreignCampaign=await db.localCampaign.create({data:{companyId:b.id,locationId:foreignLocation.id,name:"Other",slug:"other-"+suffix}});
      await assert.rejects(()=>saveLocalPoint(config,undefined,undefined,foreignCampaign.id));
    });
    await t.test("Override author, audit and revocation; non-superadmin rejected",async()=>{
      const data={companyId:a.id,kind:"CAPABILITY",key:"ANALYTICS",value:false,reason:"Test restriction",startsAt:new Date()};
      await assert.rejects(()=>createEntitlementOverride(data));
      await db.user.update({where:{id:owner.id},data:{role:"SUPERADMIN"}});
      const id=await createEntitlementOverride(data);
      assert.ok(!(await getCompanyEntitlements(a.id)).capabilities.includes("ANALYTICS"));
      await revokeEntitlementOverride(a.id,"CAPABILITY",id,"End test");
      assert.ok((await getCompanyEntitlements(a.id)).capabilities.includes("ANALYTICS"));
      assert.equal(await db.adminAuditLog.count({where:{entityId:id}}),2);
      await db.company.update({where:{id:a.id},data:{maxIdentities:17}});
      await db.companyProductLicense.update({where:{id:empresas.id},data:{planCode:"EMPRESAS_HISTORICO",includedIdentities:null}});
      const {updateCompanyAction}=require("../../app/superadmin/actions");
      const result=await updateCompanyAction(a.id,{name:a.name,isActive:true,empresasLicense:{planCode:"EMPRESAS_HISTORICO",status:"ACTIVE",includedIdentities:5,authorizedExtraIdentities:0}});
      assert.equal(result.success,true,result.error);
      assert.equal((await db.companyProductLicense.findUniqueOrThrow({where:{id:empresas.id}})).includedIdentities,null);
      assert.equal((await getCompanyEntitlements(a.id)).limits.MAX_IDENTITIES,17);
    });
  } finally { await db.$disconnect(); }
});
