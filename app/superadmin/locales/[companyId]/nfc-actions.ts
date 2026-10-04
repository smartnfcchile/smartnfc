"use server";
// Vinculación NFC ↔ Punto Inteligente desde Soporte SmartNFC Local. Solo SuperAdmin, revalidado en servidor
// en cada llamada (requireSuperAdmin consulta la BD). La lógica y las validaciones viven en lib/local/nfc-link.ts.
import { revalidatePath } from "next/cache";
import { requireSuperAdmin } from "../../../../lib/permissions";
import { NfcLinkError, checkPointNfcDestination, linkNfcToPoint, previewNfcLink, unlinkNfcFromPoint,
  type NfcLinkPreview, type PointNfcCheck } from "../../../../lib/local/nfc-link";

type Result<T> = { success: true; data: T } | { success: false; error: string };

async function run<T>(label: string, operation: (actor: { id: string; role: string }) => Promise<T>): Promise<Result<T>> {
  let actor;
  try { actor = await requireSuperAdmin(); } catch { return { success: false, error: "No autorizado." }; }
  try {
    return { success: true, data: await operation(actor) };
  } catch (error) {
    if (error instanceof NfcLinkError) return { success: false, error: error.message };
    console.error(`Error en ${label}:`, error);
    return { success: false, error: "No fue posible completar la operación. Inténtalo nuevamente." };
  }
}

function refresh(companyId: string) {
  revalidatePath(`/superadmin/locales/${companyId}`);
  revalidatePath("/superadmin/tarjetas");
}

export async function previewPointNfcLinkAction(companyId: string, pointId: string, token: string): Promise<Result<NfcLinkPreview>> {
  return run("la revisión de la vinculación NFC", actor => previewNfcLink(actor, { companyId, pointId, token }));
}

export async function linkPointNfcAction(companyId: string, pointId: string, token: string): Promise<Result<{ hint: string }>> {
  const result = await run("la vinculación NFC", actor => linkNfcToPoint(actor, { companyId, pointId, token }));
  if (result.success) refresh(companyId);
  return result.success ? { success: true, data: { hint: result.data.hint } } : result;
}

export async function unlinkPointNfcAction(companyId: string, pointId: string, physicalCardId: string): Promise<Result<{ hint: string }>> {
  const result = await run("la desvinculación NFC", actor => unlinkNfcFromPoint(actor, { companyId, pointId, physicalCardId }));
  if (result.success) refresh(companyId);
  return result;
}

export async function checkPointNfcDestinationAction(companyId: string, pointId: string): Promise<Result<PointNfcCheck>> {
  return run("la comprobación de destino NFC", actor => checkPointNfcDestination(actor, { companyId, pointId }));
}
