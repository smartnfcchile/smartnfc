import "./lib/maintenance-guard";
import { prisma } from "../lib/prisma";
import { PHYSICAL_CARD_TEMPLATES, TEMPLATE_EDITABLE_FIELDS, makeTemplateSide } from "../lib/physical-card/templates";

async function main() {
  // Este script escribe directamente: sin --apply solo muestra lo que haría.
  if (!process.argv.slice(2).includes("--apply") || process.argv.includes("--dry-run")) {
    console.log(`[DRY-RUN] Se sincronizarían ${PHYSICAL_CARD_TEMPLATES.length} plantillas físicas (upsert por slug):`);
    for (const template of PHYSICAL_CARD_TEMPLATES) console.log(` - ${template.slug}`);
    console.log("Agrega --apply para escribir (y --confirm-host=<host> si el destino es remoto).");
    return;
  }
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
