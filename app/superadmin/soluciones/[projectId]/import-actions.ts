"use server";

import { revalidatePath } from "next/cache";
import { parseSolutionCsv } from "../../../../lib/soluciones/csv";
import { importSolutionRecords } from "../../../../lib/soluciones/import-records";

export type CsvImportState = {
  message: string;
  accepted: number;
  errors: string[];
  applied: boolean;
};
export async function submitSolutionCsv(
  _previous: CsvImportState,
  form: FormData
): Promise<CsvImportState> {
  const blank = { message: "", accepted: 0, errors: [] as string[], applied: false };
  try {
    const companyId = String(form.get("companyId") ?? "");
    const projectId = String(form.get("projectId") ?? "");
    const templateId = String(form.get("templateId") ?? "");
    const apply = form.get("operation") === "apply";
    const file = form.get("csv");
    if (!(file instanceof File) || file.size === 0 || file.size > 1_000_000 ||
        !file.name.toLowerCase().endsWith(".csv")) {
      return { ...blank, message: "Selecciona un archivo CSV de hasta 1 MB" };
    }
    const text = await file.text();
    const rows = parseSolutionCsv(text);
    const result = await importSolutionRecords({ companyId, projectId, templateId, rows, apply });
    const applied = apply && result.rejected.length === 0;
    if (applied) revalidatePath("/superadmin/soluciones/" + projectId);
    return {
      message: result.rejected.length
        ? "Hay errores: no se realizó ninguna modificación"
        : applied ? "Importación aplicada correctamente" : "Previsualización correcta; sin modificaciones",
      accepted: result.accepted,
      errors: result.rejected.slice(0, 25).map(x => `Fila ${x.row}, ${x.field}: ${x.message}`),
      applied
    };
  } catch(e) {
    return { ...blank, message: e instanceof Error ? e.message : "Error en el archivo" };
  }
}