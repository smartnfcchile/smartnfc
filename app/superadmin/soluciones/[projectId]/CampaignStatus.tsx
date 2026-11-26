import Link from "next/link";

const projectLabels: Record<string, string> = { ACTIVE: "Activo", DRAFT: "Borrador", INACTIVE: "Suspendido" };
const landingLabels = {
  external: "Aún no publicada", unpublished: "Retirada o sin publicar", expired: "Vencida",
  invalid: "Necesita revisión", published: "Publicada y vigente",
};

export default function CampaignStatus({ project, landing, version, pointCount, activeToken, externalAvailable, next }: {
  project: string; landing: keyof typeof landingLabels; version?: number;
  pointCount: number; activeToken?: string; externalAvailable: boolean;
  next?: { label: string; href: string; note?: string };
}) {
  const ready = project === "ACTIVE" && (landing === "published" || (landing === "external" && externalAvailable));
  return <section aria-label="Resumen de la campaña" className="min-w-0 space-y-4 rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-slate-700 dark:bg-slate-900">
    <h2 className="font-semibold">{landing === "external" ? "Destino: Sitio web externo" : "Destino: Landing SmartNFC"}</h2>
    <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
      <div><dt>Estado del proyecto</dt><dd className="font-semibold">{projectLabels[project] ?? project}</dd></div>
      <div><dt>Estado de la landing</dt><dd className="font-semibold">{landingLabels[landing]}</dd></div>
      <div><dt>Versión publicada</dt><dd className="font-semibold">{version === undefined ? "Ninguna" : `v${version}`}</dd></div>
      <div><dt>Puntos NFC/QR</dt><dd className="font-semibold">{ready ? `${pointCount} disponibles` : "Sin acceso público"}</dd></div>
    </dl>
    {next ? <div className="space-y-2">
      {next.note && <p className="text-sm">{next.note}</p>}
      <Link href={next.href} className="inline-block rounded-md bg-blue-700 px-3 py-2 text-sm font-medium text-white">{next.label}</Link>
    </div> : ready && activeToken ? <Link href={`/s/${activeToken}`} target="_blank" rel="noreferrer" className="inline-block rounded-md bg-blue-700 px-3 py-2 text-sm font-medium text-white">Probar enlace público</Link>
      : ready && <p className="text-sm">Activa un punto NFC/QR para poder probar el enlace público.</p>}
  </section>;
}
