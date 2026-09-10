import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderReportEmail } from "../lib/local/report-email";
import type { ReportSnapshot } from "../lib/local/report-data";
const current={visits:240,nfc:150,qr:75,direct:15,conversions:48,conversionRate:20,newSubscribers:45,whatsapp:62,vcf:18,
  points:[{id:"caja",name:"Caja principal",visits:150,conversions:34,whatsapp:40},{id:"mesas",name:"Mesas",visits:75,conversions:12,whatsapp:19},{id:"direct",name:"Sin punto",visits:15,conversions:2,whatsapp:3}]};
const snapshot:ReportSnapshot={version:1,companyName:"Burger House · Local de ejemplo",frequency:"WEEKLY",
  periodStart:"2026-08-31T04:00:00Z",periodEnd:"2026-09-07T03:00:00Z",measurementSince:"2026-08-01T04:00:00Z",
  measurementIssues:0,partial:false,comparisonAvailable:true,current,
  previous:{...current,visits:200,newSubscribers:38}};
const target=process.argv[2];
if(!target) throw new Error("Indica la ruta del HTML de ejemplo.");
const html=renderReportEmail(snapshot,"https://example.test/dashboard/local/reportes/ejemplo")
  .replace('<body style=', '<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Informe SmartNFC Local · Ejemplo</title></head><body style=')
  .replace('<p style="color:#2563eb;', '<p style="color:#64748b">VISTA DE PRUEBA · DATOS FICTICIOS · NO ENVIADO</p><p style="color:#2563eb;');
writeFileSync(resolve(target),html,"utf8");
console.log("Ejemplo generado con el mismo renderer de los informes.");
