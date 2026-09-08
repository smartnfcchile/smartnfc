import React from "react";

interface CardProductionRequestEmailProps {
  companyName: string;
  collaboratorName: string;
  collaboratorEmail: string;
  slug: string;
  requestedByName: string;
  requestedByEmail: string;
  cardId: string;
  physicalCardId: string;
  createdAt: string;
  adminUrl: string;
}

export default function CardProductionRequestEmail({
  companyName,
  collaboratorName,
  collaboratorEmail,
  slug,
  requestedByName,
  requestedByEmail,
  cardId,
  physicalCardId,
  createdAt,
  adminUrl,
}: CardProductionRequestEmailProps) {
  return (
    <div style={{ fontFamily: "sans-serif", color: "#1e293b", padding: "20px", maxWidth: "640px", margin: "0 auto", border: "1px solid #e2e8f0", borderRadius: "12px" }}>
      <h2 style={{ color: "#2563eb", marginTop: 0 }}>Nueva tarjeta corporativa solicitada</h2>
      <p style={{ fontSize: "14px", lineHeight: "1.6" }}>
        Un administrador de empresa creó un nuevo colaborador y SmartNFC dejó su tarjeta en estado <strong>Pendiente de grabación</strong>.
      </p>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
        <tbody>
          <tr><td style={{ padding: "8px 0", color: "#64748b" }}>Empresa</td><td style={{ padding: "8px 0", fontWeight: 700 }}>{companyName}</td></tr>
          <tr><td style={{ padding: "8px 0", color: "#64748b" }}>Colaborador</td><td style={{ padding: "8px 0", fontWeight: 700 }}>{collaboratorName}</td></tr>
          <tr><td style={{ padding: "8px 0", color: "#64748b" }}>Correo</td><td style={{ padding: "8px 0" }}>{collaboratorEmail}</td></tr>
          <tr><td style={{ padding: "8px 0", color: "#64748b" }}>URL pública</td><td style={{ padding: "8px 0" }}>smartnfc.cl/c/{slug}</td></tr>
          <tr><td style={{ padding: "8px 0", color: "#64748b" }}>Solicitado por</td><td style={{ padding: "8px 0" }}>{requestedByName} · {requestedByEmail}</td></tr>
          <tr><td style={{ padding: "8px 0", color: "#64748b" }}>Fecha</td><td style={{ padding: "8px 0" }}>{createdAt}</td></tr>
          <tr><td style={{ padding: "8px 0", color: "#64748b" }}>ID tarjeta digital</td><td style={{ padding: "8px 0", fontFamily: "monospace" }}>{cardId}</td></tr>
          <tr><td style={{ padding: "8px 0", color: "#64748b" }}>ID tarjeta física</td><td style={{ padding: "8px 0", fontFamily: "monospace" }}>{physicalCardId}</td></tr>
        </tbody>
      </table>
      <div style={{ textAlign: "center", margin: "24px 0 8px" }}>
        <a href={adminUrl} style={{ background: "#2563eb", color: "#ffffff", padding: "12px 22px", textDecoration: "none", borderRadius: "8px", fontWeight: 700, display: "inline-block" }}>
          Abrir Superadministración
        </a>
      </div>
      <p style={{ fontSize: "11px", color: "#94a3b8", marginTop: "20px" }}>
        Este aviso es operacional. El correo receptor puede configurarse mediante SMARTNFC_PRODUCTION_EMAIL.
      </p>
    </div>
  );
}
