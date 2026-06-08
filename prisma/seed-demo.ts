// prisma/seed-demo.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Buscando al usuario administrador...');
  
  const admin = await prisma.user.findUnique({
    where: { email: 'admin@nfc.com' }
  });

  if (!admin) {
    console.log('❌ Error: No se encontró al administrador.');
    return;
  }

  console.log('Creando tarjeta NFC de demostración...');
  
  // 1. Creamos la tarjeta si no existe
  let card = await prisma.card.findUnique({
    where: { slug: 'agustin-admin' }
  });

  if (!card) {
    card = await prisma.card.create({
      data: {
        slug: 'agustin-admin',
        name: 'Tarjeta Principal (Demo)',
        userId: admin.id,
        companyId: admin.companyId,
      }
    });
    console.log('✅ Tarjeta creada: agustin-admin');
  } else {
    console.log('⚠️ La tarjeta ya existía, procediendo a inyectar datos...');
  }

  console.log('Generando historial analítico...');
  
  // Limpiamos la basura anterior para que los gráficos queden limpios
  await prisma.event.deleteMany({
    where: { cardId: card.id }
  });

  // 2. Creamos 50 eventos aleatorios
  const fakeEvents = [];
  const eventTypes = ['page_view', 'page_view', 'page_view', 'whatsapp_click', 'vcard_click'];
  const devices = ['iPhone', 'Android', 'Windows', 'Macintosh'];

  for (let i = 0; i < 50; i++) {
    const date = new Date();
    // Le restamos días aleatorios para simular que entraron durante la semana
    date.setDate(date.getDate() - Math.floor(Math.random() * 7));

    fakeEvents.push({
      eventType: eventTypes[Math.floor(Math.random() * eventTypes.length)],
      ipHash: 'hash-falso-' + Math.floor(Math.random() * 10),
      userAgent: devices[Math.floor(Math.random() * devices.length)],
      cardId: card.id,
      createdAt: date,
    });
  }

  // 3. Los enviamos todos de golpe a Neon
  await prisma.event.createMany({
    data: fakeEvents
  });

  console.log(`✅ ¡Base de datos inyectada con ${fakeEvents.length} eventos exitosamente! 🚀`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });