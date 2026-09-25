// Destinos de navegador permitidos. Ninguna URL se descarga en el servidor.
// Módulo sin dependencias para que brand, point-config y public-actions lo compartan sin ciclos.
export function safeDestination(value: string): boolean {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    return url.protocol === "https:" && !url.username && !url.password &&
      (!url.port || url.port === "443") && host.includes(".") &&
      !host.startsWith("[") && !/^[\d.]+$/.test(host) &&
      !/(^|\.)(localhost|local|internal|test)$/.test(host) && !/[\u0000-\u0020\\]/.test(value);
  } catch { return false; }
}
