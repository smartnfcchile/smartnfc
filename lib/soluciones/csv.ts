import type { ImportRow } from "./core";

/**
 * Parse a CSV exported from Excel. Supports comma or semicolon delimiters,
 * UTF-8 BOM, quoted values and embedded newlines.
 * This is independent from XLSX support (not yet implemented).
 */
export function parseSolutionCsv(source: string, maxRows = 500): ImportRow[] {
  if (!source || source.length > 1_000_000) throw new Error("Archivo CSV vacío o demasiado grande (máximo 1 MB)");
  const text = source.replace(/^\uFEFF/, "");
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const delimiter = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [], field = "", quoted = false;
  for (let i=0;i<text.length;i++) {
    const c=text[i];
    if (c === '"') {
      if (quoted && text[i+1] === '"') { field += '"'; i++; }
      else if (quoted || field.length === 0) quoted = !quoted;
      else throw new Error("Comillas inválidas en CSV");
    } else if (c === delimiter && !quoted) {
      row.push(field); field="";
    } else if ((c==="\n" || c==="\r") && !quoted) {
      if (c==="\r" && text[i+1]==="\n") i++;
      row.push(field); field="";
      if (row.some(v=>v.trim()!=="")) rows.push(row);
      row=[];
      if(rows.length > maxRows+1) throw new Error("Máximo de 500 filas por lote");
    } else field+=c;
  }
  if(quoted) throw new Error("Comillas sin cerrar");
  row.push(field);
  if(row.some(v=>v.trim()!=="")) rows.push(row);
  if(rows.length<2) throw new Error("CSV requiere encabezados y al menos una fila");
  if(rows.length>maxRows+1) throw new Error("Máximo de 500 filas por lote");
  const headers=rows[0].map(h=>h.trim().toLowerCase());
  if(!headers.includes("codigo") || new Set(headers).size!==headers.length || headers.some(x=>!x)) {
    throw new Error("Encabezados inválidos: se requiere columna codigo y nombres únicos");
  }
  return rows.slice(1).map((cells,i)=>{
    if(cells.length!==headers.length) throw new Error(`Fila ${i+2} tiene cantidad incorrecta de columnas`);
    return Object.fromEntries(headers.map((key,j)=>[key,cells[j].trim()]));
  });
}
export function solutionCsvHeader(fieldKeys: string[]) {
  return ["codigo", ...fieldKeys.filter(key=>key!=="codigo")].join(";")+"\r\n";
}