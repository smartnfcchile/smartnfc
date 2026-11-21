"use server";

import type { Prisma } from "@prisma/client";
import { prepareImport, validateTemplate, type FieldDefinition } from "../../../lib/soluciones/core";
import { redirect } from "next/navigation";
import { randomUUID } from "node:crypto";
import { prisma } from "../../../lib/prisma";
import { requireSolutionsOperator } from "../../../lib/soluciones/access";
import { campaignDestination } from "../../../lib/soluciones/destination";
import { generateSolutionToken } from "../../../lib/soluciones/tags";

export async function updateSolution(form: FormData) {
  const read = (key: string) => String(form.get(key) ?? "").trim();
  const projectId = read("projectId");
  const companyId = read("companyId");
  const { actor } = await requireSolutionsOperator(companyId);
  const scope = { companyId, projectId };
  const projectScope = { companyId, id: projectId };
  const revision = Number(read("revision"));
  const operation = read("operation");
  const targetId = read("targetId");
  const path = "/superadmin/soluciones/" + encodeURIComponent(projectId);
  try {
    await prisma.$transaction(async tx => {
      const lock = await tx.solutionProject.updateMany({
        where: { ...projectScope, revision, company: { isActive: true } },
        data: { revision: { increment: 1 } },
      });
      if (!lock.count) throw new Error("El proyecto cambió. Recarga la página.");
      const project = await tx.solutionProject.findFirstOrThrow({ where: projectScope });
      if (operation === "settings") {
        const name = read("name");
        const status = read("status");
        if (name.length < 3 || name.length > 120 ||
            !["DRAFT", "ACTIVE", "INACTIVE"].includes(status)) throw new Error("Nombre o estado inválido.");
        const destinationUrl = project.mode === "CAMPAIGN" && (read("destination") || status === "ACTIVE")
          ? campaignDestination(read("destination")) : null;
        await tx.solutionProject.update({ where: { id: projectId }, data: { name, status, destinationUrl } });
      } else if (operation === "batch" && project.mode === "CAMPAIGN") {
        const name = read("name");
        const quantity = Number(read("quantity"));
        if (!name || name.length > 120 || !Number.isInteger(quantity) || quantity < 1 || quantity > 200) {
          throw new Error("Ingresa nombre y cantidad entre 1 y 200.");
        }
        const batch = await tx.solutionBatch.create({ data: { ...scope, name, quantity } });
        await tx.solutionTag.createMany({ data: Array.from({ length: quantity }, () => ({
          ...scope, batchId: batch.id, publicToken: generateSolutionToken(), status: "PENDING",
        })) });
      } else if (operation === "batch-state" && project.mode === "CAMPAIGN") {
        const batch = await tx.solutionBatch.findFirst({ where: { ...scope, id: targetId } });
        if (!batch) throw new Error("Lote no disponible.");
        await tx.solutionTag.updateMany({
          where: { ...scope, batchId: batch.id, status: { not: "REPLACED" } },
          data: { status: read("activate") === "yes" ? "ACTIVE" : "DISABLED" },
        });
      } else if ((operation === "asset-tag" || operation === "asset-state") && project.mode === "ASSETS") {
        const record = await tx.solutionRecord.findFirst({ where: { ...scope, id: targetId } });
        if (!record || record.status === "ARCHIVED") throw new Error("Ficha no disponible.");
        if (operation === "asset-tag") {
          await tx.solutionTag.create({
            data: { ...scope, recordId: record.id, publicToken: generateSolutionToken(), status: "PENDING" },
          });
        } else {
          const status = read("status");
          if (status !== "ACTIVE" && status !== "INACTIVE" && status !== "ARCHIVED") throw new Error("Estado inválido.");
          await tx.solutionRecord.update({ where: { id: record.id }, data: { status } });
        }
      } else if (operation === "template" && project.mode === "ASSETS") {
        const code = read("code");
        const name = read("name");
        const fields = JSON.parse(read("fields")) as FieldDefinition[];
        if (name.length < 3 || name.length > 120 ||
            validateTemplate({ code, name, mode: "ASSETS", fields }).length) {
          throw new Error("Revisa el código, nombre y definición de campos.");
        }
        const latest = await tx.solutionTemplate.findFirst({
          where: { ...scope, code }, orderBy: { version: "desc" },
        });
        await tx.solutionTemplate.create({ data: {
          ...scope, code, name, version: (latest?.version ?? 0) + 1,
          fields: JSON.parse(JSON.stringify(fields)),
        } });
      } else if (operation === "asset-save" && project.mode === "ASSETS") {
        const template = await tx.solutionTemplate.findFirst({
          where: { ...scope, id: read("templateId") },
        });
        if (!template) throw new Error("Plantilla no disponible.");
        const location = read("location");
        if (location.length > 120) throw new Error("Ubicación demasiado larga.");
        const { accepted, rejected } = prepareImport(
          [{ ...JSON.parse(read("fields")), codigo: read("code") }],
          { code: template.code, name: template.name, mode: "ASSETS", fields: template.fields as FieldDefinition[] },
        );
        if (rejected.length) throw new Error(`${rejected[0].field}: ${rejected[0].message}`);
        const record = accepted[0];
        const data = { templateId: template.id, externalCode: record.externalId,
          data: record.values as Prisma.InputJsonValue, location: location || null };
        if (targetId) {
          const result = await tx.solutionRecord.updateMany({
            where: { ...scope, id: targetId, status: { not: "ARCHIVED" } }, data,
          });
          if (!result.count) throw new Error("Ficha no disponible.");
        } else {
          await tx.solutionRecord.create({ data: { ...scope, ...data } });
        }
      } else if (operation === "tag") {
        const tag = await tx.solutionTag.findFirst({ where: { ...scope, id: targetId } });
        if (!tag || tag.status === "REPLACED") throw new Error("Etiqueta no disponible.");
        const status = read("status");
        if (status !== "ACTIVE" && status !== "DISABLED" && status !== "REPLACED") throw new Error("Estado inválido.");
        await tx.solutionTag.update({ where: { id: tag.id }, data: { status } });
        if (status === "REPLACED") {
          await tx.solutionTag.create({ data: {
            ...scope, recordId: tag.recordId, batchId: tag.batchId,
            publicToken: generateSolutionToken(), status: "PENDING",
          } });
        }
      } else {
        throw new Error("Operación incompatible con el proyecto.");
      }
      await tx.solutionOperation.create({
        data: { ...scope, id: randomUUID(), actorId: actor.id, kind: operation, targetId: targetId || null },
      });
    });
  } catch (error) {
    const message = error instanceof Error && !("code" in error) && error.message.length < 125
      ? error.message : "No se pudo guardar la operación.";
    redirect(path + "?error=" + encodeURIComponent(message));
  }
  redirect(path);
}
