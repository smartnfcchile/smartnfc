import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const card = await prisma.card.findUnique({ where: { slug: 'agustin-dev' } }); // using agustin-dev from standard seed
  if (!card) return;

  await prisma.lead.createMany({
    data: [
      {
        name: "Contacto Empresa Cliente",
        email: "contacto@empresa-cliente.cl",
        cardId: card.id,
        companyId: card.companyId,
      },
      {
        name: "Director Inversiones Sur",
        email: "director@inversiones-sur.com",
        cardId: card.id,
        companyId: card.companyId,
      },
      {
        name: "Marketing Agencia Digital",
        email: "marketing@agenciadigital.cl",
        cardId: card.id,
        companyId: card.companyId,
      },
    ],
  });
  console.log('✅ 3 Leads inyectados correctamente');
}
main().finally(() => prisma.$disconnect());