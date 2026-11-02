import { selectDisposableDatabase } from "./helpers/test-database";
import test from "node:test";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import { readInstallation, writeInstallation } from "../../lib/geolocation/service";
// Fail closed, not skipped: this suite must never count as passed without PostgreSQL.
selectDisposableDatabase(process.env.GEOLOCATION_TEST_DATABASE_URL, { requireNameIncludes: "geolocation_disposable" });
const db = new PrismaClient();
test("PostgreSQL: legacy compatibility, CRUD, tenants, roles, constraints and shared NFC/QR installation", async () => {
  const company = await db.company.create({data:{name:"Geo disposable A"}});
  const other = await db.company.create({data:{name:"Geo disposable B"}});
  const actor = { id:"test-actor", companyId:company.id, role:"COMPANY_ADMIN" };
  const campaign = await db.localCampaign.create({data:{companyId:company.id,name:"Geo test",slug:`geo-${company.id}`}});
  const point = await db.localTouchpoint.create({data:{campaignId:campaign.id,name:"Installation",code:`geo-${company.id}`,objective:"WHATSAPP",destinationUrl:"https://example.com/original"}});
  const physical = await db.physicalNfcCard.create({data:{companyId:company.id,token:`geo-${company.id}`,localTouchpointId:point.id}});
  const standalone = await db.physicalNfcCard.create({data:{companyId:company.id,token:`geo-standalone-${company.id}`}});
  try {
    assert.deepEqual(await readInstallation(db,actor,"local",point.id),{status:"PENDING"});
    await writeInstallation(db,actor,"local",point.id,{latitude:-39.82,longitude:-73.24,label:"Entrada"});
    const stored = await readInstallation(db,actor,"physical",physical.id);
    assert.equal(stored.status,"CONFIGURED");
    await writeInstallation(db,actor,"physical",physical.id,{latitude:90,longitude:180,method:"MAP"});
    const updated = await readInstallation(db,actor,"local",point.id);
    assert.ok(updated.status === "CONFIGURED" && updated.latitude === 90 && updated.longitude === 180);
    for (const kind of ["local","physical"] as const) {
      const id = kind === "local" ? point.id : physical.id;
      await assert.rejects(readInstallation(db,{...actor,companyId:other.id},kind,id),/no disponible/);
      await assert.rejects(writeInstallation(db,{...actor,companyId:other.id},kind,id,{latitude:0,longitude:0}),/no disponible/);
      await assert.rejects(writeInstallation(db,{...actor,role:"COLLABORATOR"},kind,id,null),/Permisos/);
    }
    await assert.rejects(writeInstallation(db,actor,"local",point.id,{latitude:0,longitude:0,visibility:"PUBLIC"}));
    await assert.rejects(db.pointGeolocation.create({data:{latitude:0,longitude:0,updatedById:actor.id}}));
    await assert.rejects(db.pointGeolocation.create({data:{physicalNfcCardId:standalone.id,latitude:91,longitude:0,updatedById:actor.id}}));
    await writeInstallation(db,actor,"physical",standalone.id,{latitude:0,longitude:0});
    await writeInstallation(db,actor,"physical",standalone.id,null);
    await writeInstallation(db,actor,"local",point.id,null);
    assert.deepEqual(await readInstallation(db,actor,"local",point.id),{status:"PENDING"});
    const legacy = await db.localTouchpoint.findUniqueOrThrow({where:{id:point.id}});
    assert.equal(legacy.code,point.code); assert.equal(legacy.destinationUrl,point.destinationUrl); assert.equal(legacy.configurationVersion,point.configurationVersion);
    const audit = await db.adminAuditLog.findMany({where:{companyId:company.id}});
    assert.equal(audit.length,5); assert.ok(audit.every(a => !a.metadata));
  } finally {
    await db.adminAuditLog.deleteMany({where:{companyId:company.id}});
    await db.physicalNfcCard.deleteMany({where:{companyId:company.id}});
    await db.localTouchpoint.delete({where:{id:point.id}});
    await db.localCampaign.delete({where:{id:campaign.id}});
    await db.company.deleteMany({where:{id:{in:[company.id,other.id]}}});
    await db.$disconnect();
  }
});
