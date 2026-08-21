import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { requireScopedDesign } from "../../../../../lib/physical-card/auth";
import type { CardSideDesign } from "../../../../../lib/physical-card/templates";
const esc = (value: string) => value.replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[char] || char));
export async function GET(request: Request, { params }: { params: Promise<{ designId: string }> }) {
  const { designId } = await params; const scoped = await requireScopedDesign(designId).catch(() => null);
  if (!scoped) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  const sideName = new URL(request.url).searchParams.get("side") === "back" ? "back" : "front";
  const side = scoped.design[sideName === "back" ? "backDesign" : "frontDesign"] as unknown as CardSideDesign;
  const origin = process.env.NEXTAUTH_URL || new URL(request.url).origin; const publicUrl = `${origin}/c/${scoped.design.card.slug}`;
  const qrDocument = await QRCode.toString(publicUrl, { type: "svg", width: 1200, margin: 4, errorCorrectionLevel: "M" });
  const qrContent = qrDocument.slice(qrDocument.indexOf(">") + 1, qrDocument.lastIndexOf("</svg>"));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="91.6mm" height="59.98mm" viewBox="0 0 916 600"><rect width="916" height="600" fill="${esc(side.background)}"/><rect y="550" width="916" height="50" fill="${esc(side.primary)}"/><rect x="78" y="110" width="90" height="8" rx="4" fill="${esc(side.secondary)}"/><text x="78" y="255" fill="${esc(side.text)}" font-family="Arial,sans-serif" font-size="52" font-weight="700">${esc(side.name || side.company)}</text><text x="78" y="302" fill="${esc(side.muted)}" font-family="Arial,sans-serif" font-size="25">${esc([side.position, side.company].filter(Boolean).join(" · "))}</text><text x="78" y="365" fill="${esc(side.text)}" font-family="Arial,sans-serif" font-size="23">${esc(side.tagline)}</text>${side.qrVisible ? `<rect x="655" y="305" width="205" height="205" rx="12" fill="white"/><g transform="translate(670 320) scale(0.1458333333)">${qrContent}</g>` : ""}${side.nfcVisible ? `<text x="650" y="115" fill="${esc(side.text)}" font-family="Arial,sans-serif" font-size="18">◖))) ${esc(side.nfcText)}</text>` : ""}</svg>`;
  return new NextResponse(svg, { headers: { "Content-Type": "image/svg+xml; charset=utf-8", "Content-Disposition": `attachment; filename="${sideName}-${scoped.design.id}.svg"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
}
