import { prisma } from "@/lib/prisma";
import { pointKind, LocationError } from "@/lib/geolocation/validation";
import { installationOwner, readInstallation, writeInstallation } from "@/lib/geolocation/service";
import { checkLocationOrigin, locationActor, locationFailure, locationJson } from "@/lib/geolocation/http";
type Context = { params: Promise<{ kind: string; pointId: string }> };
export async function GET(_request: Request, context: Context) {
  try {
    const actor = await locationActor();
    const { kind, pointId } = await context.params;
    return locationJson(await readInstallation(prisma, actor, pointKind(kind), pointId));
  } catch (error) { return locationFailure(error); }
}
export async function PUT(request: Request, context: Context) {
  try {
    const actor = await locationActor();
    checkLocationOrigin(request);
    const { kind, pointId } = await context.params;
    const type = pointKind(kind);
    await installationOwner(prisma, actor, type, pointId);
    if (!request.headers.get("content-type")?.startsWith("application/json")) throw new LocationError("Usa application/json.", 415);
    const body = await request.text();
    if (body.length > 4096) throw new LocationError("Solicitud demasiado grande.", 413);
    const input: unknown = JSON.parse(body);
    if (input === null) throw new LocationError("Solicitud inválida.");
    return locationJson(await writeInstallation(prisma, actor, type, pointId, input));
  } catch (error) { return locationFailure(error); }
}
export async function DELETE(request: Request, context: Context) {
  try {
    const actor = await locationActor();
    checkLocationOrigin(request);
    const { kind, pointId } = await context.params;
    return locationJson(await writeInstallation(prisma, actor, pointKind(kind), pointId, null));
  } catch (error) { return locationFailure(error); }
}
