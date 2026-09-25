// Operaciones de servidor para la identidad digital del Local.
// Autorización: sesión revalidada + rol administrador + empresa propia + capability LOCAL_ACCESS
// + producto Local operativo + pertenencia del local a la empresa.
import { prisma } from "../prisma";
import { getCompanyEntitlements } from "../entitlements";
import { requireLocalAdmin } from "./access";
import { BRAND_FIELDS, LOCATION_ID_PATTERN, locationIdentitySchema, parseBrandUploadPathname } from "./brand";

async function requireLocalBrandEditor() {
  const { actor, company } = await requireLocalAdmin();
  const e = await getCompanyEntitlements(company.id);
  if (!e.localOperational || !e.capabilities.includes("LOCAL_ACCESS")) throw new Error("Local no disponible.");
  return { actor, company };
}

/** Sesión, rol y producto Local operativo, sin leer el cuerpo de la petición (se usa antes de procesar la subida). */
export async function authorizeLocalBrandUploader() {
  const { actor, company } = await requireLocalBrandEditor();
  return { actorId: actor.id, companyId: company.id };
}

/** Autoriza una subida de logo/portada/promoción: solo para un local activo de la propia empresa. */
export async function authorizeLocalBrandUpload(pathname: string) {
  const target = parseBrandUploadPathname(pathname);
  if (!target) throw new Error("Ruta de archivo inválida.");
  const { actor, company } = await requireLocalBrandEditor();
  // B-1: un local inactivo de la propia empresa también puede actualizar su identidad (no cambia su estado).
  const location = await prisma.localLocation.findFirst({ where: { id: target.locationId, companyId: company.id }, select: { id: true } });
  if (!location) throw new Error("Local no disponible.");
  return { actorId: actor.id, companyId: company.id, locationId: location.id, kind: target.kind };
}

/**
 * Guarda nombre, dirección e identidad del local con control de concurrencia optimista:
 * `expectedBrandUpdatedAt` es el valor que el editor cargó (null si nunca se guardó identidad).
 */
export async function saveLocationIdentity(locationId: string, input: unknown, expectedBrandUpdatedAt: string | null) {
  if (!LOCATION_ID_PATTERN.test(locationId)) throw new Error("Local no disponible.");
  const { actor, company } = await requireLocalBrandEditor();
  const data = locationIdentitySchema(locationId).parse(input);
  const expected = expectedBrandUpdatedAt ? new Date(expectedBrandUpdatedAt) : null;
  if (expected && Number.isNaN(expected.getTime())) throw new Error("Versión de edición inválida.");

  return prisma.$transaction(async tx => {
    const current = await tx.localLocation.findFirst({ where: { id: locationId, companyId: company.id } });
    if (!current) throw new Error("Local no disponible.");
    const changed = BRAND_FIELDS.filter(field => (current[field] ?? null) !== data[field]);
    const nameChanged = current.name !== data.name, addressChanged = (current.address ?? null) !== data.address;
    // M-2: la versión de edición avanza con cualquier cambio del editor (identidad, nombre interno o dirección),
    // así una edición abierta con datos antiguos no puede sobrescribir en silencio el nombre o la dirección.
    const bump = changed.length > 0 || nameChanged || addressChanged;
    const now = new Date();
    const updated = await tx.localLocation.updateMany({
      where: { id: locationId, companyId: company.id, brandUpdatedAt: expected },
      data: { ...data, ...(bump ? { brandUpdatedAt: now } : {}) },
    });
    if (updated.count !== 1) throw new Error("La identidad cambió mientras la editabas. Recarga la página antes de guardar.");
    await tx.adminAuditLog.create({ data: {
      actorUserId: actor.id, companyId: company.id, action: "LOCATION_IDENTITY_UPDATE", entityType: "LOCAL_LOCATION", entityId: locationId,
      metadata: JSON.stringify({ changed, nameChanged, addressChanged }),
    } });
    return { brandUpdatedAt: (bump ? now : current.brandUpdatedAt)?.toISOString() ?? null };
  });
}

/** Campaña que aporta fallback de identidad en el editor: la publicada más reciente del local, o la editada más recientemente. */
export async function findBrandFallbackCampaign(companyId: string, locationId: string) {
  const select = { name: true, businessName: true, logoUrl: true, heroImageUrl: true, primaryColor: true, secondaryColor: true, address: true } as const;
  const where = { companyId, locationId, status: { not: "ARCHIVED" as const } };
  return (await prisma.localCampaign.findFirst({ where: { ...where, status: "PUBLISHED" }, orderBy: { publishedAt: "desc" }, select }))
    ?? prisma.localCampaign.findFirst({ where, orderBy: { updatedAt: "desc" }, select });
}

/** Campañas vigentes del local (B-3: la vista previa usa una; cada punto completa con la suya). */
export async function countLocationCampaigns(companyId: string, locationId: string) {
  return prisma.localCampaign.count({ where: { companyId, locationId, status: { not: "ARCHIVED" } } });
}
