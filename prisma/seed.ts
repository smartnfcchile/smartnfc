import { PrismaClient, PlanType, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const company = await prisma.company.upsert({
    where: { slug: "mega-publicidad" },
    update: {},
    create: {
      name: "Mega Publicidad",
      slug: "mega-publicidad",
      plan: PlanType.FREE,
    },
  });

  const passwordHash = await bcrypt.hash("Agustin1234", 10);

  const user = await prisma.user.upsert({
    where: { email: "agustin@demo.cl" },
    update: {},
    create: {
      name: "Agustín",
      email: "agustin@demo.cl",
      password: passwordHash,
      role: UserRole.CLIENT_ADMIN,
      companyId: company.id,
    },
  });

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
      email: "agustin@demo.cl",
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