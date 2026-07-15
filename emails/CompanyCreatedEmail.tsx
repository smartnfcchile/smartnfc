import React from "react";

interface CompanyCreatedEmailProps {
  companyName: string;
  maxIdentities: number;
  adminName: string;
  loginUrl: string;
}

export default function CompanyCreatedEmail({
  companyName,
  maxIdentities,
  adminName,
  loginUrl,
}: CompanyCreatedEmailProps) {
  return (
    <div style={{ fontFamily: "sans-serif", color: "#1e293b", padding: "20px", maxWidth: "600px", margin: "0 auto", border: "1px solid #e2e8f0", borderRadius: "12px" }}>
      <div style={{ textAlign: "center", marginBottom: "20px" }}>
        <h2 style={{ color: "#2563eb", margin: 0 }}>Smart NFC Chile</h2>
      </div>
      <h3 style={{ margin: "0 0 10px 0" }}>¡Tu empresa ya está configurada!</h3>
      <p style={{ fontSize: "14px", lineHeight: "1.5" }}>
        Estimado equipo de <strong>{companyName}</strong>,
      </p>
      <p style={{ fontSize: "14px", lineHeight: "1.5" }}>
        La plataforma Smart NFC ha sido creada y configurada correctamente con los siguientes detalles:
      </p>
      <ul style={{ fontSize: "14px", lineHeight: "1.6", paddingLeft: "20px" }}>
        <li>Empresa: <strong>{companyName}</strong></li>
        <li>Identidades Activas Incluidas: <strong>{maxIdentities}</strong></li>
        <li>Administrador asignado: <strong>{adminName}</strong></li>
      </ul>
      <p style={{ fontSize: "14px", lineHeight: "1.5" }}>
        Puedes acceder a la consola administrativa de tu empresa en el siguiente enlace:
      </p>
      <div style={{ textAlign: "center", margin: "25px 0" }}>
        <a href={loginUrl} style={{ background: "#2563eb", color: "#ffffff", padding: "12px 24px", textDecoration: "none", borderRadius: "8px", fontWeight: "bold", fontSize: "14px", display: "inline-block" }}>
          Ingresar al Dashboard
        </a>
      </div>
      <hr style={{ border: "0", borderTop: "1px solid #e2e8f0", margin: "20px 0" }} />
      <p style={{ fontSize: "11px", color: "#94a3b8", textAlign: "center" }}>
        Smart NFC Chile · Valdivia, Chile · cuentas@smartnfc.cl
      </p>
    </div>
  );
}
