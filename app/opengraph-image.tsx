import { ImageResponse } from "next/og";

export const alt = "SmartNFC: tarjetas NFC e identidad digital para empresas";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, background: "#07101f", color: "white", fontFamily: "Arial" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 34, fontWeight: 800 }}><span style={{ color: "#e5b92f" }}>S</span><span>Smart<span style={{ color: "#3b82f6" }}>NFC</span></span></div>
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}><div style={{ fontSize: 68, lineHeight: 1.05, fontWeight: 900, maxWidth: 950 }}>Tarjetas NFC e identidad digital para conectar mejor.</div><div style={{ fontSize: 28, color: "#cbd5e1" }}>Perfiles digitales, contactos y analítica para equipos y empresas.</div></div>
      <div style={{ display: "flex", fontSize: 22, color: "#93c5fd" }}>smartnfc.cl · Valdivia, Chile</div>
    </div>,
    size,
  );
}
