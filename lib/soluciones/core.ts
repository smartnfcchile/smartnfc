/**
 * SmartNFC Soluciones: independent domain contracts.
 * No DB writes or publication are performed by these helpers.
 */
export type SolutionMode = "ASSETS" | "CAMPAIGN";
export type FieldKind = "text" | "number" | "date" | "boolean" | "url" | "select";
export type FieldDefinition = {
  key: string;
  label: string;
  kind: FieldKind;
  required?: boolean;
  public?: boolean;
  options?: string[];
};
export type SolutionTemplate = {
  code: string;
  name: string;
  mode: SolutionMode;
  fields: FieldDefinition[];
};
export type ImportRow = Record<string, unknown>;
export type ImportIssue = { row: number; field: string; message: string };
export type PreparedImport = {
  accepted: Array<{ row: number; externalId: string; values: ImportRow }>;
  rejected: ImportIssue[];
  duplicates: string[];
};
const KEY = /^[a-z][a-z0-9_]{0,63}$/;
export function validateTemplate(template: SolutionTemplate): string[] {
  const issues: string[] = [];
  if (!KEY.test(template.code)) issues.push("Código de plantilla inválido");
  const seen = new Set<string>();
  if (!Array.isArray(template.fields) || template.fields.length < 1 || template.fields.length > 50) {
    return [...issues, "Una plantilla admite entre 1 y 50 campos"];
  }
  for (const field of template.fields) {
    if (!field || typeof field.key !== "string" || typeof field.label !== "string" ||
        field.label.length > 100 || !["text", "number", "date", "boolean", "url", "select"].includes(field.kind) ||
        (field.options !== undefined && (!Array.isArray(field.options) || field.options.length > 100 ||
          field.options.some(option => typeof option !== "string" || option.length > 100))) ||
        (field.public !== undefined && typeof field.public !== "boolean") ||
        (field.required !== undefined && typeof field.required !== "boolean")) {
      issues.push("Definición de campo inválida");
      continue;
    }
    if (!KEY.test(field.key) || ["codigo", "constructor", "prototype"].includes(field.key)) issues.push(`Campo inválido: ${field.key}`);
    if (seen.has(field.key)) issues.push(`Campo duplicado: ${field.key}`);
    seen.add(field.key);
    if (!field.label.trim()) issues.push(`Campo sin etiqueta: ${field.key}`);
    if (field.kind === "select" && (!field.options?.length || new Set(field.options).size !== field.options.length)) {
      issues.push(`Opciones inválidas: ${field.key}`);
    }
  }
  return issues;
}
function normalize(value: unknown, field: FieldDefinition): unknown {
  if (value === undefined || value === null || String(value).trim() === "") return null;
  if (String(value).length > 2000) throw new Error("Valor supera los 2000 caracteres");
  if (field.kind === "text" || field.kind === "select") return String(value).trim();
  if (field.kind === "url") {
    const url = new URL(String(value));
    if (!["https:", "http:"].includes(url.protocol)) throw new Error("URL debe ser HTTP(S)");
    return url.toString();
  }
  if (field.kind === "number") {
    const num = typeof value === "number" ? value : Number(String(value).trim().replace(",", "."));
    if (!Number.isFinite(num)) throw new Error("Número inválido");
    return num;
  }
  if (field.kind === "boolean") {
    if (typeof value === "boolean") return value;
    const text = String(value).trim().toLowerCase();
    if (["sí", "si", "true", "1", "yes"].includes(text)) return true;
    if (["no", "false", "0"].includes(text)) return false;
    throw new Error("Booleano inválido");
  }
  if (field.kind === "date") {
    const text = String(value).trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) throw new Error("Fecha debe ser AAAA-MM-DD");
    const date = new Date(`${text}T00:00:00.000Z`);
    if (Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== text) throw new Error("Fecha inválida");
    return text;
  }
  return value;
}
/** Preview only. Caller must scope records to companyId and projectId before an actual upsert. */
export function prepareImport(rows: ImportRow[], template: SolutionTemplate): PreparedImport {
  const invalidTemplate = validateTemplate(template);
  if (invalidTemplate.length) throw new Error(invalidTemplate.join("; "));
  const accepted: PreparedImport["accepted"] = [];
  const rejected: ImportIssue[] = [];
  const duplicates: string[] = [];
  const seen = new Set<string>();
  rows.forEach((source, index) => {
    const row = index + 2; // Header is Excel row 1.
    const externalId = String(source.codigo ?? "").trim();
    if (!externalId || externalId.length > 100) { rejected.push({ row, field: "codigo", message: "Código obligatorio" }); return; }
    if (seen.has(externalId)) { duplicates.push(externalId); rejected.push({ row, field: "codigo", message: "Código duplicado en archivo" }); return; }
    seen.add(externalId);
    const values: ImportRow = {};
    let failed = false;
    for (const field of template.fields) {
      try {
        const value = normalize(source[field.key], field);
        if (field.required && value === null) throw new Error("Campo obligatorio");
        if (value !== null && field.kind === "select" && !field.options?.includes(String(value))) {
          throw new Error("Opción no permitida");
        }
        values[field.key] = value;
      } catch (e) {
        failed = true;
        rejected.push({ row, field: field.key, message: e instanceof Error ? e.message : "Valor inválido" });
      }
    }
    if (!failed) accepted.push({ row, externalId, values });
  });
  return { accepted, rejected, duplicates };
}
/** Public access must show only whitelisted fields. Never expose internal notes by default. */
export function publicFields(template: SolutionTemplate, values: ImportRow): ImportRow {
  return Object.fromEntries(template.fields.filter(f => f.public === true).map(f => [f.key, values[f.key] ?? null]));
}
export const BUILT_IN_TEMPLATES: SolutionTemplate[] = [
  { code:"extintores",name:"Extintores",mode:"ASSETS",fields:[
    {key:"numero",label:"Número",kind:"text",public:true},
    {key:"ubicacion",label:"Ubicación",kind:"text",required:true,public:true},
    {key:"agente",label:"Agente extintor",kind:"text",public:true},
    {key:"capacidad_kg",label:"Capacidad (kg)",kind:"number",public:true},
    {key:"clase",label:"Clase",kind:"text",public:true},
    {key:"proxima_mantencion",label:"Próxima mantención",kind:"date",public:true},
    {key:"notas_internas",label:"Notas internas",kind:"text",public:false}
  ]},
  { code:"bloqueo_loto",name:"Puntos de bloqueo LOTO",mode:"ASSETS",fields:[
    {key:"ubicacion",label:"Ubicación",kind:"text",required:true,public:true},
    {key:"equipo",label:"Equipo asociado",kind:"text",public:true},
    {key:"procedimiento_url",label:"Procedimiento aprobado",kind:"url",public:false},
    {key:"notas_internas",label:"Notas internas",kind:"text",public:false}
  ]},
  { code:"turismo",name:"Turismo",mode:"ASSETS",fields:[
    {key:"nombre",label:"Atractivo turístico",kind:"text",required:true,public:true},
    {key:"descripcion",label:"Descripción",kind:"text",public:true},
    {key:"mapa_url",label:"Mapa",kind:"url",public:true},
    {key:"horario",label:"Horario",kind:"text",public:true}
  ]},
  { code:"campana",name:"Campaña de difusión",mode:"CAMPAIGN",fields:[
    {key:"titulo",label:"Título",kind:"text",required:true,public:true},
    {key:"destino_url",label:"Destino",kind:"url",required:true,public:true},
    {key:"vigencia",label:"Vigencia",kind:"date",public:false}
  ]},
  { code:"seguridad_ciudadana",name:"Seguridad ciudadana",mode:"ASSETS",fields:[
    {key:"sector",label:"Sector",kind:"text",required:true,public:true},
    {key:"orientacion",label:"Información y recomendaciones",kind:"text",public:true},
    {key:"contacto_oficial",label:"Contacto oficial",kind:"text",public:true}
  ]},
  { code:"capacitacion",name:"Capacitación",mode:"ASSETS",fields:[
    {key:"tema",label:"Tema",kind:"text",required:true,public:true},
    {key:"material_url",label:"Material",kind:"url",public:true},
    {key:"evaluacion_requerida",label:"Requiere evaluación",kind:"boolean",public:false}
  ]}
];