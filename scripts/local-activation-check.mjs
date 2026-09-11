// Read-only configuration check: no network, database access, or secret values in output.
const target = process.argv[2] ?? "preview";
if (!["preview", "live"].includes(target)) {
  console.error("Uso: npm run check:local:activation -- preview|live");
  process.exit(2);
}
const env = process.env;
const checks = [];
const check = (name, ok) => checks.push({ name, ok: Boolean(ok) });
const present = (name) => typeof env[name] === "string" && env[name].trim().length > 0;
const validUrl = (name, protocols) => {
  try {
    const url = new URL(env[name]);
    return protocols.includes(url.protocol) && Boolean(url.hostname);
  } catch { return false; }
};
check("DATABASE_URL con formato PostgreSQL", validUrl("DATABASE_URL", ["postgres:", "postgresql:"]));
check("NEXTAUTH_SECRET presente", present("NEXTAUTH_SECRET"));
check("CRON_SECRET presente", present("CRON_SECRET"));
check(`LOCAL_REPORT_EMAIL_MODE=${target}`, env.LOCAL_REPORT_EMAIL_MODE === target);
check("NEXT_PUBLIC_APP_URL con formato HTTPS", validUrl("NEXT_PUBLIC_APP_URL", ["https:"]));
if (target === "live") {
  for (const name of ["RESEND_API_KEY", "EMAIL_FROM", "LOCAL_REPORT_SUPPORT_EMAIL"]) {
    check(`${name} presente`, present(name));
  }
  check("Entorno Vercel compatible con envíos reales", !env.VERCEL_ENV || env.VERCEL_ENV === "production");
}
console.log(`Comprobación de configuración Local: ${target}`);
for (const { name, ok } of checks) console.log(`${ok ? "OK" : "FALTA"} · ${name}`);
console.log("Solo comprueba variables del proceso. No carga archivos .env ni comprueba credenciales, dominio verificado, migraciones, cron, monitorización o entrega de correo.");
console.log("Un resultado correcto no autoriza un despliegue ni activa los reportes.");
process.exitCode = checks.every(({ ok }) => ok) ? 0 : 1;
