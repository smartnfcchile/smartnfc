import { randomBytes } from "node:crypto";
import { prisma } from "../prisma";
import { requireSolutionsOperator } from "./access";

export function generateSolutionToken() {
  return randomBytes(32).toString("base64url");
}
/**
 * Draft tag creation only. Tag activation/publishing is a separate,
 * permission-controlled workflow and is deliberately not implemented here.
 */
export async function createDraftSolutionTag(input: {
  companyId: string; projectId: string; recordId: string;
}) {
  await requireSolutionsOperator(input.companyId);
  const record = await prisma.solutionRecord.findFirst({
    where: { id: input.recordId, companyId: input.companyId,
      projectId: input.projectId, project: { mode: "ASSETS", status: "DRAFT" } },
    select: { id: true }
  });
  if (!record) throw new Error("Ficha no disponible o no editable");
  const tag = await prisma.solutionTag.create({
    data: { companyId: input.companyId, projectId: input.projectId,
      recordId: record.id, publicToken: generateSolutionToken(), status: "PENDING" },
    select: { id: true, publicToken: true }
  });
  return tag;
}