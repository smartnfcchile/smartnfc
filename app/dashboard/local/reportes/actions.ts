"use server";
import { prisma } from "../../../../lib/prisma";
import { requireLocalAdmin } from "../../../../lib/local/access";
import { periodStart } from "../../../../lib/local/report-period";
import { revalidatePath } from "next/cache";
export async function saveReportSettings(_state:{error?:string;success?:string},form:FormData):Promise<{error?:string;success?:string}> {
  try {
    const {actor,company}=await requireLocalAdmin(String(form.get("companyId") || ""));
    const frequency=String(form.get("frequency"));
    if (frequency!=="WEEKLY" && frequency!=="MONTHLY") throw new Error("Frecuencia inválida.");
    const recipientIds=[...new Set(form.getAll("recipientIds").map(String))];
    const enabled=form.get("enabled")==="on";
    if (recipientIds.length>10 || (enabled && !recipientIds.length)) throw new Error("Selecciona entre 1 y 10 destinatarios.");
    const users=await prisma.user.count({where:{id:{in:recipientIds},companyId:company.id,
      isActive:true,status:"ACTIVE",role:{in:["COMPANY_OWNER","COMPANY_ADMIN"]}}});
    if (users!==recipientIds.length) throw new Error("Hay destinatarios no autorizados.");
    await prisma.$transaction(async tx=>{
      const current=await tx.localReportSetting.upsert({where:{companyId:company.id},
        create:{companyId:company.id},update:{}});
      const restart=!current.enabled || current.frequency!==frequency || !current.nextPeriodStart;
      await tx.localReportSetting.update({where:{companyId:company.id},data:{
        enabled,frequency,recipientIds,
        ...(enabled && restart?{nextPeriodStart:periodStart(new Date(),frequency)}:{})
      }});
      await tx.adminAuditLog.create({data:{actorUserId:actor.id,companyId:company.id,
        action:"LOCAL_REPORT_SETTINGS_UPDATE",entityType:"LOCAL_REPORT_SETTING",entityId:company.id,
        metadata:JSON.stringify({enabled,frequency,recipientIds})}});
    });
    revalidatePath("/dashboard/local/reportes");
    revalidatePath("/superadmin/locales/"+company.id+"/reportes");
    return {success:"Preferencias guardadas."};
  } catch(error) {return {error:error instanceof Error?error.message:"No se pudo guardar."};}
}
