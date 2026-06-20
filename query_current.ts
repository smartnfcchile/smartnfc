import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const card = await prisma.card.findUnique({
    where: { slug: 'agustin-dev' },
  });
  console.log('Current template:', card?.template);
  console.log('Current avatarUrl:', card?.avatarUrl);
  console.log('Current coverUrl:', card?.coverUrl);
  console.log('Current logoUrl:', card?.logoUrl);
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
