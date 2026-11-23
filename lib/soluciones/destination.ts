export function campaignDestination(value: string): string {
  const url = URL.parse(value.trim());
  if (value.length > 2048 || !url || url.protocol !== "https:" ||
      url.username || url.password) {
    throw new Error("Ingresa una URL HTTPS sin credenciales");
  }
  return url.href;
}
