import "../scripts/lib/seed-guard";
import { PrismaClient, LocalCampaignStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Iniciando seed de campaña de demostración 'Sarcárnico'...");

  // 1. Empresa explícita: nunca se elige "la primera" empresa de la base.
  //    Uso: npx tsx prisma/seed-sarcarnico.ts --company=<slug>
  //    Con --create-company se crea una empresa demo con ese slug si no existe.
  const args = process.argv.slice(2);
  const companySlug = args.find((a) => a.startsWith("--company="))?.slice("--company=".length).trim();
  if (!companySlug) {
    throw new Error("Indica la empresa destino con --company=<slug>. El seed no elige empresas automáticamente.");
  }
  let company = await prisma.company.findUnique({ where: { slug: companySlug } });
  if (!company) {
    if (!args.includes("--create-company")) {
      throw new Error(`No existe la empresa '${companySlug}'. Usa --create-company para crear una empresa demo con ese slug.`);
    }
    company = await prisma.company.create({
      data: {
        name: "Empresa Demo Sarcárnico",
        slug: companySlug,
        isActive: true,
        plan: "ENTERPRISE"
      }
    });
    console.log("✅ Creada Empresa Demo:", company.name);
  } else {
    console.log("✅ Usando la empresa indicada:", company.name);
  }

  // 2. Crear la campaña de demostración en estado DRAFT de forma idempotente
  const slug = "sarcarnico";
  const existing = await prisma.localCampaign.findUnique({
    where: { slug }
  });

  const campaignData = {
    companyId: company.id,
    name: "Demo Sarcárnico",
    slug,
    status: LocalCampaignStatus.DRAFT, // Debe permanecer en DRAFT/borrador por protección de datos (Requisito K-1)
    logoUrl: null, // Pendiente para carga desde editor
    primaryColor: "#2563eb",
    secondaryColor: "#d4af37",
    businessName: "Sarcárnico",
    clubName: "Club Sarcárnico",
    headline: "¡Bienvenido al club!",
    subheadline: "Beneficios exclusivos para quienes siempre vuelven.",
    address: "René Schneider 3181, Valdivia",
    whatsappNumber: null, // Dejado como nulo (pendiente de completar para evitar publicación ficticia accidental)
    whatsappMessage: "Hola Sarcárnico, soy {nombre} y quiero activar mi beneficio de bienvenida.",
    benefitLabel: "BENEFICIO DE BIENVENIDA",
    benefitTitle: "10% DE DESCUENTO",
    benefitDescription: "en tu próxima compra",
    benefitConditions: "Válido por una compra. Beneficio demostrativo.",
    consentText: "Acepto recibir promociones, novedades y beneficios de Sarcárnico mediante WhatsApp. Podré solicitar dejar de recibir mensajes en cualquier momento.",
    consentVersion: 1
  };

  if (!existing) {
    const created = await prisma.localCampaign.create({
      data: campaignData
    });

    // Crear touchpoint principal asociado
    await prisma.localTouchpoint.create({
      data: {
        campaignId: created.id,
        name: "Touchpoint Entrada",
        code: "tp-sarcarnico-entrada",
        isActive: true
      }
    });

    console.log("✅ Campaña de demostración 'Sarcárnico' creada exitosamente en estado DRAFT.");
  } else {
    // Actualizar campos
    await prisma.localCampaign.update({
      where: { id: existing.id },
      data: {
        businessName: campaignData.businessName,
        clubName: campaignData.clubName,
        headline: campaignData.headline,
        subheadline: campaignData.subheadline,
        address: campaignData.address,
        benefitLabel: campaignData.benefitLabel,
        benefitTitle: campaignData.benefitTitle,
        benefitDescription: campaignData.benefitDescription,
        benefitConditions: campaignData.benefitConditions,
        consentText: campaignData.consentText
      }
    });
    console.log("⚠️ La campaña 'sarcarnico' ya existía. Datos actualizados en estado DRAFT.");
  }
}

main()
  .catch((e) => {
    console.error("❌ Error en seed de Sarcárnico:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
