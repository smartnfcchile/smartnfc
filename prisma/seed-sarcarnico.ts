import { PrismaClient, LocalCampaignStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Iniciando seed de campaña de demostración 'Sarcárnico'...");

  // 1. Resolver o crear una empresa demo
  let company = await prisma.company.findFirst();
  if (!company) {
    company = await prisma.company.create({
      data: {
        name: "Empresa Demo Sarcárnico",
        isActive: true,
        plan: "ENTERPRISE"
      }
    });
    console.log("✅ Creada Empresa Demo:", company.name);
  } else {
    console.log("✅ Reutilizando Empresa existente para la campaña demo:", company.name);
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
