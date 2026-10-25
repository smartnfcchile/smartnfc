import { selectDisposableDatabase } from "../tests/helpers/test-database";
import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
selectDisposableDatabase(process.env.GEOLOCATION_TEST_DATABASE_URL, {requireNameIncludes:"geolocation_disposable"});
const db = new PrismaClient();
let companyId: string; let userId: string; let physicalId: string; let foreignId: string; let otherCompanyId: string;
let campaignId: string; let pointId: string; let pointCode: string;
test.beforeAll(async () => {
  const company = await db.company.create({data:{name:"Geo E2E",plan:"BUSINESS"}}); companyId=company.id;
  const other = await db.company.create({data:{name:"Other E2E"}}); otherCompanyId=other.id;
  const user = await db.user.create({data:{companyId,name:"Geo Test",email:`${companyId}@example.invalid`,password:await bcrypt.hash("Disposable-test-42",10),role:"COMPANY_ADMIN"}}); userId=user.id;
  physicalId=(await db.physicalNfcCard.create({data:{companyId,token:`e2e-${companyId}`}})).id;
  foreignId=(await db.physicalNfcCard.create({data:{companyId:otherCompanyId,token:`e2e-${otherCompanyId}`}})).id;
  await db.companyProductLicense.create({data:{companyId,product:"LOCAL",planCode:"LOCAL_IMPULSA",status:"ACTIVE"}});
  const location=await db.localLocation.create({data:{companyId,key:"test",name:"E2E"}});
  campaignId=(await db.localCampaign.create({data:{companyId,locationId:location.id,name:"E2E",slug:`e2e-${companyId}`}})).id;
  pointCode=`e2e-${companyId}`;
  pointId=(await db.localTouchpoint.create({data:{campaignId,name:"Punto E2E",code:pointCode,location:"Entrada",objective:"WHATSAPP",destinationUrl:"https://wa.me/56912345678",medium:"NFC_QR"}})).id;
});
test.afterAll(async () => {
  await db.adminAuditLog.deleteMany({where:{companyId}});
  await db.localEvent.deleteMany({where:{campaignId}});
  await db.localActionClick.deleteMany({where:{companyId}});
  await db.localVisit.deleteMany({where:{companyId}});
  await db.localTouchpoint.deleteMany({where:{campaignId}});
  await db.localCampaign.deleteMany({where:{companyId}});
  await db.localLocation.deleteMany({where:{companyId}});
  await db.companyProductLicense.deleteMany({where:{companyId}});
  await db.localReportSetting.deleteMany({where:{companyId}});
  await db.physicalNfcCard.deleteMany({where:{companyId:{in:[companyId,otherCompanyId]}}});
  await db.user.delete({where:{id:userId}});
  await db.company.deleteMany({where:{id:{in:[companyId,otherCompanyId]}}}); await db.$disconnect();
});
test("admin CRUD, map selection, reload persistence, tenant security and NFC/QR regression", async ({page,request}) => {
  const anonymous=await request.get(`/api/point-locations/physical/${physicalId}`); expect(anonymous.status()).toBe(401);
  await page.goto("/login");
  await page.locator('input[type=email]').fill(`${companyId}@example.invalid`);
  await page.locator('input[type=password]').fill("Disposable-test-42");
  await page.getByRole("button",{name:"Entrar al Sistema"}).click();
  await page.waitForURL("**/dashboard");
  for (const [kind,id,url] of [["physical",physicalId,`/dashboard/cards/installations/${physicalId}`],["local",pointId,`/dashboard/local/puntos/${pointId}`]]) {
    await page.goto(url);
    await expect(page.getByText("Sin ubicación configurada",{exact:true})).toBeVisible();
    const section=page.getByRole("region",{name:"Ubicación de instalación"});
    await expect(section.getByRole("button",{name:"Guardar ubicación"})).toBeEnabled();
    await page.locator('.leaflet-container').click({position:{x:100,y:100}});
    await expect(section.getByRole("spinbutton",{name:"Latitud",exact:true})).not.toHaveValue("");
    await section.getByRole("button",{name:"Guardar ubicación"}).click();
    await expect(page.getByText("Ubicación guardada.",{exact:true})).toBeVisible();
    await page.reload(); await expect(page.getByText(/Ubicación configurada ·/)).toBeVisible();
    await section.getByRole("spinbutton",{name:"Latitud",exact:true}).fill("-39.82");
    await section.getByRole("spinbutton",{name:"Longitud",exact:true}).fill("-73.24");
    await section.getByRole("button",{name:"Guardar ubicación"}).click();
    await expect(page.getByText("Ubicación guardada.",{exact:true})).toBeVisible();
    const api=await page.request.get(`/api/point-locations/${kind}/${id}`); const data=await api.json(); expect(data.latitude).toBe(-39.82);
    expect(api.headers()["cache-control"]).toContain("no-store");
    page.once("dialog",d=>d.accept()); await section.getByRole("button",{name:"Eliminar ubicación"}).click();
    await expect(page.getByText("Ubicación eliminada.",{exact:true})).toBeVisible();
    await page.reload(); await expect(page.getByText("Sin ubicación configurada",{exact:true})).toBeVisible();
  }
  const origin="http://localhost:3000";
  expect((await page.request.get(`/api/point-locations/physical/${foreignId}`)).status()).toBe(404);
  expect((await page.request.put(`/api/point-locations/physical/${foreignId}`,{headers:{origin},data:{latitude:0,longitude:0}})).status()).toBe(404);
  expect((await page.request.put(`/api/point-locations/physical/${physicalId}`,{headers:{origin},data:{latitude:"NaN",longitude:0}})).status()).toBe(400);
  expect((await page.request.put(`/api/point-locations/physical/${physicalId}`,{headers:{origin:"https://evil.invalid"},data:{latitude:0,longitude:0}})).status()).toBe(403);
  expect((await page.request.put(`/api/point-locations/physical/${physicalId}`,{headers:{origin},data:{latitude:0,longitude:0,visibility:"PUBLIC"}})).status()).toBe(400);
  const qr=await request.get(`/q/${pointCode}`,{maxRedirects:0}); expect(qr.status()).toBe(302); expect(qr.headers().location).toBe("https://wa.me/56912345678");
  const legacy=await db.localTouchpoint.findUniqueOrThrow({where:{id:pointId}}); expect(legacy.code).toBe(pointCode); expect(legacy.configurationVersion).toBe(1);
});


