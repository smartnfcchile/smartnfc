import "./helpers/test-database";
import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
// Requires a disposable PostgreSQL (see entitlements-integration.test.ts); skipped otherwise.
const url=process.env.BLOCK2_TEST_DATABASE_URL;
const allowed=!!url && ["127.0.0.1","localhost"].includes(new URL(url).hostname) && new URL(url).pathname.includes("block2_disposable");
test("H-2/H-3: restrictive actions survive Teams expiry, expansion does not, and the stored edit policy is preserved",{skip:!allowed},async t=>{
  process.env.DATABASE_URL=url!;
  let session: { user: { id: string; companyId: string; role: string } } | null=null;
  require("next-auth");require.cache[require.resolve("next-auth")]!.exports={getServerSession:async()=>session};
  require("next/cache");require.cache[require.resolve("next/cache")]!.exports={revalidatePath:()=>{}};
  // No test may send email.
  const mailPath=require.resolve("../../lib/email/send-email");require(mailPath);
  require.cache[mailPath]!.exports={sendEmail:async()=>({success:true})};
  const {prisma:db}=require("../../lib/prisma") as {prisma:PrismaClient};
  const {toggleCardActive,createVirtualCard}=require("../../app/dashboard/cards/actions");
  const {suspendCollaboratorUser,resendInvitationFromDashboardAction,createCollaboratorWithCard,deleteVendorUser}=require("../../app/dashboard/users/actions");
  const {updateCard}=require("../../app/dashboard/editor/[cardId]/actions");
  const {updateProfileEditPolicyAction}=require("../../app/dashboard/configuracion/perfiles/actions");
  const {getEffectiveProfileEditPolicy}=require("../../lib/profile-edit-policy");
  const suffix=randomUUID().slice(0,8);
  type User={id:string;companyId:string;role:string};
  const as=(u:User)=>{session={user:{id:u.id,companyId:u.companyId,role:u.role}};};
  const mkCompany=async(label:string,planCode?:"EMPRESAS_TEAM_10")=>{
    const company=await db.company.create({data:{name:`${label} ${suffix}`}});
    const license=planCode?await db.companyProductLicense.create({data:{companyId:company.id,product:"EMPRESAS",planCode}}):null;
    return {company,license};
  };
  const mkUser=(companyId:string,role:"COMPANY_ADMIN"|"COMPANY_OWNER"|"COLLABORATOR",tag:string)=>
    db.user.create({data:{companyId,role,email:`${tag}-${suffix}@example.test`}});
  const mkCard=async(companyId:string,userId:string,tag:string,isActive=true)=>{
    const card=await db.card.create({data:{companyId,userId,name:tag,slug:`${tag}-${suffix}`,isActive,companyName:"Original Co"}});
    await db.cardProfileRight.create({data:{cardId:card.id,companyId,origin:"PURCHASE",reason:"Fixture"}});
    return card;
  };
  const setLicense=(id:string,data:{status?:"ACTIVE"|"EXPIRED"|"SUSPENDED"|"CANCELLED";planCode?:"EMPRESAS_CONECTA"|"EMPRESAS_TEAM_10"})=>db.companyProductLicense.update({where:{id},data});
  const active=async(id:string)=>(await db.card.findUniqueOrThrow({where:{id}})).isActive;

  // Company A: Teams 10. Company B: foreign tenant with its own Teams license.
  const {company:a,license:licA}=await mkCompany("Offboarding A","EMPRESAS_TEAM_10");
  const {company:b}=await mkCompany("Offboarding B","EMPRESAS_TEAM_10");
  const admin=await mkUser(a.id,"COMPANY_ADMIN","admin"),owner2=await mkUser(a.id,"COMPANY_OWNER","owner2");
  const c1=await mkUser(a.id,"COLLABORATOR","c1"),c2=await mkUser(a.id,"COLLABORATOR","c2"),c3=await mkUser(a.id,"COLLABORATOR","c3");
  const adminCard=await mkCard(a.id,admin.id,"admin-card"),ownerCard=await mkCard(a.id,owner2.id,"owner-card");
  const card1=await mkCard(a.id,c1.id,"card1"),card2=await mkCard(a.id,c2.id,"card2"),card3=await mkCard(a.id,c3.id,"card3");
  await db.physicalNfcCard.create({data:{companyId:a.id,cardId:card3.id,token:"tok3-"+suffix}});
  await db.physicalNfcCard.create({data:{companyId:a.id,cardId:card2.id,token:"tok2-"+suffix}});
  const adminB=await mkUser(b.id,"COMPANY_ADMIN","adminb"),collabB=await mkUser(b.id,"COLLABORATOR","collabb");
  const cardB=await mkCard(b.id,collabB.id,"card-b");
  let pendingUserId="";

  await t.test("Teams active keeps the current behaviour (create, deactivate, reactivate, suspend, resend)",async()=>{
    as(admin);
    await toggleCardActive(adminCard.id,false);await toggleCardActive(adminCard.id,true);
    await toggleCardActive(card1.id,false);assert.equal(await active(card1.id),false);
    await toggleCardActive(card1.id,true);assert.equal(await active(card1.id),true);
    const created=await createCollaboratorWithCard("Pending Person",`pending-${suffix}@example.test`);
    pendingUserId=created.userId;assert.equal((await db.user.findUniqueOrThrow({where:{id:pendingUserId}})).status,"PENDING");
    assert.equal((await resendInvitationFromDashboardAction(pendingUserId)).success,true);
    assert.equal(await db.userActivationToken.count({where:{userId:pendingUserId,usedAt:null,expiresAt:{gt:new Date()}}}),1);
    await suspendCollaboratorUser(c3.id);
    assert.equal((await db.user.findUniqueOrThrow({where:{id:c3.id}})).status,"SUSPENDED");
    assert.equal(await active(card3.id),false);
    assert.equal((await db.physicalNfcCard.findFirstOrThrow({where:{cardId:card3.id}})).status,"SUSPENDIDA");
    assert.equal(await db.adminAuditLog.count({where:{action:"COLLABORATOR_SUSPENDED",entityId:c3.id}}),1);
  });

  await t.test("Teams active: foreign tenant IDs and non-administrators are rejected",async()=>{
    as(admin);
    await assert.rejects(()=>toggleCardActive(cardB.id,false),/No tienes permisos/);
    await assert.rejects(()=>suspendCollaboratorUser(collabB.id),/otra empresa/);
    as(c1);
    await assert.rejects(()=>toggleCardActive(card1.id,false),/administradores/);
    await assert.rejects(()=>suspendCollaboratorUser(c2.id),/administradores/);
    await assert.rejects(()=>deleteVendorUser(c2.id),/administradores/);
    assert.equal(await active(card1.id),true);assert.equal((await db.user.findUniqueOrThrow({where:{id:c2.id}})).status,"ACTIVE");
  });

  await t.test("Teams expired: offboarding still works, expansion and onboarding are rejected",async()=>{
    await setLicense(licA!.id,{status:"EXPIRED"});
    as(admin);
    const tokensBefore=await db.userActivationToken.count({where:{userId:pendingUserId}});
    const usersBefore=await db.user.count({where:{companyId:a.id}}),cardsBefore=await db.card.count({where:{companyId:a.id}});
    // Deactivating another administrator's identity is a restrictive action.
    await toggleCardActive(ownerCard.id,false);assert.equal(await active(ownerCard.id),false);
    // Deactivating a collaborator's identity, and reactivation is expansion.
    await toggleCardActive(card1.id,false);assert.equal(await active(card1.id),false);
    await assert.rejects(()=>toggleCardActive(card1.id,true),/plan Teams activo/);assert.equal(await active(card1.id),false);
    await assert.rejects(()=>toggleCardActive(ownerCard.id,true),/plan Teams activo/);
    // Expansion and onboarding stay premium.
    await assert.rejects(()=>createVirtualCard("New identity","new-identity-"+suffix,c1.id),/Capacidad no disponible/);
    await assert.rejects(()=>createCollaboratorWithCard("Blocked",`blocked-${suffix}@example.test`),/Capacidad no disponible/);
    await assert.rejects(()=>resendInvitationFromDashboardAction(pendingUserId),/Capacidad no disponible/);
    assert.equal(await db.userActivationToken.count({where:{userId:pendingUserId}}),tokensBefore);
    assert.equal(await db.user.count({where:{companyId:a.id}}),usersBefore);assert.equal(await db.card.count({where:{companyId:a.id}}),cardsBefore);
    // Offboarding a collaborator.
    await suspendCollaboratorUser(c2.id);
    assert.equal((await db.user.findUniqueOrThrow({where:{id:c2.id}})).status,"SUSPENDED");
    assert.equal(await active(card2.id),false);assert.equal((await db.physicalNfcCard.findFirstOrThrow({where:{cardId:card2.id}})).status,"SUSPENDIDA");
    assert.equal(await db.card.count({where:{id:card2.id}}),1,"history is preserved");
    assert.equal(await db.adminAuditLog.count({where:{action:"COLLABORATOR_SUSPENDED",entityId:c2.id}}),1);
  });

  await t.test("Restricted mode: an administrator cannot deactivate their own identity, but can still reduce others",async()=>{
    as(admin);
    await assert.rejects(()=>toggleCardActive(adminCard.id,false),/propia identidad/);
    assert.equal(await active(adminCard.id),true);
    await assert.rejects(()=>suspendCollaboratorUser(admin.id),/propia cuenta/);
    // The other administrator (owner) is "another identity of the same tenant".
    as(owner2);
    await assert.rejects(()=>toggleCardActive(ownerCard.id,false),/propia identidad|plan Teams/);
    await toggleCardActive(adminCard.id,false);assert.equal(await active(adminCard.id),false);
    await assert.rejects(()=>toggleCardActive(adminCard.id,true),/plan Teams activo/);
    // Reactivating Teams restores the ability to reactivate.
    await setLicense(licA!.id,{status:"ACTIVE"});
    await toggleCardActive(adminCard.id,true);assert.equal(await active(adminCard.id),true);
    await toggleCardActive(card1.id,true);assert.equal(await active(card1.id),true);
    // With Teams active the administrator may deactivate their own identity again (it can be reactivated).
    as(admin);await toggleCardActive(adminCard.id,false);await toggleCardActive(adminCard.id,true);
  });

  await t.test("Teams expired: foreign tenant IDs and collaborators still get nothing",async()=>{
    await setLicense(licA!.id,{status:"EXPIRED"});
    as(admin);
    await assert.rejects(()=>toggleCardActive(cardB.id,false),/No tienes permisos/);
    await assert.rejects(()=>toggleCardActive(cardB.id,true),/No tienes permisos|plan Teams/);
    await assert.rejects(()=>suspendCollaboratorUser(collabB.id),/otra empresa/);
    await assert.rejects(()=>resendInvitationFromDashboardAction(collabB.id),/Capacidad no disponible|otra empresa/);
    assert.equal(await active(cardB.id),true);assert.equal((await db.user.findUniqueOrThrow({where:{id:collabB.id}})).status,"ACTIVE");
    as(c1);
    await assert.rejects(()=>toggleCardActive(card1.id,false),/administradores/);
    await assert.rejects(()=>suspendCollaboratorUser(c2.id),/administradores|Solo/);
    assert.equal(await active(card1.id),true);
    // Company B's administrator cannot touch company A either.
    as(adminB);
    await assert.rejects(()=>toggleCardActive(card1.id,false),/No tienes permisos/);
    await assert.rejects(()=>suspendCollaboratorUser(c1.id),/otra empresa/);
    assert.equal(await active(card1.id),true);
  });

  await t.test("Security suspension (Company.isActive=false) still blocks restrictive actions",async()=>{
    for(const plan of ["ACTIVE","EXPIRED"] as const){
      await setLicense(licA!.id,{status:plan});
      await db.company.update({where:{id:a.id},data:{isActive:false}});
      try{
        as(admin);
        await assert.rejects(()=>toggleCardActive(card1.id,false),/No autorizado/);
        await assert.rejects(()=>suspendCollaboratorUser(c1.id),/No autorizado/);
        assert.equal(await active(card1.id),true);assert.equal((await db.user.findUniqueOrThrow({where:{id:c1.id}})).status,"ACTIVE");
      } finally {await db.company.update({where:{id:a.id},data:{isActive:true}});}
    }
  });

  await t.test("An override that disables TEAM_MANAGEMENT never blocks restrictive actions; legacy inactive plans behave the same",async()=>{
    await setLicense(licA!.id,{status:"ACTIVE"});
    const override=await db.companyCapabilityOverride.create({data:{companyId:a.id,capability:"TEAM_MANAGEMENT",enabled:false,reason:"Restriction",authorUserId:admin.id,startsAt:new Date(Date.now()-60_000)}});
    as(admin);
    await toggleCardActive(card1.id,false);assert.equal(await active(card1.id),false);
    await assert.rejects(()=>toggleCardActive(card1.id,true),/plan Teams activo/);
    await db.companyCapabilityOverride.update({where:{id:override.id},data:{revokedAt:new Date()}});
    await toggleCardActive(card1.id,true);assert.equal(await active(card1.id),true);
    // Legacy plan, no longer active.
    await setLicense(licA!.id,{planCode:"EMPRESAS_CONECTA",status:"CANCELLED"});
    await toggleCardActive(card1.id,false);assert.equal(await active(card1.id),false);
    await assert.rejects(()=>toggleCardActive(card1.id,true),/plan Teams activo/);
    await setLicense(licA!.id,{planCode:"EMPRESAS_TEAM_10",status:"ACTIVE"});
    await toggleCardActive(card1.id,true);
  });

  // ---- H-3: stored edit policy vs effective policy
  const {company:c,license:licC}=await mkCompany("Policy C","EMPRESAS_TEAM_10");
  const {company:d}=await mkCompany("Policy D","EMPRESAS_TEAM_10");
  const adminC=await mkUser(c.id,"COMPANY_ADMIN","adminc"),collabC=await mkUser(c.id,"COLLABORATOR","collabc"),collabD=await mkUser(d.id,"COLLABORATOR","collabd");
  const cardC=await mkCard(c.id,collabC.id,"card-c");
  const form=(cardId:string,extra:Record<string,string>={})=>{
    const f=new FormData();
    for(const [k,v] of Object.entries({cardId,profileName:"Edited "+randomUUID().slice(0,4),role:"Role",companyName:"Original Co",bio:"Bio",themeColor:"#000000",themeMode:"light",primaryActionType:"NONE",secondaryActionType:"NONE",...extra}))f.set(k,v);
    return f;
  };
  const stored=async()=>(await db.company.findUniqueOrThrow({where:{id:c.id}})).profileEditPolicy;
  const setPolicy=(policy:string)=>db.company.update({where:{id:c.id},data:{profileEditPolicy:policy}});

  await t.test("ADMIN_ONLY: enforced with Teams, ignored (FLEXIBLE) without it, stored value untouched, restored on reactivation",async()=>{
    await setPolicy("ADMIN_ONLY");
    as(collabC);
    assert.equal(await getEffectiveProfileEditPolicy(c.id),"ADMIN_ONLY");
    const denied=await updateCard(form(cardC.id));assert.equal(denied.success,false);assert.match(denied.error,/exclusivamente por sus administradores/);
    await setLicense(licC!.id,{status:"EXPIRED"});
    assert.equal(await getEffectiveProfileEditPolicy(c.id),"FLEXIBLE");
    const edit=form(cardC.id,{profileName:"Edited without Teams"});
    const ok=await updateCard(edit);assert.equal(ok.success,true,ok.error);
    assert.equal((await db.card.findUniqueOrThrow({where:{id:cardC.id}})).profileName,"Edited without Teams");
    assert.equal(await stored(),"ADMIN_ONLY","the stored policy is never overwritten");
    // The administrator keeps FULL access in every state.
    as(adminC);assert.equal((await updateCard(form(cardC.id,{profileName:"Admin edit"}))).success,true);
    // Reactivation restores the stored policy automatically.
    await setLicense(licC!.id,{status:"ACTIVE"});
    assert.equal(await getEffectiveProfileEditPolicy(c.id),"ADMIN_ONLY");
    as(collabC);const again=await updateCard(form(cardC.id));assert.equal(again.success,false);assert.match(again.error,/exclusivamente por sus administradores/);
    assert.equal(await stored(),"ADMIN_ONLY");
  });

  await t.test("CORPORATE: identity fields protected with Teams, editable as FLEXIBLE without it, restored afterwards",async()=>{
    await setPolicy("CORPORATE");as(collabC);
    assert.equal(await getEffectiveProfileEditPolicy(c.id),"CORPORATE");
    const protectedEdit=await updateCard(form(cardC.id,{companyName:"Hijacked Brand",profileName:"Personal only"}));
    assert.equal(protectedEdit.success,true,protectedEdit.error);
    let row=await db.card.findUniqueOrThrow({where:{id:cardC.id}});assert.equal(row.companyName,"Original Co");assert.equal(row.profileName,"Personal only");
    await setLicense(licC!.id,{status:"EXPIRED"});
    assert.equal(await getEffectiveProfileEditPolicy(c.id),"FLEXIBLE");
    const flexible=await updateCard(form(cardC.id,{companyName:"Own Brand"}));assert.equal(flexible.success,true,flexible.error);
    row=await db.card.findUniqueOrThrow({where:{id:cardC.id}});assert.equal(row.companyName,"Own Brand");
    assert.equal(await stored(),"CORPORATE");
    await setLicense(licC!.id,{status:"ACTIVE"});
    assert.equal(await getEffectiveProfileEditPolicy(c.id),"CORPORATE");
    const reprotected=await updateCard(form(cardC.id,{companyName:"Again Hijacked"}));assert.equal(reprotected.success,true,reprotected.error);
    assert.equal((await db.card.findUniqueOrThrow({where:{id:cardC.id}})).companyName,"Own Brand","the restored policy protects the identity again (no rollback of earlier edits)");
  });

  await t.test("updateProfileEditPolicyAction stays blocked without PROFILE_EDIT_POLICY and never rewrites the policy",async()=>{
    await setPolicy("ADMIN_ONLY");
    await setLicense(licC!.id,{status:"EXPIRED"});as(adminC);
    await assert.rejects(()=>updateProfileEditPolicyAction("FLEXIBLE"),/Capacidad no disponible/);
    assert.equal(await stored(),"ADMIN_ONLY");
    await setLicense(licC!.id,{status:"ACTIVE"});
    assert.equal((await updateProfileEditPolicyAction("CORPORATE")).success,true);assert.equal(await stored(),"CORPORATE");
    // A collaborator can never change it.
    as(collabC);await assert.rejects(()=>updateProfileEditPolicyAction("FLEXIBLE"),/administradores/);
    assert.equal(await stored(),"CORPORATE");
  });

  await t.test("Edit policy: multi-tenant isolation and security suspension remain intact",async()=>{
    await setPolicy("FLEXIBLE");
    as(collabD);
    const nameBefore=(await db.card.findUniqueOrThrow({where:{id:cardC.id}})).profileName;
    const foreign=await updateCard(form(cardC.id,{profileName:"Foreign edit"}));assert.equal(foreign.success,false);
    assert.equal((await db.card.findUniqueOrThrow({where:{id:cardC.id}})).profileName,nameBefore);
    // Company D's lapsed Teams state never affects company C's effective policy.
    await db.companyProductLicense.updateMany({where:{companyId:d.id},data:{status:"EXPIRED"}});
    await db.company.update({where:{id:d.id},data:{profileEditPolicy:"ADMIN_ONLY"}});
    await setPolicy("ADMIN_ONLY");
    assert.equal(await getEffectiveProfileEditPolicy(c.id),"ADMIN_ONLY");
    assert.equal(await getEffectiveProfileEditPolicy(d.id),"FLEXIBLE");
    // FLEXIBLE fallback never overrides a security suspension.
    await setLicense(licC!.id,{status:"EXPIRED"});await db.company.update({where:{id:c.id},data:{isActive:false}});
    try{as(collabC);const suspended=await updateCard(form(cardC.id));assert.equal(suspended.success,false);assert.match(suspended.error,/No autorizado/);}
    finally{await db.company.update({where:{id:c.id},data:{isActive:true}});}
    // A card without a permanent right nor active license still has no editor.
    await db.cardProfileRight.delete({where:{cardId:cardC.id}});
    as(collabC);const noRight=await updateCard(form(cardC.id));assert.equal(noRight.success,false);assert.match(noRight.error,/Perfil no disponible/);
  });

  await db.$disconnect();
});
