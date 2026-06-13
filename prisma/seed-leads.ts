import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const card = await prisma.card.findUnique({ where: { slug: 'agustin-admin' } });
  if (!card) return;

  await prisma.lead.createMany({
 data: [
  {
    name: "Contacto Empresa Cliente",
    email: "contacto@empresa-cliente.cl",
    cardId: card.id,
  },
  {
    name: "Director Inversiones Sur",
    email: "director@inversiones-sur.com",
    cardId: card.id,
  },
  {
    name: "Marketing Agencia Digital",
    email: "marketing@agenciadigital.cl",
    cardId: card.id,
   },
  ],
});
  console.log('✅ 3 Leads inyectados correctamente');
}
main().finally(() => prisma.$disconnect());