import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import QRCode from "qrcode";
import { requireScopedDesign } from "../../../../../lib/physical-card/auth";
import type { CardSideDesign } from "../../../../../lib/physical-card/templates";
import { getPublicUrl } from "../../../../../lib/public-url";

const mm = (value: number) => value * 72 / 25.4;
const color = (hex: string) => { const value = hex.replace("#", "").padEnd(6, "0"); return rgb(parseInt(value.slice(0, 2), 16) / 255, parseInt(value.slice(2, 4), 16) / 255, parseInt(value.slice(4, 6), 16) / 255); };

export async function GET(request: Request, { params }: { params: Promise<{ designId: string }> }) {
  const { designId } = await params; const scoped = await requireScopedDesign(designId).catch(() => null);
  if (!scoped) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  const target = getPublicUrl(`/c/${scoped.design.card.slug}`);
  const pdf = await PDFDocument.create(); const regular = await pdf.embedFont(StandardFonts.Helvetica); const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const qrData = await QRCode.toDataURL(target, { width: 1200, margin: 4, errorCorrectionLevel: "M", color: { dark: "#0F172A", light: "#FFFFFF" } });
  const qr = await pdf.embedPng(qrData); const width = mm(91.6); const height = mm(59.98);
  for (const value of [scoped.design.frontDesign, scoped.design.backDesign]) { const side = value as unknown as CardSideDesign; const page = pdf.addPage([width, height]); page.drawRectangle({ x: 0, y: 0, width, height, color: color(side.background) }); page.drawRectangle({ x: 0, y: 0, width, height: mm(5), color: color(side.primary) }); page.drawRectangle({ x: mm(7.5), y: height - mm(12), width: mm(9), height: mm(.8), color: color(side.secondary) }); page.drawText(side.name || side.company, { x: mm(7.5), y: height - mm(26), size: 17, font: bold, color: color(side.text), maxWidth: mm(58) }); page.drawText([side.position, side.company].filter(Boolean).join(" · "), { x: mm(7.5), y: height - mm(31), size: 8, font: regular, color: color(side.muted), maxWidth: mm(58) }); page.drawText(side.tagline || "", { x: mm(7.5), y: height - mm(38), size: 7.5, font: regular, color: color(side.text), maxWidth: mm(58) }); if (side.qrVisible) { const qrSize = mm(Math.max(18, Math.min(28, side.qrSizeMm))); page.drawImage(qr, { x: width - qrSize - mm(6), y: mm(7), width: qrSize, height: qrSize }); } if (side.nfcVisible) page.drawText(side.nfcText, { x: width - mm(30), y: height - mm(12), size: 6.5, font: bold, color: color(side.text), maxWidth: mm(25) }); }
  pdf.setTitle(scoped.design.name); pdf.setSubject("Tarjeta física SmartNFC CR80 con 3 mm de sangrado"); pdf.setProducer("SmartNFC");
  const bytes = await pdf.save(); return new NextResponse(Buffer.from(bytes), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${scoped.design.id}-impresion.pdf"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
}
