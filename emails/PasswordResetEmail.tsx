import React from "react";

interface PasswordResetEmailProps {
  name: string;
  resetUrl: string;
  expiresInMinutes?: number;
}

export default function PasswordResetEmail({
  name,
  resetUrl,
  expiresInMinutes = 60,
}: PasswordResetEmailProps) {
  return (
    <div style={{ fontFamily: "sans-serif", color: "#1e293b", padding: "20px", maxWidth: "600px", margin: "0 auto", border: "1px solid #e2e8f0", borderRadius: "12px" }}>
      <div style={{ textAlign: "center", marginBottom: "20px" }}>
        <h2 style={{ color: "#2563eb", margin: 0 }}>Smart NFC Chile</h2>
      </div>
      <h3 style={{ margin: "0 0 10px 0" }}>Restablece tu contraseña</h3>
      <p style={{ fontSize: "14px", lineHeight: "1.5" }}>
        Hola {name},
      </p>
      <p style={{ fontSize: "14px", lineHeight: "1.5" }}>
        Recibimos una solicitud para restablecer la contraseña de tu cuenta en Smart NFC Chile.
      </p>
      <p style={{ fontSize: "14px", lineHeight: "1.5" }}>
        Para proceder y definir una nueva contraseña, haz clic en el siguiente botón:
      </p>
      <div style={{ textAlign: "center", margin: "25px 0" }}>
        <a href={resetUrl} style={{ background: "#2563eb", color: "#ffffff", padding: "12px 24px", textDecoration: "none", borderRadius: "8px", fontWeight: "bold", fontSize: "14px", display: "inline-block" }}>
          Restablecer contraseña
        </a>
      </div>
      <p style={{ fontSize: "12px", color: "#64748b" }}>
        Este enlace expirará en {expiresInMinutes} minutos. Si no solicitaste este cambio, puedes ignorar este correo de forma segura.
      </p>
      <hr style={{ border: "0", borderTop: "1px solid #e2e8f0", margin: "20px 0" }} />
      <p style={{ fontSize: "11px", color: "#94a3b8", textAlign: "center" }}>
        Smart NFC Chile · Valdivia, Chile · cuentas@smartnfc.cl
      </p>
    </div>
  );
}
