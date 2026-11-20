"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "../../../lib/prisma";
import { requireSolutionsOperator } from "../../../lib/soluciones/access";
import { BUILT_IN_TEMPLATES, validateTemplate } from "../../../lib/soluciones/core";

export async function createSolutionProject(formData: FormData) {
  const companyId = String(formData.get("companyId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const code = String(formData.get("templateCode") ?? "");
  const mode = String(formData.get("mode") ?? "");
  if (!companyId || name.length < 3 || name.length > 120) throw new Error("Nombre o empresa inválidos");
  if (mode !== "ASSETS" && mode !== "CAMPAIGN") throw new Error("Modalidad inválida");
  const template = BUILT_IN_TEMPLATES.find(t => t.code === code && t.mode === mode);
  if (!template || validateTemplate(template).length) throw new Error("Plantilla inválida");
  await requireSolutionsOperator(companyId);
  await prisma.$transaction(async tx => {
    const project = await tx.solutionProject.create({
      data: { companyId, name, mode, status: "DRAFT" }
    });
    await tx.solutionTemplate.create({
      data: { companyId, projectId: project.id, code: template.code,
        name: template.name, version: 1, fields: JSON.parse(JSON.stringify(template.fields)) }
    });
  });
  revalidatePath("/superadmin/soluciones");
  redirect("/superadmin/soluciones?companyId=" + encodeURIComponent(companyId));
}