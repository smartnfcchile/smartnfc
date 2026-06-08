import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const card = await prisma.card.findUnique({ where: { slug: 'agustin-admin' } });
  if (!card) return;

  await prisma.lead.createMany({
    data: [
      { email: 'contacto@empresa-cliente.cl', cardId: card.id },
      { email: 'director@inversiones-sur.com', cardId: card.id },
      { email: 'marketing@agenciadigital.cl', cardId: card.id },
    ]
  });
  console.log('✅ 3 Leads inyectados correctamente');
}
main().finally(() => prisma.$disconnect());