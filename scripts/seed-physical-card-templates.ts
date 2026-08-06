import { prisma } from "../lib/prisma";
import { PHYSICAL_CARD_TEMPLATES, TEMPLATE_EDITABLE_FIELDS, makeTemplateSide } from "../lib/physical-card/templates";

async function main() {
  for (const [sortOrder, template] of PHYSICAL_CARD_TEMPLATES.entries()) {
    await prisma.cardDesignTemplate.upsert({
      where: { slug: template.slug },
      update: { name: template.name, category: template.category, description: template.description, frontSchema: makeTemplateSide(template), backSchema: makeTemplateSide(template, true), editableFields: TEMPLATE_EDITABLE_FIELDS, isPremium: template.premium ?? false, sortOrder, isActive: true },
      create: { slug: template.slug, name: template.name, category: template.category, description: template.description, frontSchema: makeTemplateSide(template), backSchema: makeTemplateSide(template, true), editableFields: TEMPLATE_EDITABLE_FIELDS, isPremium: template.premium ?? false, sortOrder },
    });
  }
  console.log(`Plantillas físicas listas: ${PHYSICAL_CARD_TEMPLATES.length}`);
}

main().finally(() => prisma.$disconnect());
