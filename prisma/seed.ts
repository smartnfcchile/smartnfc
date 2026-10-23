import "../scripts/lib/seed-guard";
import { PrismaClient, PlanType, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import { DEMO_USER_EMAIL, decideSuperadminSeed, seedPassword } from "../scripts/lib/seed-policy";
import { PHYSICAL_CARD_TEMPLATES, TEMPLATE_EDITABLE_FIELDS, makeTemplateSide } from "../lib/physical-card/templates";

const prisma = new PrismaClient();

async function main() {
  for (const [sortOrder, template] of PHYSICAL_CARD_TEMPLATES.entries()) {
    await prisma.cardDesignTemplate.upsert({
      where: { slug: template.slug },
      update: {
        name: template.name, category: template.category, description: template.description,
        frontSchema: makeTemplateSide(template), backSchema: makeTemplateSide(template, true),
        editableFields: TEMPLATE_EDITABLE_FIELDS, isPremium: template.premium ?? false, sortOrder, isActive: true,
      },
      create: {
        slug: template.slug, name: template.name, category: template.category, description: template.description,
        frontSchema: makeTemplateSide(template), backSchema: makeTemplateSide(template, true),
        editableFields: TEMPLATE_EDITABLE_FIELDS, isPremium: template.premium ?? false, sortOrder,
      },
    });
  }
  const company = await prisma.company.upsert({
    where: { slug: "mega-publicidad" },
    update: {},
    create: {
      name: "Mega Publicidad",
      slug: "mega-publicidad",
      plan: PlanType.FREE,
    },
  });

  // Usuario demo local: sin contraseña fija. Se usa SEED_DEMO_PASSWORD o una aleatoria que se
  // muestra una sola vez en esta consola local. Si ya existe, no se modifica.
  let user = await prisma.user.findUnique({ where: { email: DEMO_USER_EMAIL } });
  if (!user) {
    const demoPassword = seedPassword(process.env.SEED_DEMO_PASSWORD);
    user = await prisma.user.create({
      data: {
        name: "Usuario Demo",
        email: DEMO_USER_EMAIL,
        password: await bcrypt.hash(demoPassword.value, 10),
        role: UserRole.COMPANY_OWNER,
        companyId: company.id,
      },
    });
    console.log(`Usuario demo creado: ${DEMO_USER_EMAIL}`);
    if (demoPassword.generated) console.log(`Contraseña generada (solo base local, no se vuelve a mostrar): ${demoPassword.value}`);
  }

  // Superadministrador local opcional. El seed nunca promueve una cuenta existente con otro rol.
  const superAdminEmail = (process.env.SUPER_ADMIN_EMAIL || process.env.SEED_SUPERADMIN_EMAIL)?.trim().toLowerCase();
  if (superAdminEmail) {
    const existing = await prisma.user.findUnique({ where: { email: superAdminEmail }, select: { id: true, role: true } });
    const decision = decideSuperadminSeed(existing, Boolean(process.env.SEED_SUPERADMIN_PASSWORD?.trim()));
    if (decision.action === "create") {
      const password = seedPassword(process.env.SEED_SUPERADMIN_PASSWORD);
      await prisma.user.create({
        data: {
          name: "Super Administrador",
          email: superAdminEmail,
          password: await bcrypt.hash(password.value, 10),
          role: UserRole.SUPERADMIN,
          isActive: true,
          companyId: company.id,
        },
      });
      console.log("Superadministrador local creado.");
      if (password.generated) console.log(`Contraseña generada (solo base local, no se vuelve a mostrar): ${password.value}`);
    } else if (decision.action === "refresh-existing-superadmin") {
      await prisma.user.update({
        where: { id: existing!.id },
        data: {
          isActive: true,
          ...(decision.updatePassword ? { password: await bcrypt.hash(process.env.SEED_SUPERADMIN_PASSWORD!.trim(), 10) } : {}),
        },
      });
      console.log("Superadministrador local existente verificado.");
    } else {
      console.warn(`Superadministrador NO configurado: ${decision.reason}.`);
    }
  }

  await prisma.card.upsert({
    where: { slug: "agustin-dev" },
    update: {
      logoUrl: "https://placehold.co/320x120/020617/ffffff?text=NFC+PRO",
      avatarUrl: "https://placehold.co/300x300/2563eb/ffffff?text=A",
      coverUrl: "https://placehold.co/900x420/020617/2563eb?text=SMART+NFC",
      videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      videoTitle: "Conoce nuestra tarjeta digital NFC",
    },
    create: {
      slug: "agustin-dev",
      name: "Tarjeta Demo Agustín",
      profileName: "Agustín Jara",
      role: "Creador de Tarjetas NFC",
      companyName: "NFC Smart Cards Pro",
      bio: "Tarjetas digitales inteligentes con NFC, QR dinámico, captura de contactos y métricas de interacción en tiempo real.",
      location: "Valdivia, Chile",
      email: DEMO_USER_EMAIL,
      phone: "+56912345678",
      whatsapp: "56912345678",
      linkedin: "https://www.linkedin.com",
      instagram: "https://www.instagram.com",
      youtube: "https://www.youtube.com",
      logoUrl: "https://placehold.co/320x120/020617/ffffff?text=NFC+PRO",
      avatarUrl: "https://placehold.co/300x300/2563eb/ffffff?text=A",
      coverUrl: "https://placehold.co/900x420/020617/2563eb?text=SMART+NFC",
      videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      videoTitle: "Conoce nuestra tarjeta digital NFC",
      themeColor: "#2563eb",
      themeMode: "dark",
      userId: user.id,
      companyId: company.id,
      links: {
        create: [
          {
            title: "Ver catálogo de tarjetas NFC",
            url: "https://www.google.com",
            icon: "card",
            order: 1,
          },
          {
            title: "Solicitar una demo por WhatsApp",
            url: "https://wa.me/56912345678",
            icon: "whatsapp",
            order: 2,
          },
          {
            title: "Visitar sitio web",
            url: "https://www.google.com",
            icon: "web",
            order: 3,
          },
        ],
      },
    },
  });

  console.log("Seed ejecutado correctamente.");
}

main()
  .catch((error) => {
    console.error("Error ejecutando seed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
