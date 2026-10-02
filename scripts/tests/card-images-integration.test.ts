import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import type { PrismaClient } from "@prisma/client";

// Solo PostgreSQL desechable local: nunca Neon ni producción.
const url = process.env.BLOCK2_TEST_DATABASE_URL;
const allowed = !!url && ["127.0.0.1", "localhost"].includes(new URL(url).hostname) && new URL(url).pathname.includes("block2_disposable");

test("Imágenes del perfil: guardar conserva, elimina y valida en PostgreSQL real", { skip: !allowed }, async (t) => {
  process.env.DATABASE_URL = url!;
  // Store ficticio para la prueba: ningún token real.
  process.env.BLOB_STORE_ID = "store_qateststore";
  delete process.env.BLOB_READ_WRITE_TOKEN;
  let session: { user: { id: string; companyId: string; role: string } } | null = null;
  require("next-auth"); require.cache[require.resolve("next-auth")]!.exports = { getServerSession: async () => session };
  require("next/cache"); require.cache[require.resolve("next/cache")]!.exports = { revalidatePath: () => {} };
  const { prisma: db } = require("../../lib/prisma") as { prisma: PrismaClient };
  const { updateCard } = require("../../app/dashboard/editor/[cardId]/actions");

  const suffix = randomUUID().slice(0, 8);
  const blob = (name: string) => `https://qateststore.public.blob.vercel-storage.com/${name}`;
  const legacyHero = "https://images.example.test/legacy-hero.jpg";
  const company = await db.company.create({ data: { name: "Images " + suffix } });
  const owner = await db.user.create({ data: { companyId: company.id, email: "img" + suffix + "@example.test", role: "COMPANY_OWNER" } });
  session = { user: { id: owner.id, companyId: company.id, role: owner.role } };
  await db.companyProductLicense.create({ data: { companyId: company.id, product: "EMPRESAS", planCode: "EMPRESAS_PRO" } });
  const card = await db.card.create({
    data: {
      companyId: company.id, userId: owner.id, name: "Images", slug: "images-" + suffix,
      avatarUrl: blob("avatar-old.jpg"), logoUrl: blob("logo-old.png"), coverUrl: blob("cover-old.jpg"), heroImageUrl: legacyHero,
    },
  });

  const form = (images: Record<string, string>) => {
    const fd = new FormData();
    for (const [key, value] of Object.entries({
      cardId: card.id, profileName: "Images", role: "", companyName: "Images", bio: "", themeColor: "#2563eb", themeMode: "dark",
      primaryActionType: "NONE", secondaryActionType: "SAVE_CONTACT", ...images,
    })) fd.set(key, value);
    return fd;
  };
  const images = async () => db.card.findUniqueOrThrow({ where: { id: card.id }, select: { avatarUrl: true, logoUrl: true, coverUrl: true, heroImageUrl: true } });
  const current = { avatarUrl: blob("avatar-old.jpg"), logoUrl: blob("logo-old.png"), coverUrl: blob("cover-old.jpg"), heroImageUrl: legacyHero };

  try {
    await t.test("Imágenes existentes sin modificar se conservan al guardar (incluida una URL legacy externa)", async () => {
      const res = await updateCard(form(current));
      assert.equal(res.success, true, res.error);
      assert.deepEqual(await images(), current);
    });

    await t.test("Guardar sin los campos de imagen no borra las imágenes", async () => {
      const res = await updateCard(form({}));
      assert.equal(res.success, true, res.error);
      assert.deepEqual(await images(), current);
    });

    await t.test("Eliminar (campo vacío) quita solo esa imagen", async () => {
      const res = await updateCard(form({ ...current, logoUrl: "" }));
      assert.equal(res.success, true, res.error);
      assert.deepEqual(await images(), { ...current, logoUrl: null });
      current.logoUrl = null as unknown as string;
    });

    await t.test("Una imagen nueva del store autorizado se guarda", async () => {
      const res = await updateCard(form({ ...current, logoUrl: blob("logo-new.webp"), coverUrl: blob("cover-new.jpg") }));
      assert.equal(res.success, true, res.error);
      assert.deepEqual(await images(), { ...current, logoUrl: blob("logo-new.webp"), coverUrl: blob("cover-new.jpg") });
      current.logoUrl = blob("logo-new.webp");
      current.coverUrl = blob("cover-new.jpg");
    });

    await t.test("Una URL externa nueva o maliciosa se rechaza y no altera nada", async () => {
      for (const heroImageUrl of ["https://evil.example/hero.png", `${blob("x.png")}) } </style><script>x</script>`]) {
        const res = await updateCard(form({ ...current, heroImageUrl }));
        assert.equal(res.success, false);
        assert.match(res.error, /editor de SmartNFC/);
        assert.deepEqual(await images(), current);
      }
    });
  } finally {
    await db.card.deleteMany({ where: { companyId: company.id } });
    await db.companyProductLicense.deleteMany({ where: { companyId: company.id } });
    await db.user.deleteMany({ where: { companyId: company.id } });
    await db.company.delete({ where: { id: company.id } });
    await db.$disconnect();
  }
});
