import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";
const base=process.env.BLOCK2_TEST_DATABASE_URL;
const allowed=!!base && ["localhost","127.0.0.1"].includes(new URL(base).hostname) && new URL(base).pathname.includes("block2_disposable");
test("H-1: additive migration preserves historical rows and migration files, without granting any automatic CardProfileRight",{skip:!allowed},async()=>{
  const suffix=randomUUID().replaceAll("-","").slice(0,12),name="block2_disposable_"+suffix;
  const uri=new URL(base!);uri.pathname="/"+name;
  const admin=new PrismaClient({datasources:{db:{url:base!}}});
  await admin.$executeRawUnsafe(`CREATE DATABASE "${name}"`);await admin.$disconnect();
  const dir=path.resolve("node_modules/.block2-backfill-"+suffix);fs.mkdirSync(dir,{recursive:true});
  fs.copyFileSync("prisma/schema.prisma",path.join(dir,"schema.prisma"));fs.mkdirSync(path.join(dir,"migrations"));
  const current="20260917010000_commercial_catalog_entitlements";
  // H-6: whether these historical migration files were modified is no longer this test's concern —
  // that real, Git-anchored protection now lives in migration-history-protection.test.ts against
  // prisma/migrations/.history-manifest.json. This test keeps its own job: proving Block 2 applies
  // correctly, from empty, through every real historical migration file.
  const historical=fs.readdirSync("prisma/migrations").filter(n=>n!==current);
  for(const item of historical)fs.cpSync(`prisma/migrations/${item}`,path.join(dir,"migrations",item),{recursive:true});
  const deploy=()=>{
    const r=spawnSync(process.execPath,["node_modules/prisma/build/index.js","migrate","deploy","--schema",path.join(dir,"schema.prisma")],{env:{...process.env,DATABASE_URL:uri.toString()},encoding:"utf8"});
    assert.equal(r.status,0,"Isolated migration failed: "+r.stderr);
  };
  deploy();
  const db=new PrismaClient({datasources:{db:{url:uri.toString()}}});
  try {
    await db.$executeRawUnsafe(`INSERT INTO "Company" (id,name,"updatedAt") VALUES ('legacy','Historical tenant',NOW())`);
    await db.$executeRawUnsafe(`INSERT INTO "User" (id,email,"companyId","updatedAt") VALUES ('owner','owner@backfill.example.test','legacy',NOW())`);
    await db.$executeRawUnsafe(`INSERT INTO "Card" (id,slug,name,"userId","companyId","updatedAt") VALUES ('profile','preserved-profile','Existing profile','owner','legacy',NOW())`);
    await db.$executeRawUnsafe(`INSERT INTO "CompanyProductLicense" (id,"companyId",product,"planCode",status,"includedIdentities","updatedAt") VALUES ('license','legacy','EMPRESAS','EMPRESAS_HISTORICO','SUSPENDED',15,NOW())`);
    await db.$executeRawUnsafe(`INSERT INTO "LocalCampaign" (id,slug,name,"companyId","updatedAt") VALUES ('campaign','existing-campaign','Existing campaign','legacy',NOW())`);
    await db.$executeRawUnsafe(`INSERT INTO "LocalTouchpoint" (id,code,name,"campaignId","updatedAt") VALUES ('point','stable-public-code','Existing point','campaign',NOW())`);
    await db.$executeRawUnsafe(`INSERT INTO "Lead" (id,name,"companyId","cardId") VALUES ('lead','Historical lead','legacy','profile')`);
    await db.$executeRawUnsafe(`INSERT INTO "Event" (id,"eventType","cardId") VALUES ('event','VIEW','profile')`);
    await db.$executeRawUnsafe(`INSERT INTO "LocalSubscriber" (id,"campaignId",name,whatsapp,"updatedAt") VALUES ('subscriber','campaign','Subscriber','+56911112222',NOW())`);
    await db.$executeRawUnsafe(`INSERT INTO "LocalConsentRecord" (id,"campaignId","subscriberId","consentVersion","consentText") VALUES ('consent','campaign','subscriber',1,'Historical consent')`);
    const before=await db.$queryRawUnsafe<Array<Record<string,unknown>>>(`SELECT * FROM "CompanyProductLicense"`);
    fs.cpSync(`prisma/migrations/${current}`,path.join(dir,"migrations",current),{recursive:true});deploy();
    // H-1: no CardProfileRight is granted automatically. Origin (INTERNAL/PILOT/PURCHASE) is always
    // an explicit, later, auditable Superadmin decision — see docs/BLOCK_2_ENTITLEMENTS.md.
    assert.equal(await db.cardProfileRight.count(),0);
    const campaign=await db.localCampaign.findUniqueOrThrow({where:{id:"campaign"},include:{localLocation:true,touchpoints:true}});
    assert.equal(campaign.localLocation?.name,null);assert.equal(campaign.localLocation?.origin,"LEGACY_TECHNICAL");assert.equal(campaign.localLocation?.id,"legacy_location_legacy");assert.equal(campaign.touchpoints[0].code,"stable-public-code");
    assert.equal(await db.lead.count(),1);assert.equal(await db.event.count(),1);assert.equal(await db.localSubscriber.count(),1);assert.equal(await db.localConsentRecord.count(),1);
    const after=await db.companyProductLicense.findUniqueOrThrow({where:{id:"license"}});
    for(const [key,value] of Object.entries(before[0]))assert.deepEqual(after[key as keyof typeof after],value,key);
    const physical=await db.physicalNfcCard.create({data:{companyId:"legacy",cardId:"profile",token:"replaceable-support"}});await db.physicalNfcCard.delete({where:{id:physical.id}});
    assert.equal(await db.cardProfileRight.count(),0);
    deploy();assert.equal(await db.localLocation.count(),1);assert.equal(await db.cardProfileRight.count(),0);
  } finally {await db.$disconnect();}
});
