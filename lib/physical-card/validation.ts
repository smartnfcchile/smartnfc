import type { CardSideDesign } from "./templates";

export type PrintFinding = { level: "ERROR" | "WARNING" | "RECOMMENDATION"; message: string };

function luminance(hex: string) {
  const rgb = hex.replace("#", "").match(/.{2}/g)?.map((value) => parseInt(value, 16) / 255) ?? [0, 0, 0];
  return rgb.map((value) => value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)
    .reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
}

export function contrastRatio(a: string, b: string) {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

export function validatePrint(front: CardSideDesign, back: CardSideDesign, doubleSided = true): PrintFinding[] {
  const findings: PrintFinding[] = [];
  const qrSide = front.qrVisible ? front : back.qrVisible ? back : null;
  if (!qrSide) findings.push({ level: "ERROR", message: "Activa el código QR antes de exportar." });
  if (qrSide && qrSide.qrSizeMm < 18) findings.push({ level: "ERROR", message: "Aumenta el código QR a un mínimo de 18 mm." });
  if (qrSide && contrastRatio("#FFFFFF", "#0F172A") < 4.5) findings.push({ level: "ERROR", message: "El QR no tiene contraste suficiente." });
  if (!front.name.trim() && !front.company.trim()) findings.push({ level: "WARNING", message: "Añade un nombre o empresa en el anverso." });
  if (contrastRatio(front.text, front.background) < 4.5) findings.push({ level: "WARNING", message: "Mejora el contraste del texto del anverso." });
  if (contrastRatio(back.text, back.background) < 4.5) findings.push({ level: "WARNING", message: "Mejora el contraste del texto del reverso." });
  if (doubleSided && !back.tagline.trim() && !back.qrVisible) findings.push({ level: "WARNING", message: "Configura el reverso para impresión a doble cara." });
  if (!front.logoUrl) findings.push({ level: "RECOMMENDATION", message: "Añade un logo para reforzar la identidad de marca." });
  return findings;
}
