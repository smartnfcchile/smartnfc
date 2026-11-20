import { Prisma } from "@prisma/client";
import { prisma } from "../prisma";
import { requireSolutionsOperator } from "./access";
import { prepareImport, validateTemplate, type FieldDefinition, type ImportRow, type SolutionTemplate } from "./core";

export type ImportPreview = {
  accepted: number;
  rejected: Array<{ row: number; field: string; message: string }>;
  duplicates: string[];
};
/** Internal import service; safe to repeat the same dataset. Do not use from public APIs. */
export async function importSolutionRecords(input: {
  companyId: string;
  projectId: string;
  templateId: string;
  rows: ImportRow[];
  apply: boolean;
}): Promise<ImportPreview> {
  await requireSolutionsOperator(input.companyId);
  if (!Array.isArray(input.rows) || input.rows.length < 1 || input.rows.length > 500) {
    throw new Error("Se admiten de 1 a 500 filas por lote");
  }
  const project = await prisma.solutionProject.findFirst({
    where: { id: input.projectId, companyId: input.companyId, mode: "ASSETS", status: "DRAFT" },
    select: { id: true },
  });
  if (!project) throw new Error("Proyecto no disponible o no editable");
  const dbTemplate = await prisma.solutionTemplate.findFirst({
    where: { id: input.templateId, projectId: input.projectId, companyId: input.companyId },
    select: { code: true, name: true, fields: true },
  });
  if (!dbTemplate) throw new Error("Plantilla no pertenece al proyecto");
  if (!Array.isArray(dbTemplate.fields)) throw new Error("Definición de plantilla inválida");
  const template: SolutionTemplate = {
    code: dbTemplate.code,
    name: dbTemplate.name,
    mode: "ASSETS",
    fields: dbTemplate.fields as FieldDefinition[],
  };
  if (validateTemplate(template).length) throw new Error("Plantilla inválida");
  const prepared = prepareImport(input.rows, template);
  const preview = {
    accepted: prepared.accepted.length,
    rejected: prepared.rejected,
    duplicates: prepared.duplicates,
  };
  if (!input.apply || preview.rejected.length > 0) return preview;

  // A single transaction preserves all-or-nothing batch behavior. Uniqueness
  // on (projectId, externalCode) makes the operation repeatable.
  await prisma.$transaction(async tx => {
    const checked = await tx.solutionProject.findFirst({
      where: { id: input.projectId, companyId: input.companyId, status: "DRAFT", mode: "ASSETS" },
      select: { id: true },
    });
    if (!checked) throw new Error("El proyecto cambió de estado");
    for (const item of prepared.accepted) {
      const jsonData = JSON.parse(JSON.stringify(item.values)) as Prisma.InputJsonValue;
      await tx.solutionRecord.upsert({
        where: { projectId_externalCode: { projectId: input.projectId, externalCode: item.externalId } },
        create: {
          companyId: input.companyId,
          projectId: input.projectId,
          templateId: input.templateId,
          externalCode: item.externalId,
          data: jsonData,
          status: "DRAFT",
        },
        update: { data: jsonData, templateId: input.templateId },
      });
    }
  }, { timeout: 30000 });
  return preview;
}
