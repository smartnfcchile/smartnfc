import assert from "node:assert/strict";
import { test } from "node:test";
import { periodStart, nextPeriod, previousPeriod, reportDueAt, periodLabel } from "../../lib/local/report-period";
import { signConsent, verifyConsent } from "../../lib/local/consent";
import { renderReportEmail } from "../../lib/local/report-email";
import type { ReportSnapshot } from "../../lib/local/report-data";

test("Semana chilena atraviesa horario de verano sin perder ni duplicar horas",()=>{
  const start=periodStart(new Date("2026-09-03T12:00:00Z"),"WEEKLY");
  const end=nextPeriod(start,"WEEKLY");
  assert.equal(start.toISOString(),"2026-08-31T04:00:00.000Z");
  assert.equal(end.toISOString(),"2026-09-07T03:00:00.000Z");
  assert.equal((end.getTime()-start.getTime())/3600000,167);
  assert.equal(reportDueAt(end).toISOString(),"2026-09-07T11:00:00.000Z");
});
test("Meses completos, cambio de año y febrero bisiesto",()=>{
  const start=periodStart(new Date("2028-02-15T12:00:00Z"),"MONTHLY");
  assert.equal(nextPeriod(start,"MONTHLY").toISOString(),"2028-03-01T03:00:00.000Z");
  assert.equal(previousPeriod(periodStart(new Date("2027-01-10Z"),"MONTHLY"),"MONTHLY").toISOString(),"2026-12-01T03:00:00.000Z");
  assert.match(periodLabel(start,nextPeriod(start,"MONTHLY")),/2028/);
});
test("Firma liga consentimiento a tenant, campaña, texto y versión publicados",()=>{
  process.env.NEXTAUTH_SECRET="local-test-secret-only";
  const consent={campaignId:"campaign-a",publishedVersion:1,consentVersion:1,consentText:"Texto A publicado"};
  const token=signConsent(consent);
  assert.equal(verifyConsent(consent,token),true);
  for (const changed of [{...consent,consentText:"Texto B borrador"},{...consent,campaignId:"campaign-b"},{...consent,publishedVersion:2}]) {
    assert.equal(verifyConsent(changed,token),false);
  }
  assert.equal(verifyConsent(consent,"invalid"),false);
});
test("Correo escapa contenido comercial y distingue cobertura de cero registrado",()=>{
  const m={visits:0,nfc:0,qr:0,direct:0,conversions:0,conversionRate:0,newSubscribers:0,whatsapp:0,vcf:0,points:[]};
  const snapshot:ReportSnapshot={version:1,companyName:'<img src=x onerror="bad">',frequency:"WEEKLY",
    periodStart:"2026-08-31T04:00:00Z",periodEnd:"2026-09-07T03:00:00Z",
    measurementSince:"2026-09-02T12:00:00Z",measurementIssues:0,partial:true,comparisonAvailable:false,current:m,previous:m};
  const html=renderReportEmail(snapshot,"https://example.test/report");
  assert.ok(!html.includes('<img src=x'));
  assert.match(html,/&lt;img/);
  assert.match(html,/No se registró actividad/);
  assert.match(html,/Cobertura parcial/);
  assert.ok(!html.includes("Infinity"));
});


test("Envío a las ocho incluso si la medianoche no existe",()=>{
  assert.equal(reportDueAt(new Date("2026-09-06T04:00:00Z")).toISOString(),"2026-09-06T11:00:00.000Z");
});
