import { validateCampaignContent } from "./campaign-content";
import { campaignForSite } from "./campaign-editor";
import { campaignDestination } from "./destination";
import { prisma } from "../prisma";
import { publicFields, validateTemplate, type SolutionTemplate, type FieldDefinition } from "./core";

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{32,100}$/;

/**
 * Only published project + active asset + active tag can produce a public view.
 * A tag is an unguessable lookup token, not a physical NFC UID.
 * Campaign tags share the project destination.
 */
export async function resolvePublicSolutionTag(token: string) {
  if (!TOKEN_PATTERN.test(token)) return null;
  const tag = await prisma.solutionTag.findUnique({
    where: { publicToken: token },
    select: {
      status: true, recordId: true, campaignSiteId: true,
      project: { select: {
        name: true, mode: true, status: true, destinationUrl: true,
        campaignLanding: { select: { destination: true, expiresAt: true, publishedVersion: { select: { content: true } } } },
        company: { select: { name: true, isActive: true } }
      }},
      record: { select: {
        externalCode: true, status: true, data: true,
        template: { select: { code: true, name: true, fields: true } }
      }}
    }
  });
  if (!tag || tag.status !== "ACTIVE" || !tag.project.company.isActive ||
      tag.project.status !== "ACTIVE") return null;
  if (tag.project.mode === "CAMPAIGN") {
    if (tag.recordId) return null;
    const landing = tag.project.campaignLanding;
    if (landing?.destination === "LANDING") {
      if (!landing.publishedVersion || (landing.expiresAt && landing.expiresAt.getTime() <= Date.now())) return null;
      try {
        const approved = validateCampaignContent(landing.publishedVersion.content);
        const { design, blocks } = campaignForSite(approved, tag.campaignSiteId ?? "");
        const visible = blocks.filter(block => !block.hidden)
          .map((block, index) => ({ ...block, id: String(index) }));
        return { kind: "campaignLanding" as const, design, blocks: visible };
      } catch {
        return null;
      }
    }
    if (!tag.project.destinationUrl) return null;
    try {
      return { kind: "campaign" as const, destination: campaignDestination(tag.project.destinationUrl) };
    } catch {
      return null;
    }
  }
  if (tag.record?.status !== "ACTIVE" || !tag.recordId || !tag.record) return null;

  const template: SolutionTemplate = {
    code: tag.record.template.code, name: tag.record.template.name,
    mode: "ASSETS", fields: tag.record.template.fields as FieldDefinition[]
  };
  if (validateTemplate(template).length !== 0 ||
      !tag.record.data || typeof tag.record.data !== "object" ||
      Array.isArray(tag.record.data)) return null;
  const data = publicFields(template, tag.record.data as Record<string,unknown>);
  return {
    kind: "asset" as const,
    organization: tag.project.company.name,
    project: tag.project.name,
    template: template.name,
    code: tag.record.externalCode,
    fields: template.fields.filter(f=>f.public===true)
      .map(f=>({ key:f.key, label:f.label, value: data[f.key] }))
      .filter(f=>f.value!==undefined && f.value!==null && f.value!=="")
  };
}