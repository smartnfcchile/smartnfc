// Enlaces a las redes oficiales de SmartNFC, con ícono y nombre accesible. Se usa en los pies de página.
// `tone` ajusta el color al fondo (claro por defecto). Sin scripts ni rastreadores de terceros.
import { SOCIAL_LINKS } from "../../content/social";

export default function SocialLinks({ className, tone = "dark" }: { className?: string; tone?: "dark" | "light" }) {
  const color = tone === "dark" ? "#08111f" : "#ffffff";
  return (
    <ul aria-label="Redes sociales de SmartNFC" className={className}
      style={{ display: "flex", flexWrap: "wrap", gap: 6, margin: 0, padding: 0, listStyle: "none" }}>
      {SOCIAL_LINKS.map(s => (
        <li key={s.id}>
          <a href={s.href} target="_blank" rel="noopener noreferrer" aria-label={`${s.label} (se abre en una pestaña nueva)`} title={s.label}
            style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 44, height: 44, borderRadius: 12, color }}
            className="smartnfc-social">
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><path fill="currentColor" d={s.path} /></svg>
          </a>
        </li>
      ))}
    </ul>
  );
}
