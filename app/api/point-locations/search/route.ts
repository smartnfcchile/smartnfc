import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rateLimit";
import { installationOwner } from "@/lib/geolocation/service";
import { pointKind, LocationError, validCoordinates } from "@/lib/geolocation/validation";
import { checkLocationOrigin, locationActor, locationFailure, locationJson } from "@/lib/geolocation/http";
export async function POST(request: Request) {
  try {
    const actor = await locationActor();
    checkLocationOrigin(request);
    const raw = await request.text();
    if (raw.length > 1024) throw new LocationError("Solicitud demasiado grande.", 413);
    const body: unknown = JSON.parse(raw);
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new LocationError("Solicitud inválida.");
    const { query, kind, pointId } = body as Record<string, unknown>;
    await installationOwner(prisma, actor, pointKind(String(kind)), String(pointId));
    if (typeof query !== "string" || query.trim().length < 3 || query.length > 200) throw new LocationError("Escribe de 3 a 200 caracteres.");
    if (!(await checkRateLimit(actor.id, "POINT_GEOCODE", actor.companyId)).allowed) throw new LocationError("Espera un minuto antes de buscar nuevamente.", 429);
    const key = process.env.GEOAPIFY_API_KEY;
    if (!key) throw new LocationError("La búsqueda de direcciones aún no está configurada. Usa coordenadas o el mapa.", 503);
    const url = new URL("https://api.geoapify.com/v1/geocode/search");
    url.search = new URLSearchParams({ text: query.trim(), apiKey: key, limit: "5", lang: "es", format: "json" }).toString();
    const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(5000) });
    if (!response.ok) throw new LocationError("El proveedor de direcciones no está disponible.", 502);
    const data = await response.json();
    const results = (Array.isArray(data.results) ? data.results : []).filter((r: { lat?: unknown; lon?: unknown }) => validCoordinates(r.lat, r.lon))
      .slice(0, 5).map((r: { lat: number; lon: number; formatted: string }) => ({ latitude: r.lat, longitude: r.lon, address: String(r.formatted).slice(0, 300) }));
    return locationJson({ results });
  } catch (error) { return locationFailure(error); }
}
