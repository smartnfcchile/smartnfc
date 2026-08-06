import "server-only";
import { prisma } from "../prisma";
import { PHYSICAL_CARD_TEMPLATES, TEMPLATE_EDITABLE_FIELDS, makeTemplateSide } from "./templates";

export async function ensurePhysicalTemplates() {
  const count = await prisma.cardDesignTemplate.count({ where: { isActive: true } });
  if (count >= PHYSICAL_CARD_TEMPLATES.length) return;
  await Promise.all(PHYSICAL_CARD_TEMPLATES.map((template, sortOrder) => prisma.cardDesignTemplate.upsert({
    where: { slug: template.slug },
    update: { name: template.name, category: template.category, description: template.description, frontSchema: makeTemplateSide(template), backSchema: makeTemplateSide(template, true), editableFields: TEMPLATE_EDITABLE_FIELDS, isPremium: template.premium ?? false, sortOrder, isActive: true },
    create: { slug: template.slug, name: template.name, category: template.category, description: template.description, frontSchema: makeTemplateSide(template), backSchema: makeTemplateSide(template, true), editableFields: TEMPLATE_EDITABLE_FIELDS, isPremium: template.premium ?? false, sortOrder },
  })));
}
