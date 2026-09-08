import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUserContext } from "../../../../lib/permissions";
import {
  getCompanyProfileEditPolicy,
  isCompanyAdminRole,
} from "../../../../lib/profile-edit-policy";
import ProfilePolicyForm from "./ProfilePolicyForm";

export default async function ProfileGovernancePage() {
  const user = await getCurrentUserContext();
  if (!isCompanyAdminRole(user.role)) redirect("/dashboard/configuracion");

  const policy = await getCompanyProfileEditPolicy(user.companyId);

  return (
    <div className="max-w-4xl space-y-7">
      <div>
        <Link href="/dashboard/configuracion" className="text-sm font-semibold text-blue-600 hover:underline">
          ← Volver a Configuración
        </Link>
        <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
          Gobierno de tarjetas e identidad corporativa
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400">
          Define quién puede modificar las tarjetas digitales de tu empresa. Puedes entregar autonomía a cada colaborador o proteger la imagen corporativa cuando la marca requiera un control centralizado.
        </p>
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-7">
        <div className="mb-6">
          <h2 className="text-base font-extrabold text-slate-900 dark:text-white">Control de edición de perfiles</h2>
          <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
            La configuración se aplica a las tarjetas de los colaboradores de esta empresa.
          </p>
        </div>
        <ProfilePolicyForm initialPolicy={policy} />
      </section>
    </div>
  );
}
