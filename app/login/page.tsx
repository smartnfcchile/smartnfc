import LoginForm from "./LoginForm";

export default async function LoginPage({ searchParams }: {
  searchParams: Promise<{ error?: string | string[]; activated?: string | string[]; reset?: string | string[] }>;
}) {
  const { error, activated, reset } = await searchParams;
  let initialError = "";
  if (error === "suspended") {
    initialError = "Tu cuenta o empresa asociada ha sido suspendida. Contacta a soporte.";
  } else if (error === "sessionChanged") {
    initialError = "La sesión de esta pestaña cambió. Ingresa con la cuenta que quieres usar. Para mantener dos cuentas abiertas, usa perfiles separados del navegador.";
  } else if (error === "superadminRequired") {
    initialError = "Superadministración requiere iniciar sesión con una cuenta de superadministrador.";
  }

  let initialSuccess = "";
  if (activated === "true") {
    initialSuccess = "¡Cuenta activada con éxito! Ya puedes iniciar sesión.";
  } else if (reset === "true") {
    initialSuccess = "¡Contraseña restablecida con éxito! Ya puedes iniciar sesión.";
  }
  return <LoginForm initialError={initialError} initialSuccess={initialSuccess} />;
}
