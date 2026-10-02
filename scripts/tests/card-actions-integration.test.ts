import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import type { PrismaClient } from "@prisma/client";

// Solo PostgreSQL desechable local: nunca Neon ni producción.
const url = process.env.BLOCK2_TEST_DATABASE_URL;
const allowed = !!url && ["127.0.0.1", "localhost"].includes(new URL(url).hostname) && new URL(url).pathname.includes("block2_disposable");

test("Acciones de la landing: guardar sin WhatsApp y conservación de la configuración", { skip: !allowed }, async (t) => {
  process.env.DATABASE_URL = url!;
  process.env.BLOB_STORE_ID = "store_qateststore"; // store ficticio
  delete process.env.BLOB_READ_WRITE_TOKEN;
  let session: { user: { id: string; companyId: string; role: string } } | null = null;
  require("next-auth"); require.cache[require.resolve("next-auth")]!.exports = { getServerSession: async () => session };
  require("next/cache"); require.cache[require.resolve("next/cache")]!.exports = { revalidatePath: () => {} };
  const { prisma: db } = require("../../lib/prisma") as { prisma: PrismaClient };
  const { hasCapability } = require("../../lib/entitlements");
  const { updateCard } = require("../../app/dashboard/editor/[cardId]/actions");

  const suffix = randomUUID().slice(0, 8);
  const company = await db.company.create({ data: { name: "Actions " + suffix } });
  const owner = await db.user.create({ data: { companyId: company.id, email: "act" + suffix + "@example.test", role: "COMPANY_OWNER" } });
  session = { user: { id: owner.id, companyId: company.id, role: owner.role } };
  await db.companyProductLicense.create({ data: { companyId: company.id, product: "EMPRESAS", planCode: "EMPRESAS_PRO" } });
  let n = 0;
  const newCard = (data: Record<string, unknown> = {}) =>
    db.card.create({ data: { companyId: company.id, userId: owner.id, name: "Actions", slug: `actions-${suffix}-${n++}`, ...data } });

  /** Igual que el editor real: sin campos de acción salvo que la pestaña CRM los muestre. */
  const save = (cardId: string, fields: Record<string, string> = {}) => {
    const fd = new FormData();
    for (const [key, value] of Object.entries({ cardId, profileName: "Editado", role: "", companyName: "Empresa", bio: "", themeColor: "#2563eb", themeMode: "dark", ...fields })) fd.set(key, value);
    return updateCard(fd) as Promise<{ success: boolean; error?: string }>;
  };
  const actions = (id: string) => db.card.findUniqueOrThrow({ where: { id }, select: { primaryActionType: true, secondaryActionType: true, coverUrl: true, profileName: true } });

  try {
    assert.equal(await hasCapability(company.id, "LEAD_CAPTURE"), true, "el plan de prueba permite configurar CRM");

    await t.test("Sin WhatsApp y CRM desactivado: guardar imágenes y datos funciona y conserva WHATSAPP por defecto", async () => {
      const card = await newCard(); // primaryActionType = WHATSAPP (default Prisma), sin número
      const cover = "https://qateststore.public.blob.vercel-storage.com/cover-1.jpg";
      const res = await save(card.id, { coverUrl: cover });
      assert.equal(res.success, true, res.error);
      assert.deepEqual(await actions(card.id), { primaryActionType: "WHATSAPP", secondaryActionType: "SAVE_CONTACT", coverUrl: cover, profileName: "Editado" });
    });

    await t.test("La acción secundaria guardada ya no se reinicia a SAVE_CONTACT", async () => {
      const card = await newCard({ primaryActionType: "NONE", secondaryActionType: "EMAIL" });
      const res = await save(card.id);
      assert.equal(res.success, true, res.error);
      const saved = await actions(card.id);
      assert.equal(saved.primaryActionType, "NONE");
      assert.equal(saved.secondaryActionType, "EMAIL");
    });

    await t.test("Con WhatsApp visible y CRM desactivado: guarda y conserva la acción", async () => {
      const card = await newCard({ whatsapp: "56911111111", showWhatsapp: true });
      const res = await save(card.id, { whatsapp: "56911111111", showWhatsapp: "on" });
      assert.equal(res.success, true, res.error);
      assert.equal((await actions(card.id)).primaryActionType, "WHATSAPP");
    });

    await t.test("CRM activado sin WhatsApp: el selector envía la acción actual y se guarda; elegir CRM_FORM se guarda", async () => {
      const card = await newCard({ shareContactEnabled: true });
      let res = await save(card.id, { shareContactEnabled: "on", primaryActionType: "WHATSAPP" });
      assert.equal(res.success, true, res.error);
      res = await save(card.id, { shareContactEnabled: "on", primaryActionType: "CRM_FORM" });
      assert.equal(res.success, true, res.error);
      assert.equal((await actions(card.id)).primaryActionType, "CRM_FORM");
    });

    await t.test("Elegir WhatsApp explícitamente sin número visible sigue rechazándose y no altera datos", async () => {
      const card = await newCard({ shareContactEnabled: true, primaryActionType: "CRM_FORM" });
      const res = await save(card.id, { shareContactEnabled: "on", primaryActionType: "WHATSAPP" });
      assert.equal(res.success, false);
      assert.match(res.error ?? "", /WhatsApp visible/);
      assert.equal((await actions(card.id)).primaryActionType, "CRM_FORM");
    });

    await t.test("CRM activado con WhatsApp visible: cambiar de CRM_FORM a WHATSAPP se guarda", async () => {
      const card = await newCard({ shareContactEnabled: true, primaryActionType: "CRM_FORM", whatsapp: "56922222222", showWhatsapp: true });
      const res = await save(card.id, { shareContactEnabled: "on", primaryActionType: "WHATSAPP", whatsapp: "56922222222", showWhatsapp: "on" });
      assert.equal(res.success, true, res.error);
      assert.equal((await actions(card.id)).primaryActionType, "WHATSAPP");
    });

    await t.test("Elegir CRM_FORM con la captura desactivada se rechaza", async () => {
      const card = await newCard({ whatsapp: "56933333333", showWhatsapp: true });
      const res = await save(card.id, { primaryActionType: "CRM_FORM", whatsapp: "56933333333", showWhatsapp: "on" });
      assert.equal(res.success, false);
      assert.match(res.error ?? "", /CRM_FORM/);
      assert.equal((await actions(card.id)).primaryActionType, "WHATSAPP");
    });

    await t.test("Desactivar CRM conserva la acción CRM_FORM para cuando se reactive", async () => {
      const card = await newCard({ shareContactEnabled: true, primaryActionType: "CRM_FORM" });
      const res = await save(card.id); // toggle apagado: el selector ya no se envía
      assert.equal(res.success, true, res.error);
      assert.equal((await actions(card.id)).primaryActionType, "CRM_FORM");
      assert.equal((await db.card.findUniqueOrThrow({ where: { id: card.id } })).shareContactEnabled, false);
    });

    await t.test("Otras acciones elegidas sin su canal y acciones duplicadas se rechazan", async () => {
      const card = await newCard({ primaryActionType: "NONE" });
      let res = await save(card.id, { primaryActionType: "PHONE" });
      assert.equal(res.success, false); assert.match(res.error ?? "", /teléfono visible/);
      res = await save(card.id, { primaryActionType: "EMAIL" });
      assert.equal(res.success, false); assert.match(res.error ?? "", /correo electrónico visible/);
      res = await save(card.id, { primaryActionType: "SAVE_CONTACT" }); // igual a la secundaria guardada
      assert.equal(res.success, false); assert.match(res.error ?? "", /no pueden ser la misma/);
      assert.equal((await actions(card.id)).primaryActionType, "NONE");
    });
  } finally {
    await db.card.deleteMany({ where: { companyId: company.id } });
    await db.companyProductLicense.deleteMany({ where: { companyId: company.id } });
    await db.user.deleteMany({ where: { companyId: company.id } });
    await db.company.delete({ where: { id: company.id } });
    await db.$disconnect();
  }
});
