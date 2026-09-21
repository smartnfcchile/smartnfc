import { prisma } from "../../../../lib/prisma";
import { requireLocalPage } from "../../../../lib/local/access";
import { saveLocationAction, moveCampaignLocationAction } from "./actions";
export default async function LocationsPage() {
  const { company } = await requireLocalPage("LOCAL_ACCESS");
  const locations = await prisma.localLocation.findMany({ where: { companyId: company.id }, orderBy: { createdAt: "asc" } });
  const campaigns = await prisma.localCampaign.findMany({ where: { companyId: company.id }, select: { id: true, name: true, locationId: true } });
  const field = "block w-full rounded border p-3 bg-transparent";
  return <div className="space-y-6"><h1 className="text-2xl font-bold">Mis locales</h1>
    {locations.map((l, i) => <form key={l.id} action={saveLocationAction} className="space-y-3 rounded border p-4"><input type="hidden" name="id" value={l.id}/><h2>{l.name || `Local pendiente de identificar ${i + 1}`}</h2>{l.origin === "LEGACY_TECHNICAL" && <p>Este registro agrupa las campañas existentes. Completa sus datos para identificar el local.</p>}<label>Nombre<input className={field} name="name" defaultValue={l.name || ""} required minLength={2} maxLength={120}/></label><label>Dirección<input className={field} name="address" defaultValue={l.address || ""} maxLength={240}/></label><button className="rounded bg-blue-700 text-white p-3">Guardar datos</button></form>)}
    <form action={saveLocationAction} className="space-y-3 rounded border p-4"><h2>Agregar local</h2><label>Nombre<input name="name" className={field} required minLength={2} maxLength={120}/></label><label>Dirección<input name="address" className={field} maxLength={240}/></label><button className="rounded bg-blue-700 text-white p-3">Crear local</button></form>
    <section className="space-y-3"><h2>Asignación de campañas</h2>{campaigns.map(c => <form key={c.id} action={moveCampaignLocationAction} className="rounded border p-4 space-y-3"><input type="hidden" name="campaignId" value={c.id}/><label>{c.name}<select name="locationId" className={field} defaultValue={c.locationId || ""} required><option value="" disabled>Seleccionar local</option>{locations.filter(l => l.isActive).map((l, i) => <option key={l.id} value={l.id}>{l.name || `Local pendiente de identificar ${i + 1}`}</option>)}</select></label><button className="rounded bg-blue-700 text-white p-3">Asignar local</button></form>)}</section>
  </div>;
}
